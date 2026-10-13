export const EARTH_KM = 6371;
const rad=value=>value*Math.PI/180;
export function destination(lat,lon,bearing,km) {
  const p=rad(lat),l=rad(lon),b=rad(bearing),d=km/EARTH_KM;
  const p2=Math.asin(Math.sin(p)*Math.cos(d)+Math.cos(p)*Math.sin(d)*Math.cos(b));
  const l2=l+Math.atan2(Math.sin(b)*Math.sin(d)*Math.cos(p),Math.cos(d)-Math.sin(p)*Math.sin(p2));
  return {lat:p2*180/Math.PI,lon:((l2*180/Math.PI+540)%360)-180};
}
export function extentBoundary(extent,step=5) {
  const start=extent.bearings?.[0] || 0,end=extent.bearings?.[1] ?? 360;
  const sweep=end>=start ? end-start : end+360-start;
  const points=[];
  const radius=b=>extent.quadrantsKm ? extent.quadrantsKm[Math.floor(((b%360)+360)%360/90)] : extent.radiusKm;
  for(let offset=0;offset<=sweep;offset+=step) {const bearing=start+offset;points.push(destination(extent.center.lat,extent.center.lon,bearing,radius(bearing)));}
  if(sweep%step) points.push(destination(extent.center.lat,extent.center.lon,start+sweep,radius(start+sweep)));
  // A partial JMA arc is a sector, not a closed full circle.
  if(sweep<360) points.unshift({...extent.center});
  return points;
}
export function spiralSegments(radius=.025) {
  const vertices=[];
  for(let arm=0;arm<2;arm++) for(let i=0;i<100;i++) {
    for(const n of [i,i+1]) {
      const t=n/100,angle=arm*Math.PI+t*Math.PI*2.3,r=radius*(.12+.88*t);
      vertices.push(Math.cos(angle)*r,Math.sin(angle)*r,0);
    }
  }
  return vertices;
}
export function attachCycloneVisual(THREE,marker,point,toVector,{makeCanvas=()=>document.createElement('canvas')}={}) {
  const storm=point.cyclone, anchor=marker.position;
  const offset=(p,r=1.012)=>toVector(p.lat,p.lon,r).sub(anchor);
  const geometry=points=>new THREE.BufferGeometry().setFromPoints(points);
  const color=point.markerColor || '#00d4ff';
  const extents=storm.stale ? [] : (storm.windExtents || []).filter(extent=>Date.now()-Date.parse(extent.issuedAt)<12*3600000);
  for(const extent of extents) {
    const boundary=extentBoundary(extent),points=boundary.map(p=>offset(p,1.006));
    const shade=extent.thresholdKt>=64 ? '#ff6433' : extent.thresholdKt>=50 ? '#ffb020' : '#00d4ff';
    const fill=[];const center=offset(extent.center,1.006);
    for(let i=0;i<points.length-1;i++) fill.push(center,...[points[i],points[i+1]]);
    const mesh=new THREE.Mesh(geometry(fill),new THREE.MeshBasicMaterial({color:shade,transparent:true,opacity:.13,side:THREE.DoubleSide,depthWrite:false}));
    mesh.renderOrder=2;marker.add(mesh);
    const outline=new THREE.Line(geometry(points),new THREE.LineBasicMaterial({color:shade,transparent:true,opacity:.7,depthWrite:false}));
    outline.renderOrder=3;marker.add(outline);
  }
  const drawTrack=(rows,dashed)=>{
    if(rows.length<2) return;
    // Interpolate on the sphere so long/dateline-crossing segments don't cut
    // through Earth. These subdivisions are drawing only, not new reports.
    const points=[];
    for(let i=0;i<rows.length-1;i++) {
      const a=toVector(rows[i].lat,rows[i].lon,1),b=toVector(rows[i+1].lat,rows[i+1].lon,1);
      const count=Math.max(1,Math.ceil(a.angleTo(b)/.025));
      for(let j=0;j<count;j++) points.push(a.clone().lerp(b,j/count).normalize().multiplyScalar(1.009).sub(anchor));
    }
    points.push(offset(rows.at(-1),1.009));
    const material=dashed ? new THREE.LineDashedMaterial({color:'#9ff5ff',dashSize:.012,gapSize:.008,transparent:true,opacity:storm.stale ? .3 : .85,depthWrite:false}) : new THREE.LineBasicMaterial({color:'#00d4ff',transparent:true,opacity:storm.stale ? .25 : .65,depthWrite:false});
    const line=new THREE.Line(geometry(points),material);if(dashed) line.computeLineDistances();line.renderOrder=3;marker.add(line);
  };
  drawTrack(storm.pastTrack || [],false);
  if(!storm.stale) drawTrack([{lat:point.lat,lon:point.lon},...(storm.forecastTrack || []).filter(p=>Date.parse(p.validAt)>Date.now())],true);
  const radiusKm=Math.max(0,...extents.map(e=>e.quadrantsKm?Math.max(...e.quadrantsKm):e.radiusKm));
  const symbolRadius=radiusKm ? Math.min(.08,Math.max(.018,radiusKm/EARTH_KM)) : .023;
  const spiral=new THREE.Group();
  spiral.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),anchor.clone().normalize());
  spiral.position.copy(anchor.clone().normalize().multiplyScalar(.004));
  const spiralGeometry=new THREE.BufferGeometry();spiralGeometry.setAttribute('position',new THREE.Float32BufferAttribute(spiralSegments(symbolRadius),3));
  spiral.add(new THREE.LineSegments(spiralGeometry,new THREE.LineBasicMaterial({color,transparent:true,opacity:.95,depthWrite:false})));
  const eye=new THREE.Mesh(new THREE.RingGeometry(symbolRadius*.09,symbolRadius*.16,24),new THREE.MeshBasicMaterial({color,side:THREE.DoubleSide,transparent:true,opacity:.95,depthWrite:false}));
  spiral.add(eye);spiral.renderOrder=6;marker.add(spiral);marker.userData.cycloneSpiral=spiral;
  marker.userData.cycloneSpinDirection=point.lat>=0 ? 1 : -1;
  if(makeCanvas) {
    const canvas=makeCanvas();canvas.width=512;canvas.height=96;const ctx=canvas.getContext('2d');
    if(ctx) {
      ctx.fillStyle='#071019e6';ctx.fillRect(0,0,512,96);ctx.strokeStyle=color;ctx.lineWidth=3;ctx.strokeRect(2,2,508,92);
      ctx.fillStyle=color;ctx.font='bold 36px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(storm.name+(storm.stale?' · stale':''),256,48,490);
      const texture=new THREE.CanvasTexture(canvas);const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,transparent:true,depthWrite:false}));
      sprite.position.copy(anchor.clone().normalize().multiplyScalar(.022)).add(new THREE.Vector3(0,.04,0));sprite.scale.set(.15,.028,1);sprite.renderOrder=6;marker.add(sprite);
    }
  }
  marker.userData.visualBaseOpacity=.15;
}
export function animateCycloneMarker(marker,time,reducedMotion=false) {
  const spiral=marker.userData.cycloneSpiral;if(!spiral) return false;
  marker.scale.setScalar(1); // Never resize geographic footprints/tracks.
  const selected=marker.userData.isCurrentTopic;
  spiral.scale.setScalar(selected ? 1.2 : 1);
  if(!reducedMotion) spiral.rotation.z=time*.22*marker.userData.cycloneSpinDirection;
  marker.material.opacity=.15;
  return true;
}
