import * as THREE from '../vendor/three/three.mjs';
import { GLTFLoader } from '../vendor/three/examples/jsm/loaders/GLTFLoader.mjs';

const SUPPORTED_RATIOS = [1, 0.6, 0.1, 0.01];

export class JanusLayer {
  constructor(globe) {
    this.globe = globe;
    this.requested = false;
    this.ratio = 0.6;
    this.paused = false;
    this.loadPromise = null;
  }

  load() {
    if (this.loadPromise) return this.loadPromise;

    this.loadPromise = new Promise((resolve, reject) => {
      new GLTFLoader().load('./assets/models/janus-system-demo.glb', (gltf) => {
        this.model = gltf.scene;
        this.model.name = 'Janus_Universe_Layer';
        this.model.visible = false;
        this.negativeSector = this.model.getObjectByName('Janus_Minus');
        if (!this.negativeSector) {
          reject(new Error('Janus_Minus was not found in the Janus model'));
          return;
        }

        this.baseNegativeScale = this.negativeSector.scale.clone();
        this.mixer = new THREE.AnimationMixer(this.model);
        gltf.animations
          .filter(clip => /^Time_(Plus|Minus)/.test(clip.name))
          .forEach(clip => this.mixer.clipAction(clip).play());

        const bakedRatioLabel = this.model.getObjectByName('Label_Ratio');
        if (bakedRatioLabel) bakedRatioLabel.visible = false;

        this.globe.scene.add(this.model);
        this.setRatio(this.ratio);
        this.installControls();
        resolve(this.model);
      }, undefined, reject);
    }).catch((error) => {
      this.loadPromise = null;
      throw error;
    });

    return this.loadPromise;
  }

  async setVisible(visible) {
    this.requested = Boolean(visible);
    if (!visible) {
      if (this.model) this.model.visible = false;
      if (this.panel) this.panel.hidden = true;
      if (this.globe.solarSystemModel && this.globe.inSolarSystemView) {
        this.globe.solarSystemModel.visible = true;
      }
      return;
    }

    await this.load();
    if (!this.requested || !this.globe.inSolarSystemView) return;

    this.model.visible = true;
    this.panel.hidden = false;
    if (this.globe.solarSystemModel) this.globe.solarSystemModel.visible = false;
    this.globe.focusedPlanet = null;
    this.globe.focusedPlanetOffset = null;
    this.globe.isPlanetFocused = false;
    this.focus();
  }

  focus() {
    const bounds = new THREE.Box3().setFromObject(this.model);
    const size = bounds.getSize(new THREE.Vector3());
    const radius = Math.max(size.x, size.y, size.z) / 2;
    const verticalFov = THREE.MathUtils.degToRad(this.globe.camera.fov);
    const distance = radius / Math.sin(verticalFov / 2) * 1.12;

    this.globe.controls.maxDistance = Math.max(150, distance * 2);
    this.globe.camera.position.copy(new THREE.Vector3(22, 16, 30).normalize().multiplyScalar(distance));
    this.globe.controls.target.set(0, 0, 0);
    this.globe.controls.update();
  }

  setRatio(ratio) {
    const numericRatio = Number(ratio);
    if (!SUPPORTED_RATIOS.includes(numericRatio)) {
      throw new Error('Unsupported illustrative Janus ratio');
    }

    this.ratio = numericRatio;
    if (this.negativeSector) {
      this.negativeSector.scale.copy(this.baseNegativeScale).multiplyScalar(this.ratio / 0.6);
    }
    if (this.ratioOutput) {
      this.ratioOutput.textContent = `a- / a+ = ${this.ratio} (illustrative)`;
    }
  }

  installControls() {
    const panel = document.createElement('section');
    panel.id = 'janus-layer-controls';
    panel.setAttribute('aria-label', 'Janus System illustration controls');
    panel.innerHTML = `
      <strong title="Janus System: theoretical illustration">Janus illustration</strong>
      <label>
        Ratio
        <select aria-label="Janus illustrative spatial ratio">
          <option value="1">1:1</option>
          <option value="0.6" selected>0.6:1</option>
          <option value="0.1">1:10</option>
          <option value="0.01">1:100</option>
        </select>
      </label>
      <button type="button" data-janus-pause>Pause</button>
      <span data-janus-ratio></span>
      <small>Opposing arrows and ratios are explanatory graphics, not measurements or proof of the theory.</small>
    `;
    panel.hidden = true;
    this.panel = panel;
    this.ratioOutput = panel.querySelector('[data-janus-ratio]');
    this.setRatio(this.ratio);
    panel.querySelector('select').addEventListener('change', event => this.setRatio(event.target.value));
    panel.querySelector('button').addEventListener('click', (event) => {
      this.paused = !this.paused;
      event.currentTarget.textContent = this.paused ? 'Resume' : 'Pause';
    });
    document.body.appendChild(panel);
  }

  update(delta) {
    if (this.model?.visible && !this.paused) this.mixer?.update(delta);
  }
}