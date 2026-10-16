export function horizontalDistance(a,b) {
 const rad=Math.PI/180, dLat=(b[0]-a[0])*rad,dLon=(b[1]-a[1])*rad;
 const h=Math.sin(dLat/2)**2+Math.cos(a[0]*rad)*Math.cos(b[0]*rad)*Math.sin(dLon/2)**2;
 return 6371008.8*2*Math.atan2(Math.sqrt(Math.max(0,h)),Math.sqrt(Math.max(0,1-h)));
}
export function segmentSlope(a,b,heightA,heightB) {
 if (![...a,...b,heightA,heightB].every(value=>typeof value==='number'&&Number.isFinite(value))) return null;
 const distance=horizontalDistance(a,b);if(distance<.01)return null;
 const rise=heightB-heightA;
 return {distanceM:distance,riseM:rise,percent:100*rise/distance,degrees:Math.atan2(rise,distance)*180/Math.PI};
}
export function elevationLabel(elevationM) {
 return typeof elevationM==='number'&&Number.isFinite(elevationM)?`${Math.round(elevationM*100).toLocaleString('en-US')} cm`: 'Elevation unavailable';
}
export class TerrainMeasureManager {
 constructor(fetchImpl=globalThis.fetch) {this.fetchImpl=fetchImpl;this.cache=new Map();this.pending=new Map()}
 key(pair) {return pair.map(value=>Number(value).toFixed(6)).join(',')}
 async elevation(pair) {
  if (!Array.isArray(pair)||pair.length!==2||!pair.every(Number.isFinite)||Math.abs(pair[0])>90||Math.abs(pair[1])>180) throw Error('Invalid terrain coordinates');
  const key=this.key(pair);if(this.cache.has(key))return this.cache.get(key);
  if(this.pending.has(key))return this.pending.get(key);
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),10000);
  const request=Promise.resolve().then(async()=>{
   const params=new URLSearchParams({latitude:String(pair[0]),longitude:String(pair[1])});
   const response=await this.fetchImpl('https://api.open-meteo.com/v1/elevation?'+params,{signal:controller.signal});
   if(!response.ok)throw Error('Elevation unavailable');
   const value=(await response.json()).elevation?.[0];
   if(typeof value!=='number'||!Number.isFinite(value))throw Error('Elevation unavailable');
   if(this.cache.size>=500)this.cache.delete(this.cache.keys().next().value);
   this.cache.set(key,value);return value;
  }).finally(()=>{clearTimeout(timer);this.pending.delete(key)});
  this.pending.set(key,request);return request;
 }
}
