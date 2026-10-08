import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import * as THREE from '../vendor/three/three.mjs';
let clock = 0; const frames = [];
let textureRequests = 0;
const source = (await readFile(new URL('../lib/globe.js', import.meta.url), 'utf8'))
  .replace(/^import[^\r\n]*;\r?\n/gm, '').replace('export class GlobeRenderer', 'class GlobeRenderer');
const context = vm.createContext({ THREE: {...THREE, TextureLoader: class {load(){textureRequests++;}}},
  DRACOLoader:class {setDecoderPath(){}}, resolveAssetUrl:path=>path,
  Date:{now:()=>clock}, window:{innerWidth:1280,dispatchEvent(){}},navigator:{maxTouchPoints:0},
  CustomEvent:class {}, requestAnimationFrame:cb=>frames.push(cb),setTimeout(){}, console
});
vm.runInContext(source+'\nthis.GlobeRenderer = GlobeRenderer;',context);
const g = Object.create(context.GlobeRenderer.prototype);
const earth = new THREE.Mesh(new THREE.SphereGeometry(1),new THREE.MeshStandardMaterial({map:new THREE.Texture()}));
earth.name=THREE.PropertyBinding.sanitizeNodeName('Earth.001');earth.position.x=22;
const moon = new THREE.Mesh(new THREE.SphereGeometry(.25),new THREE.MeshStandardMaterial({map:new THREE.Texture()}));
moon.name=THREE.PropertyBinding.sanitizeNodeName('Moon.001');moon.position.x=26;
const model=new THREE.Group();model.add(earth,moon);model.updateMatrixWorld(true);
Object.assign(g,{solarSystemModel:model,earth:new THREE.Mesh(new THREE.SphereGeometry(1)),
  controls:{target:new THREE.Vector3(),update(){}},camera:new THREE.PerspectiveCamera(50,1,.1,1000),
  activeMarkers:new Set(),renderer:{capabilities:{getMaxAnisotropy:()=>1}}
});
g.camera.position.set(0,0,3);
const orbit=new THREE.Group();orbit.name='Orbit_Earth';model.remove(earth,moon);model.add(orbit);orbit.add(earth,moon);
assert.equal(g.findSolarSystemObject('Earth'),earth,'Topic lookup must select the sanitized planet mesh, not its orbit group');
assert.equal(g.findSolarSystemObject('Moon'),moon);
const original=earth.material;
g.applyPlanetFocusTexture(earth);
assert.equal(earth.material,original,'Focusing must preserve embedded textures');
assert.equal(textureRequests,0,'No external texture upgrade for an already textured planet');
g.transitionToSolarSystem();const staleWide=frames.shift();
clock=100;g.focusOnPlanet(earth);const staleEarth=frames.shift();
const before=g.camera.position.clone();clock=500;staleWide();
assert.ok(g.camera.position.equals(before),'Wide-view animation cannot override planet focus');
g.focusOnPlanet(moon);const latest=frames.pop();
const beforeSwap=g.camera.position.clone();clock=800;staleEarth();
assert.ok(g.camera.position.equals(beforeSwap),'Old planet focus cannot override a newer selection');
clock=2200;latest();
assert.equal(g.focusedPlanet,moon);
assert.equal(g.planetFocusTransitionId,null);
assert.ok(g.controls.target.distanceTo(g.getPlanetCenter(moon))<1e-6);
assert.ok(g.camera.position.distanceTo(g.getPlanetCenter(moon))<20);
console.log('Embedded texture preservation and latest-selection camera focus passed.');
const glb = await readFile(new URL('../assets/models/solar-system.real-orbits.linked.glb', import.meta.url));
const gltf = JSON.parse(glb.subarray(20,20+glb.readUInt32LE(12)).toString('utf8'));
const nodes = gltf.nodes.map(node => {
  const object = node.mesh === undefined ? new THREE.Group() : new THREE.Mesh(new THREE.BoxGeometry(1,1,1));
  object.name = THREE.PropertyBinding.sanitizeNodeName(node.name || '');
  return object;
});
gltf.nodes.forEach((node,i) => node.children?.forEach(child => nodes[i].add(nodes[child])));
const loadedModel = new THREE.Group();gltf.scenes[gltf.scene || 0].nodes.forEach(i => loadedModel.add(nodes[i]));
g.solarSystemModel=loadedModel;
for (const name of ['Mercury','Venus','Earth','Moon','Mars','Jupiter','Saturn','Uranus','Neptune','Pluto']) {
  const selected=g.findSolarSystemObject(name);
  assert.ok(selected?.isMesh,`${name} must resolve to a body mesh in the actual loaded GLB hierarchy`);
  assert.ok(selected.name.startsWith(name));
}
context.window.innerHeight=800;
context.document={getElementById(id){return {classList:{contains:()=>false},getBoundingClientRect:()=>id==='detail-panel'?{left:760}:{right:320}};}};
const framed=g.getPlanetFocusTarget(new THREE.Vector3(),1);
assert.ok(framed.x>0,'Look target shifts right so the planet stays left of the detail panel');
console.log('All ten loaded planet names and desktop panel framing passed.');
