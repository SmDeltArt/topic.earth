import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
const readClass = async (file, name, globals) => {
  const source = (await readFile(new URL(`../${file}`,import.meta.url),'utf8')).replace(/^import[\s\S]*?;\r?\n/gm,'').replace(`export class ${name}`,`class ${name}`);
  const context=vm.createContext(globals);
  vm.runInContext(`${source.slice(source.indexOf(`class ${name}`))}\nthis.TestClass=${name};`,context);
  return context.TestClass;
};
const document={hidden:false};let regional=true;let queued=0;let cancelled=[];let dismissed=0;
const Globe=await readClass('lib/globe.js','GlobeRenderer',{document,
  requestAnimationFrame(){queued++;return queued;},cancelAnimationFrame(id){cancelled.push(id);}});
const globe=Object.create(Globe.prototype);
globe.container={classList:{contains:()=>regional}};
globe.dismissTopicTooltip=()=>dismissed++;
globe.animate();assert.equal(queued,0,'Regional does not schedule animation frames');
globe.animationFrame=5;globe.syncAnimationVisibility();assert.deepEqual(cancelled,[5]);assert.equal(globe.animationFrame,null);
let starts=0;globe.animate=()=>{starts++;globe.animationFrame=10;};
regional=false;globe.syncAnimationVisibility();globe.syncAnimationVisibility();assert.equal(starts,1,'Returning to World starts one loop');
document.hidden=true;globe.syncAnimationVisibility();assert.equal(globe.animationFrame,null);
document.hidden=false;globe.syncAnimationVisibility();assert.equal(starts,2);
globe.destroyed=true;globe.syncAnimationVisibility();assert.equal(globe.animationFrame,null);

// Track/footprint children are not targets; an occluded storm cannot be hovered.
const stormArea={userData:{},name:'storm centre'};const storm={visible:true,userData:{isTropicalCyclone:true,hitArea:stormArea}};
const ordinary={visible:true,userData:{id:'ordinary'}};
globe.activeMarkers=new Set([storm,ordinary,{visible:false,userData:{}}]);globe.earth={};
globe.raycaster={intersectObjects(targets,recursive){assert.equal(recursive,true);assert.deepEqual(Array.from(targets),[stormArea,ordinary]);return [{distance:1.95,object:stormArea},{distance:4,object:stormArea}];},intersectObject(){return [{distance:2}];}};
assert.equal(globe.getTopicMarkerIntersections().length,1);

// The clock performs one update per second and pauses completely in hidden tabs.
document.hidden=false;const timers=new Map();let next=0;let writes=0;
const Bar=await readClass('components/TopBar.js','TopBar',{document,Date,
  setTimeout(fn,delay){assert.ok(delay>0&&delay<=1000);timers.set(++next,fn);return next;},clearTimeout(id){timers.delete(id);},
  requestAnimationFrame(){throw Error('Clock must not start a frame loop');}});
const bar=Object.create(Bar.prototype);bar.updateLogoClock=bar.updateLogoClock.bind(bar);
bar.container={querySelector:()=>({style:{setProperty(){writes++;}},setAttribute(){}})};
bar.startLogoClock();assert.equal(writes,3);assert.equal(timers.size,1);
bar.startLogoClock();assert.equal(timers.size,1,'Redraw does not duplicate timers');
document.hidden=true;bar.startLogoClock();assert.equal(timers.size,0);
console.log('Regional/hidden rendering pauses and resumes once; clock ticks at 1 Hz; cyclone tracks/footprints and occluded markers do not trigger hover.');
