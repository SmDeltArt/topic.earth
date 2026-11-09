import * as THREE from '../vendor/three/three.mjs';
import {Settings} from './settings.js';
import {TIPPING_BOUNDARIES} from '../data/points.js';
import {feverBoundaryContext,overlayFrame,overlayRadiusPixels} from './planetary-fever-bridge.mjs';

const LABELS={
  en:['Planetary boundaries','Published assessment 2026','Fever indices · illustration','Fit whole diagram','Green ring = Earth','Scale','Fever indices are not scientific PB ratios.','Assessment 2026 · source values unchanged','Open topic','Waiting for the SVG…'],
  fr:['Limites planétaires','Évaluation publiée 2026','Indices Fever · illustration','Ajuster tout le graphique','Cercle vert = Terre','Échelle','Les indices Fever ne sont pas des rapports scientifiques aux limites.','Évaluation 2026 · valeurs sources inchangées','Ouvrir le sujet','Chargement du SVG…'],
  nl:['Planetaire grenzen','Gepubliceerde beoordeling 2026','Fever-indices · illustratie','Volledig diagram passend','Groene ring = aarde','Schaal','Fever-indices zijn geen wetenschappelijke grensverhoudingen.','Beoordeling 2026 · bronwaarden ongewijzigd','Onderwerp openen','SVG laden…'],
  de:['Planetare Grenzen','Veröffentlichte Bewertung 2026','Fever-Indizes · Illustration','Ganzes Diagramm einpassen','Grüner Ring = Erde','Maßstab','Fever-Indizes sind keine wissenschaftlichen Grenzverhältnisse.','Bewertung 2026 · Quellenwerte unverändert','Thema öffnen','SVG wird geladen…']};
export class PlanetaryBoundariesOverlay{
  constructor(globe){
    this.globe=globe;this.enabled=false;this.mode='scientific';this.fit='diagram';this.scale=1;this.geometry=null;
    this.center=new THREE.Vector3();this.view=new THREE.Vector3();this.size=new THREE.Vector3();
    this.host=document.createElement('div');this.host.className='planetary-monitor-controls';this.host.hidden=true;
    this.options=document.createElement('div');this.options.id='planetary-scene-options';this.options.hidden=true;
    this.source=document.createElement('select');this.source.setAttribute('aria-label','Planetary overlay data source');
    for(const value of ['scientific','fever']){const option=document.createElement('option');option.value=value;this.source.append(option);}
    this.fitting=document.createElement('select');this.fitting.setAttribute('aria-label','Planetary overlay fit');
    for(const value of ['diagram','viewport']){const option=document.createElement('option');option.value=value;this.fitting.append(option);}
    this.scaling=document.createElement('input');this.scaling.type='range';this.scaling.min='.4';this.scaling.max='1';this.scaling.step='.05';this.scaling.value='1';
    this.status=document.createElement('p');this.status.setAttribute('role','status');
    this.link=document.createElement('a');this.link.target='_blank';this.link.rel='noopener noreferrer';
    this.options.append(this.source,this.fitting,this.scaling,this.status,this.link);this.host.append(this.options);
    this.source.addEventListener('change',()=>{this.mode=this.source.value;this.lastContext=0;this.update();});
    this.fitting.addEventListener('change',()=>{this.fit=this.fitting.value;this.update();});
    this.scaling.addEventListener('input',()=>{this.scale=Number(this.scaling.value);this.update();});
    this.receive=event=>{
      if(event.origin!==location.origin||event.source!==this.frame?.contentWindow||event.data?.type!=='topic-earth:planetary-overlay-ready')return;
      const g=event.data.geometry;if(!g?.viewBox||![g.center?.x,g.center?.y,g.radius,g.referenceRadius,g.viewBox.x,g.viewBox.y,g.viewBox.width,g.viewBox.height].every(Number.isFinite)||g.radius<=0||g.referenceRadius<=0||g.viewBox.width<=0||g.viewBox.height<=0)return;
      const svg=this.frame.contentDocument?.querySelector('#scene-overlay-svg>svg');if(!svg)return;
      this.visual?.remove();this.visual=document.createElement('div');this.visual.className='planetary-scene-frame';this.visual.setAttribute('aria-hidden','true');this.visual.append(document.importNode(svg,true));this.globe.container.append(this.visual);
      this.geometry=g;this.lastContext=0;this.update();
    };
    this.settingsChanged=()=>{const old=this.language;this.localize();if(old!==this.language&&this.frame){this.geometry=null;this.frame.style.visibility='hidden';this.frame.src=this.url();}};
    window.addEventListener('message',this.receive);window.addEventListener('settingsChanged',this.settingsChanged);this.localize();
  }
  localize(){
    const s=Settings.get(),code=String(new URL(location.href).searchParams.get('lang')||s.translationLanguage||(s.autoDetectLanguage?s.detectedBrowserLanguage||navigator.language:s.uiLanguage)||'en').split('-')[0];
    this.language=LABELS[code]?code:'en';this.labels=LABELS[this.language];
    this.source.options[0].textContent=this.labels[1];this.source.options[1].textContent=this.labels[2];
    const fits={en:['Fit Earth','Fit visible scene'],fr:['Ajuster à la Terre','Ajuster à la scène visible'],nl:['Aan aarde aanpassen','Aan zichtbare scène aanpassen'],de:['An Erde anpassen','An sichtbare Szene anpassen']}[this.language];
    this.fitting.options[0].textContent=fits[0];this.fitting.options[1].textContent=fits[1];this.scaling.setAttribute('aria-label',this.labels[5]);
    this.scaling.title=this.labels[5]+' · 40–100%';
    this.link.textContent=this.labels[8];this.link.href=this.url(false);
  }
  url(overlay=true){return `/assets/topics/planetary-boundaries/index.html?lang=${this.language}${overlay?'&overlay=1':''}`;}
  mountControls(target){if(target)target.append(this.host);this.update();}
  setEnabled(value){
    this.enabled=!!value;this.options.hidden=!this.enabled;
    if(this.enabled&&!this.frame){
      this.frame=document.createElement('iframe');this.frame.id='planetary-scene-frame';this.frame.className='planetary-scene-frame';this.frame.style.visibility='hidden';this.frame.title=this.labels[0];this.frame.src=this.url();this.frame.tabIndex=-1;this.frame.setAttribute('aria-hidden','true');this.globe.container.append(this.frame);
    }
    if(this.visual)this.visual.hidden=!this.enabled;
    this.lastContext=0;this.update();
  }
  update(){
    const g=this.globe,visible=g.inFeverMode&&!g.destroyed&&!g.inSolarSystemView&&!!g.earth?.geometry&&g.earth.visible!==false&&!g.container.classList.contains('regional-map-active');
    this.host.hidden=!visible||!this.enabled;this.source.options[1].disabled=!g.inFeverMode;if(!this.frame)return;
    if(!this.enabled||!visible){if(this.visual)this.visual.hidden=true;return;}
    if(!this.geometry){this.status.textContent=this.labels[9];return;}
    g.camera.updateMatrixWorld();g.earth.updateWorldMatrix(true,false);
    g.earth.getWorldPosition(this.center);this.view.copy(this.center).applyMatrix4(g.camera.matrixWorldInverse);
    if(!g.earth.geometry.boundingSphere)g.earth.geometry.computeBoundingSphere();
    g.earth.getWorldScale(this.size);const radius=g.earth.geometry.boundingSphere.radius*Math.max(this.size.x,this.size.y,this.size.z),depth=-this.view.z;
    if(depth<=radius+g.camera.near){this.visual.hidden=true;return;}
    const point=this.center.clone().project(g.camera),canvas=g.renderer.domElement.getBoundingClientRect(),host=g.container.getBoundingClientRect();
    if(point.z<-1||point.z>1){this.visual.hidden=true;return;}
    const earthPixels=canvas.height*g.camera.projectionMatrix.elements[5]/2*radius/Math.sqrt(depth*depth-radius*radius);
    const available=this.fit==='viewport'?Math.max(1,Math.min(canvas.width,canvas.height)/2-18):Infinity;
    const displayRadius=overlayRadiusPixels(earthPixels,this.scale,available);
    const bounds=overlayFrame(this.geometry.center,this.geometry.viewBox,this.geometry.radius,displayRadius);if(!bounds)return;
    this.visual.hidden=false;this.visual.style.width=`${bounds.width}px`;this.visual.style.height=`${bounds.height}px`;
    this.visual.style.left=`${canvas.left-host.left+(point.x+1)*canvas.width/2-bounds.offsetX}px`;this.visual.style.top=`${canvas.top-host.top+(1-point.y)*canvas.height/2-bounds.offsetY}px`;
    const now=performance.now();if(now-(this.lastContext||0)<100)return;this.lastContext=now;
    const context=feverBoundaryContext(g,TIPPING_BOUNDARIES),mode=this.mode==='fever'&&context?'fever':'scientific';
    this.status.textContent=mode==='fever'?`${context.scenario} · ${context.year} · ${this.labels[6]}`:`${this.labels[7]}${context?` · Fever ${context.scenario} ${context.year}`:''}`;
    this.frame.contentWindow.postMessage({type:'topic-earth:planetary-overlay-state',mode,context},location.origin);
    // Paint in the scene's document: embedded browser canvases can otherwise
    // composite even a transparent iframe against opaque white.
    const source=this.frame.contentDocument?.querySelector('#scene-overlay-svg>svg');
    if(source)for(const node of source.querySelectorAll('[id^="preview-group-"],[id^="uncertainty-"],#preview-boundary-circle,#preview-high-risk-circle,#preview-boundary-label,#preview-high-risk-label')){
      const target=this.visual.querySelector('#'+CSS.escape(node.id));if(!target)continue;
      for(const name of ['d','fill','stroke','stroke-width','stroke-dasharray','style','visibility']){const value=node.getAttribute(name);if(value===null)target.removeAttribute(name);else target.setAttribute(name,value);}
    }
    this.frame.dataset.sourceMode=mode;this.frame.dataset.earthX=String(this.center.x);this.frame.dataset.earthY=String(this.center.y);
  }
  destroy(){window.removeEventListener('message',this.receive);window.removeEventListener('settingsChanged',this.settingsChanged);this.frame?.remove();this.visual?.remove();this.host.remove();}
}
