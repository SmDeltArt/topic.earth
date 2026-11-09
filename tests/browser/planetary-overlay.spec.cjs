const {test,expect}=require('@playwright/test');
const path='/assets/topics/planetary-boundaries/index.html';
test('French educational prose, normalization, units, history and uncertainty use the topic JSON translations',async({page})=>{
  await page.goto(path+'?lang=fr');await expect(page.locator('#message')).toContainText('SVG chargé');
  await page.locator('#tab-limits').click();await expect(page.locator('#education-content')).toContainText('Les neuf processus du système Terre');
  await expect(page.locator('#education-content')).toContainText('En deçà de la limite');await expect(page.locator('#education-content')).toContainText('% de la forêt d’origine');
  await expect(page.locator('#education-content')).not.toContainText('Nine Earth system processes');
  await page.locator('#tab-data').click();await expect(page.locator('#data-content h2')).toHaveText('Données scientifiques · 2026');
  await expect(page.locator('#data-content .note')).toContainText('Convention du projet');await expect(page.locator('#data-content')).toContainText('Tg P/an');
  await page.locator('#tab-status').click();await page.locator('.science-notes').evaluate(n=>n.open=true);
  await expect(page.locator('#uncertainty')).toContainText('Forte incertitude');await expect(page.locator('#uncertainty')).toContainText('dépasse le rayon maximal');
  for(const year of ['2023','2024','2025','2026']){
    await page.locator('#assessment-year').selectOption(year);await expect(page.locator('#headline')).toContainText(year);
    await expect(page.locator('#uncertainty')).not.toContainText('Wide extinction-rate');
    await page.locator('#tab-history').click();await expect(page.locator('#history-note')).toContainText('Version sélectionnée');
  }
});
async function harness(page){
  await page.goto(path);await expect(page.locator('#message')).toContainText('SVG loaded');
  await page.evaluate(async()=>{
    const THREE=await import('/vendor/three/three.mjs'),{PlanetaryBoundariesOverlay}=await import('/lib/planetary-boundaries-overlay.mjs');
    const host=document.createElement('div');host.style.cssText='position:fixed;inset:0;background:#345267';document.body.replaceChildren(host);
    const canvas=document.createElement('canvas');canvas.style.cssText='width:100%;height:100%;display:block';host.append(canvas);
    const camera=new THREE.PerspectiveCamera(45,innerWidth/innerHeight,.1,100);camera.position.z=4;camera.updateMatrixWorld();
    const earth=new THREE.Mesh(new THREE.SphereGeometry(1,8,8),new THREE.MeshBasicMaterial());new THREE.Scene().add(earth);
    const globe={container:host,camera,earth,renderer:{domElement:canvas},inFeverMode:true,inSolarSystemView:false,getFeverCurrentYear:()=>window.testFeverYear||2025,getFeverScenario:()=>window.testFeverScenario||'objective'};
    const overlay=new PlanetaryBoundariesOverlay(globe);window.overlayHarness={globe,overlay};overlay.mountControls(host);overlay.setEnabled(true);
  });
  await expect.poll(()=>page.locator('#planetary-scene-frame').getAttribute('data-source-mode')).toBe('scientific');
}
test('transparent passive overlay follows Earth position, camera distance, scale and both fit anchors',async({page})=>{
  await harness(page);
  const frame=page.locator('div.planetary-scene-frame'),before=await frame.boundingBox();
  await expect(frame).toHaveCSS('pointer-events','none');
  const child=page.frameLocator('#planetary-scene-frame');await expect(child.locator('body')).toHaveCSS('background-color','rgba(0, 0, 0, 0)');
  await expect(child.locator('#scene-earth-cutout circle')).toHaveAttribute('fill','black');
  const aligned=()=>page.evaluate(()=>{const {globe:g,overlay:o}=window.overlayHarness;const p=g.earth.position.clone().project(g.camera),r=o.visual.getBoundingClientRect(),c=o.geometry.center,b=o.geometry.viewBox;
    return {actualX:r.x+(c.x-b.x)/b.width*r.width,actualY:r.y+(c.y-b.y)/b.height*r.height,expectedX:(p.x+1)*innerWidth/2,expectedY:(1-p.y)*innerHeight/2};});
  await page.evaluate(()=>{const h=window.overlayHarness;h.globe.earth.position.set(.3,.2,0);h.overlay.update();});
  const a=await aligned();expect(a.actualX).toBeCloseTo(a.expectedX,1);expect(a.actualY).toBeCloseTo(a.expectedY,1);
  await page.evaluate(()=>{const h=window.overlayHarness;h.globe.camera.position.z=6;h.overlay.update();});expect((await frame.boundingBox()).width).toBeLessThan(before.width);
  const smaller=await frame.boundingBox();await page.locator('.planetary-monitor-controls select').nth(1).selectOption('viewport');expect((await frame.boundingBox()).width).toBeLessThanOrEqual(smaller.width);
  await page.evaluate(()=>window.overlayHarness.overlay.setEnabled(false));await expect(frame).toBeHidden();await page.evaluate(()=>window.overlayHarness.overlay.setEnabled(true));await expect(frame).toBeVisible();
  await page.evaluate(()=>window.overlayHarness.overlay.destroy());await expect(frame).toHaveCount(0);
});
test('Fever illustration links canonical indices while preserving scientific assessment and rejecting invalid messages',async({page})=>{
  await harness(page);await page.evaluate(()=>{const h=window.overlayHarness;h.globe.inFeverMode=true;window.testFeverYear=1950;h.overlay.update();});
  await page.locator('.planetary-monitor-controls select').first().selectOption('fever');
  const child=page.frameLocator('#planetary-scene-frame');await expect(child.locator('#scene-overlay-svg>svg')).toHaveAttribute('data-source-mode','fever');
  await expect(child.locator('#scene-overlay-svg #preview-high-risk-circle')).toHaveAttribute('visibility','hidden');
  const radius=()=>child.locator('#scene-overlay-svg #preview-group-climate_change__co2_concentration').getAttribute('d');const before=await radius();
  await page.evaluate(()=>{window.testFeverYear=2100;const o=window.overlayHarness.overlay;o.lastContext=0;o.update();});await expect.poll(radius).not.toBe(before);
  const changed=await radius();await page.evaluate(()=>{const o=window.overlayHarness.overlay;o.frame.contentWindow.postMessage({type:'topic-earth:planetary-overlay-state',mode:'fever',context:{year:2100,scenario:'objective',progress:{climate_change:NaN}}},location.origin);});
  await expect.poll(radius).toBe(changed);await expect(page.locator('.planetary-monitor-controls p')).toContainText('not scientific PB ratios');
  await page.locator('.planetary-monitor-controls select').first().selectOption('scientific');await expect(child.locator('#scene-overlay-svg>svg')).toHaveAttribute('data-source-mode','scientific');
  await expect(child.locator('#scene-overlay-svg #preview-high-risk-circle')).toHaveAttribute('visibility','visible');
});
