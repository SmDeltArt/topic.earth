import test from 'node:test';
import assert from 'node:assert/strict';
import {feverBoundaryContext,overlayFrame,overlayRadiusPixels} from '../lib/planetary-fever-bridge.mjs';
test('Fever link reads and interpolates authored progress without converting physical units or mutating data',()=>{
  const data={climate_change:{scenarios:{objective:{1950:{progress:.2},2050:{progress:1.2}}}},novel_entities:{scenarios:{objective:{1950:{progress:.5},2050:{progress:1.5}}}}};
  const before=JSON.stringify(data),globe={inFeverMode:true,getFeverCurrentYear:()=>2000,getFeverScenario:()=>'objective'};
  const context=feverBoundaryContext(globe,data);assert.equal(context.progress.climate_change,.7);assert.equal(context.progress.novel_entities,1);
  assert.equal(context.year,2000);assert.match(context.source,/not observational/);assert.equal(context.co2,undefined);assert.equal(context.normalizedScientificValue,undefined);assert.equal(JSON.stringify(data),before);
  assert.equal(feverBoundaryContext({...globe,inFeverMode:false},data),null);assert.equal(feverBoundaryContext({...globe,getFeverScenario:()=>'invented'},data),null);
});
test('overlay calibration preserves the SVG center and supports diagram/green-ring fits and scaling',()=>{
  const center={x:147,y:138},box={x:0,y:0,width:282,height:274};
  const diagram=overlayFrame(center,box,130,100),green=overlayFrame(center,box,41,100),larger=overlayFrame(center,box,130,100,1.5);
  assert.equal(diagram.offsetX,147/130*100);assert.equal(diagram.offsetY,138/130*100);
  assert.ok(green.width>diagram.width*3);assert.equal(larger.width,diagram.width*1.5);
  assert.equal(overlayFrame(center,box,0,100),null);assert.equal(overlayFrame(center,box,130,NaN),null);assert.equal(overlayFrame(center,box,130,100,-1),null);
});
test('scene SVG stays within the Earth rim at maximum scale and can fit the viewport',()=>{
  assert.equal(overlayRadiusPixels(200,1),170);
  assert.equal(overlayRadiusPixels(200,2),170);
  assert.equal(overlayRadiusPixels(200,.5),85);
  assert.equal(overlayRadiusPixels(200,1,120),120);
});
