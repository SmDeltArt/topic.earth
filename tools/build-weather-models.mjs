import {writeFile} from 'node:fs/promises';
const THREE=await import(process.argv[2] || 'three');
const {GLTFExporter}=await import(process.argv[3] || 'three/examples/jsm/exporters/GLTFExporter.js');
// Node build helper; no exporter or npm dependency is shipped to the browser.
globalThis.FileReader=class {
 readAsArrayBuffer(blob){blob.arrayBuffer().then(value=>{this.result=value;this.onloadend?.()})}
 readAsDataURL(blob){blob.arrayBuffer().then(value=>{this.result='data:'+blob.type+';base64,'+Buffer.from(value).toString('base64');this.onloadend?.()})}
};
globalThis.window={FileReader:globalThis.FileReader};
const scene=new THREE.Scene();
const surface=new THREE.MeshStandardMaterial({name:'weather-surface',color:0xe3f2ff,roughness:.8,metalness:0,transparent:true,opacity:.88});
const accent=new THREE.MeshStandardMaterial({name:'weather-accent',color:0x40bfff,roughness:.65,emissive:0x123b4b,emissiveIntensity:.25});
function mesh(group,geometry,material,x=0,y=0,z=0,scale=null){const m=new THREE.Mesh(geometry,material);m.position.set(x,y,z);if(scale)m.scale.set(...scale);group.add(m);return m}
function ball(g,x,y,z,r,mat=surface,scale=null){return mesh(g,new THREE.SphereGeometry(r,12,8),mat,x,y,z,scale)}
function bar(g,a,b,r=.055,mat=accent){const start=new THREE.Vector3(...a),end=new THREE.Vector3(...b),delta=end.clone().sub(start);const m=mesh(g,new THREE.CylinderGeometry(r,r,delta.length(),7),mat);m.position.copy(start.add(end).multiplyScalar(.5));m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());return m}
function cloud(g,y=.1){ball(g,-.55,y,0,.4);ball(g,-.12,y+.22,.015,.55);ball(g,.43,y+.1,0,.46);ball(g,.72,y-.03,0,.25);ball(g,.05,y-.12,.02,.5,surface,[1.3,.55,.8])}
function model(name,build){const g=new THREE.Group();g.name=name;build(g);scene.add(g)}
function tube(g,points,r=.055){mesh(g,new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),24,r,6,false),accent)}
model('cloud',cloud);
model('rain',g=>{cloud(g,.32);for(const x of [-.48,0,.48]){ball(g,x-.08,-.65,.02,.12,accent,[.65,1.6,.65]);mesh(g,new THREE.ConeGeometry(.08,.22,7),accent,x-.08,-.45,.02)}});
model('storm',g=>{cloud(g,.32);const shape=new THREE.Shape();shape.moveTo(.03,-.08);for(const p of [[-.36,-.62],[-.04,-.62],[-.23,-1.05],[.48,-.39],[.12,-.39],[.33,-.08]])shape.lineTo(...p);shape.closePath();mesh(g,new THREE.ExtrudeGeometry(shape,{depth:.13,bevelEnabled:true,bevelThickness:.015,bevelSize:.015,bevelSegments:1,steps:1}),accent,0,0,.08)});
model('wind',g=>{tube(g,[[-.9,.35,0],[.3,.35,0],[.72,.45,.04],[.72,.75,.12],[.43,.75,.1],[.4,.54,.04]]);tube(g,[[-.9,0,.04],[.4,0,.04],[.85,-.1,.08],[.85,-.42,.12],[.52,-.42,.08]]);tube(g,[[-.75,-.35,0],[-.1,-.35,0],[.18,-.5,.05],[.12,-.73,.1],[-.12,-.76,.05]])});
model('snow',g=>{cloud(g,.4);for(const cx of [-.38,.38])for(let i=0;i<3;i++){const angle=i*Math.PI/3,dx=.2*Math.cos(angle),dy=.2*Math.sin(angle);bar(g,[cx-dx,-.65-dy,.05],[cx+dx,-.65+dy,.05],.035)}});
model('fog',g=>{cloud(g,.3);for(let i=0;i<3;i++)bar(g,[-.8+i*.12,-.35-i*.22,.12],[.85-i*.08,-.35-i*.22,.12],.045,surface)});
model('sun',g=>{ball(g,0,0,0,.48,accent);for(let i=0;i<8;i++){const angle=i*Math.PI/4;bar(g,[Math.cos(angle)*.64,Math.sin(angle)*.64,0],[Math.cos(angle)*.92,Math.sin(angle)*.92,0],.06)}});
model('heat',g=>{ball(g,-.15,-.47,0,.35,accent);bar(g,[-.15,-.35,0],[-.15,.6,0],.14,surface);bar(g,[-.15,-.4,.15],[-.15,.5,.15],.055);for(let i=0;i<4;i++)bar(g,[.12,.5-i*.22,.05],[.35,.5-i*.22,.05],.035)});
const binary=await new Promise(resolve=>new GLTFExporter().parse(scene,resolve,{binary:true}));
const output=new URL('../assets/models/weather-symbols.glb',import.meta.url);await writeFile(output,Buffer.from(binary));console.log('Generated',binary.byteLength,'bytes,',scene.children.map(g=>g.name).join(', '));
