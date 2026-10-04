import * as THREE from '../../vendor/three/three.mjs';
import { OrbitControls } from '../../vendor/three/examples/jsm/controls/OrbitControls.mjs';
import { GLTFLoader } from '../../vendor/three/examples/jsm/loaders/GLTFLoader.mjs';

const view = document.querySelector('#view');
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, 1, 0.01, 1000);
// Blender Z-up convention for the cut and flattening controls.
camera.up.set(0, 0, 1); camera.position.set(24, -34, 20);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); view.append(renderer.domElement);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true; controls.target.set(0, 0, 0);
scene.add(new THREE.AmbientLight(0xffffff, 1.4));
const light = new THREE.DirectionalLight(0xffffff, 2); light.position.set(10, -20, 30); scene.add(light);
const plus = new THREE.Group(), minus = new THREE.Group(); scene.add(plus, minus);
plus.position.z = 1.4; minus.position.z = -1.4;
const colors = [0x63d9ff, 0xffb681];
function line(parent, points, color, opacity = 0.65) {
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = new THREE.LineBasicMaterial({ color, transparent: true, opacity });
  const result = new THREE.Line(geometry, material); parent.add(result); return result;
}
function hemisphere(parent, color) {
  for (let j = 0; j < 7; j++) {
    const phi = Math.PI / 2 * j / 7;
    line(parent, Array.from({ length: 97 }, (_, i) => {
      const theta = Math.PI * 2 * i / 96;
      return new THREE.Vector3(10 * Math.cos(phi) * Math.cos(theta), 10 * Math.cos(phi) * Math.sin(theta), 10 * Math.sin(phi));
    }), color);
  }
  for (let j = 0; j < 16; j++) {
    const theta = Math.PI * 2 * j / 16;
    line(parent, Array.from({ length: 33 }, (_, i) => {
      const phi = Math.PI / 2 * i / 32;
      return new THREE.Vector3(10 * Math.cos(phi) * Math.cos(theta), 10 * Math.cos(phi) * Math.sin(theta), 10 * Math.sin(phi));
    }), color);
  }
}
hemisphere(plus, colors[0]); hemisphere(minus, colors[1]);
// Separate reflection (determinant < 0) and optional proper rotation.
const mirrorTurn = new THREE.Group(); minus.add(mirrorTurn);
const mirroredContents = [...minus.children].filter(child => child !== mirrorTurn);
for (const child of mirroredContents) mirrorTurn.add(child);
const arrows = [1, -1].map((sign, i) => {
  const z = sign * 9;
  line(scene, [new THREE.Vector3(-11, 0, z), new THREE.Vector3(11, 0, z)], colors[i]);
  const arrow = new THREE.ArrowHelper(new THREE.Vector3(sign, 0, 0), new THREE.Vector3(), 2.4, colors[i], 0.8, 0.5);
  scene.add(arrow); return arrow;
});
const ratio = document.querySelector('#ratio'), flat = document.querySelector('#flat'), rate = document.querySelector('#rate');
function update() {
  const r = Number(ratio.value), z = Number(flat.value);
  plus.scale.set(1, 1, z); minus.scale.set(r, r, -r * z);
  mirrorTurn.rotation.set(document.querySelector('#turn').checked ? Math.PI : 0, document.querySelector('#turn').checked ? Math.PI : 0, 0);
  document.querySelector('#flatValue').value = z.toFixed(2);
  document.querySelector('#rateValue').value = Number(rate.value).toFixed(2);
  window.janusState = { ratio: r, flatten: z, negativeAnimationRate: Number(rate.value), reflectionDeterminant: -(r ** 3) * z, modelLoaded: Boolean(window.janusModelLoaded) };
}
for (const element of [ratio, flat, rate, document.querySelector('#turn')]) element.addEventListener('input', update);
update();
// The solar GLB is Y-up; convert it to the explicit Z-up diagram convention.
new GLTFLoader().load('../models/solar-system.glb', gltf => {
  const model = gltf.scene;
  model.traverse(node => { if (/universe|soalr_system|rootnode/i.test(node.name)) node.visible = false; });
  // Measure only the teaching solar model, without its enclosing universe shell.
  const box = new THREE.Box3();
  model.updateMatrixWorld(true);
  model.traverse(node => { if (node.isMesh && !/universe/i.test(node.name)) box.expandByObject(node); });
  const radius = new THREE.Vector3(
    Math.max(Math.abs(box.min.x), Math.abs(box.max.x)),
    Math.max(Math.abs(box.min.y), Math.abs(box.max.y)),
    Math.max(Math.abs(box.min.z), Math.abs(box.max.z))
  ).length();
  const holder = new THREE.Group(); holder.rotation.x = Math.PI / 2;
  holder.scale.setScalar(8 / radius); holder.add(model); plus.add(holder);
  const ghost = holder.clone(true);
  ghost.traverse(node => { if (node.isMesh) node.material = new THREE.MeshBasicMaterial({ color: colors[1], wireframe: true, transparent: true, opacity: 0.45 }); });
  mirrorTurn.add(ghost);
  window.janusModelLoaded = true;
  document.querySelector('#status').textContent = 'Système solaire topic.earth · repères graphiques'; update();
}, undefined, error => {
  document.querySelector('#status').textContent = 'Modèle indisponible · géométrie Janus visible'; console.error(error);
});
let paused = false, phasePlus = 0, phaseMinus = 0;
document.querySelector('#pause').addEventListener('click', event => { paused = !paused; event.target.textContent = paused ? 'Reprendre' : 'Pause'; });
new ResizeObserver(() => { const w = view.clientWidth, h = view.clientHeight; renderer.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix(); }).observe(view);
const clock = new THREE.Clock();
function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.1);
  if (!paused) { phasePlus = (phasePlus + dt / 6) % 1; phaseMinus = (phaseMinus + dt / 6 * Number(rate.value)) % 1; }
  arrows[0].position.set(-10 + 20 * phasePlus, 0, 9);
  arrows[1].position.set(10 - 20 * phaseMinus, 0, -9);
  controls.update(); renderer.render(scene, camera);
}
animate();
