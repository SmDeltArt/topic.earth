import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import * as THREE from '../vendor/three/three.mjs';
import { SolarOrbitModels, ORBIT_MODELS, ellipsePosition } from '../lib/solar-orbits.mjs';

// Match the actual linked GLB hierarchy, including the annual Earth rotation.
const scene = new THREE.Group();
const root = new THREE.Group(); root.name = 'Orbit_System_Root'; scene.add(root);
const earthOrbit = new THREE.Group(); earthOrbit.name = 'Orbit_Earth'; root.add(earthOrbit);
const earth = new THREE.Group(); earth.name = 'Spin_Earth'; earth.position.x = 22; earthOrbit.add(earth);
const moonOrbit = new THREE.Group(); moonOrbit.name = 'Orbit_Moon'; moonOrbit.position.x = 22; earthOrbit.add(moonOrbit);
const moon = new THREE.Group(); moon.name = 'Spin_Moon'; moon.position.x = 2.8236; moonOrbit.add(moon);
const planetOrbit = new THREE.Group(); planetOrbit.name = 'Orbit_Planet9'; root.add(planetOrbit);
const planet = new THREE.Group(); planet.name = 'Spin_Planet9'; planet.position.x = 165; planetOrbit.add(planet);
const oldGuide = new THREE.Group(); oldGuide.name = 'OrbitPath_Planet9'; scene.add(oldGuide);
const rotation = name => new THREE.QuaternionKeyframeTrack(`${name}.quaternion`, [0, 37.5], [0, 0, 0, 1, 0, 1, 0, 0]);
const clip = new THREE.AnimationClip('Solar_System_Real_Orbits', 37.5, [
  rotation('Orbit_Earth'), rotation('Orbit_Moon'), rotation('Spin_Moon'),
  rotation('Orbit_Planet9'), rotation('Spin_Planet9')
]);
const model = new SolarOrbitModels(scene, [clip]);
assert.deepEqual(model.clips[0].tracks.map(track => track.name), ['Orbit_Earth.quaternion', 'Spin_Planet9.quaternion']);
assert.equal(clip.tracks.length, 5, 'Imported animation must remain unmodified');
assert.equal(oldGuide.visible, false);
assert.equal(moonOrbit.parent, root, 'Lunar frame must not inherit the annual Earth rotation');

for (const [name, elements] of Object.entries(ORBIT_MODELS)) {
  const a = 10;
  assert.ok(Math.abs(ellipsePosition(0, a, elements.eccentricity, elements.inclinationDeg).length() - a * (1 - elements.eccentricity)) < 1e-9);
  assert.ok(Math.abs(ellipsePosition(Math.PI, a, elements.eccentricity, elements.inclinationDeg).length() - a * (1 + elements.eccentricity)) < 1e-9);
  assert.ok(ellipsePosition(Math.PI * 2, a, elements.eccentricity, elements.inclinationDeg).distanceTo(ellipsePosition(0, a, elements.eccentricity, elements.inclinationDeg)) < 1e-9);
}
assert.ok(Math.abs(ORBIT_MODELS.Planet9.periodDays / 365.256 - 7407.5637) < 1e-4);

// Geocentric orbit remains attached to Earth at every annual phase, even with
// scene scaling and translation. The guide and body share a tilted ellipse.
scene.position.set(3, 4, 5); root.scale.setScalar(2);
for (const yearFraction of [0, 0.1, 0.25, 0.5, 0.75, 1, 1.1]) {
  earthOrbit.rotation.y = yearFraction * Math.PI * 2;
  model.update(yearFraction * model.yearSeconds);
  scene.updateMatrixWorld(true);
  assert.ok(moonOrbit.getWorldPosition(new THREE.Vector3()).distanceTo(earth.getWorldPosition(new THREE.Vector3())) < 1e-9);
  const radius = moon.position.length();
  assert.ok(radius >= model.moonRadius * (1 - ORBIT_MODELS.Moon.eccentricity) - 1e-9);
  assert.ok(radius <= model.moonRadius * (1 + ORBIT_MODELS.Moon.eccentricity) + 1e-9);
  assert.ok(Math.abs(moon.position.y / moon.position.z + Math.tan(THREE.MathUtils.degToRad(5.145))) < 1e-9 || Math.abs(moon.position.z) < 1e-9);
}
model.update(0); const moonStart = moon.position.clone(); const planetStart = planet.position.clone();
model.update(model.yearSeconds * ORBIT_MODELS.Moon.periodDays / 365.256);
assert.ok(moon.position.distanceTo(moonStart) < 1e-9, 'Sidereal period must close lunar orbit');
model.update(model.yearSeconds);
assert.ok(planet.position.distanceTo(planetStart) > 0, 'Planet Nine must advance on the shared clock');
assert.ok(planet.position.distanceTo(planetStart) < 1, 'Planet Nine must not race around its orbit in one Earth year');
model.update(model.yearSeconds * ORBIT_MODELS.Planet9.periodDays / 365.256);
assert.ok(planet.position.distanceTo(planetStart) < 1e-8);

const source = await readFile(new URL('../data/space-topics.js', import.meta.url), 'utf8');
const { SPACE_TOPICS } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
assert.equal(new Set(SPACE_TOPICS.map(topic => topic.id)).size, SPACE_TOPICS.length);
const chronos = SPACE_TOPICS.find(topic => topic.id === 'space_chronos_habitable_world');
assert.equal(chronos.category, 'space');
assert.equal(chronos.solarSystemObject, 'Earth');
assert.equal(chronos.isPlanet, false);
assert.equal(chronos.date, '2026-10-01');
assert.equal(chronos.researchSources.length, 3);
assert.ok(chronos.insight.includes('N = R*'));
console.log('Solar orbit and Chronos topic checks passed.');
