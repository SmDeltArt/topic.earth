// The page paints clock hands because SVG favicon images cannot run scripts.
(() => {
  const state={managing:true,timer:null,clock:'local',start:performance.now(),tick:0,latestFrame:'',initialized:false};
  const canvas=document.createElement('canvas');canvas.width=canvas.height=64;
  const context=canvas.getContext('2d');const earth=new Image();let icon;
  function hand(angle,length,width,color,tail){
    context.save();context.translate(32,32);context.rotate(angle*Math.PI/180);context.strokeStyle=color;context.lineWidth=width;context.lineCap='round';
    context.beginPath();context.moveTo(0,tail);context.lineTo(0,-length);context.stroke();context.restore();
  }
  function update(){
    if(!context||!earth.complete||!earth.naturalWidth||!icon)return;
    const now=state.clock==='automatic'?new Date((performance.now()-state.start)*100):new Date();
    const seconds=state.clock==='automatic'?now.getUTCSeconds():now.getSeconds();
    const minutes=(state.clock==='automatic'?now.getUTCMinutes():now.getMinutes())+seconds/60;
    const hours=((state.clock==='automatic'?now.getUTCHours():now.getHours())%12)+minutes/60;
    context.clearRect(0,0,64,64);context.save();context.beginPath();context.arc(32,32,30.25,0,Math.PI*2);context.clip();context.drawImage(earth,1.75,1.75,60.5,60.5);context.restore();
    const gradient=context.createLinearGradient(0,0,64,64);gradient.addColorStop(0,'#00d4ff');gradient.addColorStop(.48,'#39ff88');gradient.addColorStop(1,'#ff3030');
    context.strokeStyle=gradient;context.lineWidth=1.75;context.beginPath();context.arc(32,32,31.125,0,Math.PI*2);context.stroke();
    hand(hours*30,14.5,2.25,'#39ff88',1);hand(minutes*6,22.75,1.25,'#00d4ff',1.75);hand(seconds*6,23.75,.75,'#ff3030',3);
    context.fillStyle='#05070a';context.strokeStyle='#ffffffdb';context.lineWidth=.625;context.beginPath();context.arc(32,32,2.5,0,Math.PI*2);context.fill();context.stroke();
    try{state.latestFrame=canvas.toDataURL('image/png');icon.type='image/png';icon.href=state.latestFrame;state.tick++;}catch(error){console.warn('[TopicFavicon] Keeping SVG fallback:',error);}
  }
  function resume(){
    if(state.timer){clearInterval(state.timer);state.timer=null;}update();
    if(!document.hidden)state.timer=setInterval(update,window.matchMedia?.('(prefers-reduced-motion: reduce)').matches?30000:(state.clock==='automatic'?100:1000));
  }
  function init(){
    if(state.initialized)return;icon=document.querySelector('link[data-topic-favicon]');if(!icon||!context)return;
    state.initialized=true;icon.dataset.topicClockManaged='true';earth.onload=resume;
    earth.src=new URL(icon.dataset.earthSrc||'./assets/logo/local/earth-128.svg',location.href).href;
    document.addEventListener('visibilitychange',resume);
  }
  window.TopicFavicon={init,isManaging:()=>state.managing,getState:()=>({clock:state.clock,tick:state.tick,managing:state.managing,hasLatestFrame:!!state.latestFrame}),setClockMode(mode){state.clock=mode==='automatic'?'automatic':'local';state.start=performance.now();resume();}};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
