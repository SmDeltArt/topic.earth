import * as THREE from '../vendor/three/three.mjs';

// Mean-element teaching models, not date-specific ephemerides. Scene distances
// are enlarged/compressed; period ratios and eccentricities are retained.
export const ORBIT_MODELS = Object.freeze({
  Moon: { eccentricity: 0.0549, inclinationDeg: 5.145, periodDays: 27.32166 },
  // Brown & Batygin (2021), representative a=380 AU, perihelion=300 AU.
  Planet9: { eccentricity: 1 - 300 / 380, inclinationDeg: 16, periodDays: 365.256 * Math.pow(380, 1.5) }
});

export function ellipsePosition(meanAnomaly, semimajorAxis, eccentricity, inclinationDeg) {
  const mean = THREE.MathUtils.euclideanModulo(meanAnomaly, Math.PI * 2);
  let eccentricAnomaly = mean;
  for (let i = 0; i < 12; i++) {
    const correction = (eccentricAnomaly - eccentricity * Math.sin(eccentricAnomaly) - mean)
      / (1 - eccentricity * Math.cos(eccentricAnomaly));
    eccentricAnomaly -= correction;
    if (Math.abs(correction) < 1e-12) break;
  }
  const x = semimajorAxis * (Math.cos(eccentricAnomaly) - eccentricity);
  const z = -semimajorAxis * Math.sqrt(1 - eccentricity ** 2) * Math.sin(eccentricAnomaly);
  const inclination = THREE.MathUtils.degToRad(inclinationDeg);
  return new THREE.Vector3(x, -z * Math.sin(inclination), z * Math.cos(inclination));
}

function orbitGuide(name, semimajorAxis, elements, dashed) {
  const points = Array.from({ length: 257 }, (_, index) => ellipsePosition(
    index / 256 * Math.PI * 2, semimajorAxis, elements.eccentricity, elements.inclinationDeg
  ));
  const options = { color: dashed ? 0xd3adff : 0x80ddff, transparent: true, opacity: 0.65 };
  const material = dashed
    ? new THREE.LineDashedMaterial({ ...options, dashSize: 2, gapSize: 1.5 })
    : new THREE.LineBasicMaterial(options);
  const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), material);
  line.name = `TeachingOrbitPath_${name}`;
  if (dashed) line.computeLineDistances();
  // Decorative paths must not intercept body selection.
  line.raycast = () => {};
  return line;
}

export class SolarOrbitModels {
  constructor(model, clips) {
    this.root = model.getObjectByName('Orbit_System_Root') || model;
    this.earth = model.getObjectByName('Spin_Earth');
    this.moonPivot = model.getObjectByName('Orbit_Moon');
    this.moon = model.getObjectByName('Spin_Moon');
    this.planetPivot = model.getObjectByName('Orbit_Planet9');
    this.planet = model.getObjectByName('Spin_Planet9');
    this.yearSeconds = clips.find(clip => clip.duration > 0)?.duration || 37.5;
    this.overridden = new Set();

    if (this.earth && this.moonPivot && this.moon) {
      this.moonRadius = this.moon.position.length();
      this.root.add(this.moonPivot);
      this.moonPivot.quaternion.identity();
      this.moonGuide = orbitGuide('Moon', this.moonRadius, ORBIT_MODELS.Moon, false);
      this.moonPivot.add(this.moonGuide);
      this.overridden.add(this.moonPivot);
      this.overridden.add(this.moon);
      const oldGuide = model.getObjectByName('OrbitPath_Moon');
      if (oldGuide) oldGuide.visible = false;
    }
    if (this.planetPivot && this.planet) {
      // Preserve the imported outer display envelope; the Sun is at a focus.
      this.planetRadius = this.planet.position.length() / (1 + ORBIT_MODELS.Planet9.eccentricity);
      this.planetPivot.position.set(0, 0, 0);
      this.planetPivot.quaternion.identity();
      this.overridden.add(this.planetPivot);
      const oldGuide = model.getObjectByName('OrbitPath_Planet9');
      if (oldGuide) oldGuide.visible = false;
      this.root.add(orbitGuide('Planet9', this.planetRadius, ORBIT_MODELS.Planet9, true));
    }

    // Remove only the baked transforms we replace, keeping all other animation.
    this.clips = clips.map(clip => {
      const filtered = clip.clone();
      filtered.tracks = filtered.tracks.filter(track => {
        const { nodeName } = THREE.PropertyBinding.parseTrackName(track.name);
        const node = THREE.PropertyBinding.findNode(model, nodeName);
        return !this.overridden.has(node)
          && !(this.planetRadius && node === this.planet && track.name.endsWith('.position'));
      });
      return filtered;
    });
    this.update(0);
  }

  update(seconds) {
    const years = seconds / this.yearSeconds;
    if (this.moonRadius) {
      this.root.updateWorldMatrix(true, true);
      const earthCenter = this.earth.getWorldPosition(new THREE.Vector3());
      this.moonPivot.position.copy(this.root.worldToLocal(earthCenter));
      const elements = ORBIT_MODELS.Moon;
      const mean = years * 365.256 / elements.periodDays * Math.PI * 2;
      const position = ellipsePosition(mean, this.moonRadius, elements.eccentricity, elements.inclinationDeg);
      this.moon.position.copy(position);
      // Synchronous rotation: the same face follows the Earth direction.
      this.moon.quaternion.setFromAxisAngle(new THREE.Vector3(1, 0, 0), THREE.MathUtils.degToRad(elements.inclinationDeg));
      this.moon.quaternion.multiply(new THREE.Quaternion().setFromAxisAngle(
        new THREE.Vector3(0, 1, 0), Math.atan2(-position.z / Math.cos(THREE.MathUtils.degToRad(elements.inclinationDeg)), position.x)
      ));
    }
    if (this.planetRadius) {
      const elements = ORBIT_MODELS.Planet9;
      const mean = years * 365.256 / elements.periodDays * Math.PI * 2;
      this.planet.position.copy(ellipsePosition(mean, this.planetRadius, elements.eccentricity, elements.inclinationDeg));
    }
  }
}
