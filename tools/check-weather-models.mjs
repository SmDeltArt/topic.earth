import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as THREE from '../vendor/three/three.mjs';
import {GLTFLoader} from '../vendor/three/examples/jsm/loaders/GLTFLoader.mjs';
import {WeatherModelManager} from '../lib/weather-models.mjs';
const bytes=await readFile(new URL('../assets/models/weather-symbols.glb',import.meta.url));
assert.equal(bytes.toString('ascii',0,4),'glTF');
const asset=await new Promise((resolve,reject)=>new GLTFLoader().parse(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'',resolve,reject));
for(const key of ['cloud','rain','storm','wind','snow','fog','sun','heat']) {
 const group=asset.scene.getObjectByName(key);assert.ok(group,key+' is present');
 let meshes=0;group.traverse(node=>{assert.ok(!node.isSprite);if(node.isMesh){meshes++;assert.ok(node.geometry.getAttribute('position').count>0)}});assert.ok(meshes>0);
}
let loads=0;const manager=new WeatherModelManager(THREE,()=>({loadAsync:async()=>{loads++;return asset}}));
const earth=new THREE.Group();
const marker=()=>{const m=new THREE.Mesh(new THREE.SphereGeometry(.01),new THREE.MeshBasicMaterial());m.position.set(1,0,0);earth.add(m);return m};
const a=marker(),b=marker();
await Promise.all([manager.attach(a,{eventType:'wind',severity:'severe'}),manager.attach(b,{eventType:'wind',severity:'warning'})]);
assert.equal(loads,1);assert.ok(a.userData.weatherModel.name.includes('wind'));
const outward=new THREE.Vector3(0,0,1).applyQuaternion(a.userData.weatherModel.quaternion);assert.ok(outward.distanceTo(new THREE.Vector3(1,0,0))<1e-6);
const meshA=a.userData.weatherModel.children.find(node=>node.isMesh),meshB=b.userData.weatherModel.children.find(node=>node.isMesh);
assert.notEqual(meshA.geometry,meshB.geometry);assert.notEqual(meshA.material,meshB.material);assert.notEqual(meshA.material.color.getHex(),meshB.material.color.getHex());
const removed=marker();earth.remove(removed);assert.equal(await manager.attach(removed,{eventType:'storm'}),false);
const pole=marker();pole.position.set(0,1,0);assert.equal(await manager.attach(pole,{meteo:{weatherCode:0}}),true);
assert.ok(pole.userData.weatherModel.quaternion.toArray().every(Number.isFinite));
console.log('GLB:',bytes.length,'bytes; eight mesh models, one cached load, radial orientation, per-marker colours/resources and removed-marker guard passed.');
