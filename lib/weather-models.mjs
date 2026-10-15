import {weatherSymbol} from './weather-visuals.mjs?v=weather-terrain-20261015';

export class WeatherModelManager {
 constructor(THREE,createLoader) {this.THREE=THREE;this.createLoader=createLoader;this.promise=null}
 load() {
  if(!this.promise)this.promise=this.createLoader().loadAsync(new URL('../assets/models/weather-symbols.glb?v=weather-mesh-20261015',import.meta.url).href)
   .then(asset=>asset.scene).catch(error=>{console.warn('[Weather models] GLB unavailable; retaining selectable point markers.',error);return null});
  return this.promise;
 }
 async attach(marker,point) {
  const library=await this.load();
  if(!library || !marker.parent)return false;
  const T=this.THREE,{key,color}=weatherSymbol(point),template=library.getObjectByName(key);
  if(!template)return false;
  const root=template.clone(true),tint=new T.Color(color);
  root.name='weather-model-'+key;
  root.traverse(node=>{
   if(!node.isMesh)return;
   node.geometry=node.geometry.clone();
   node.material=node.material.clone();
   const surface=node.material.name==='weather-surface';
   node.material.color.copy(surface?new T.Color('#e3f2ff').lerp(tint,.24):tint);
   node.material.transparent=true;node.material.opacity=surface ? .82 : .96;node.material.depthWrite=false;
   if(node.material.emissive)node.material.emissive.copy(node.material.color).multiplyScalar(.18);
  });
  const outward=marker.position.clone().normalize();
  let north=new T.Vector3(0,1,0).addScaledVector(outward,-outward.y);
  if(north.lengthSq()<1e-8)north=new T.Vector3(0,0,1);
  north.normalize();
  const east=new T.Vector3().crossVectors(north,outward).normalize();
  root.quaternion.setFromRotationMatrix(new T.Matrix4().makeBasis(east,north,outward));
  root.scale.setScalar(point.isAutoMeteoEvent ? .038 : .033);
  root.position.copy(outward).multiplyScalar(.05);
  marker.add(root);marker.userData.weatherModel=root;marker.userData.visualBaseOpacity=.12;marker.material.opacity=.12;
  return true;
 }
}
