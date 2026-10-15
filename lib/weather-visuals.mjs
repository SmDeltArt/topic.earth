import {getMeteoBadge,meteoMetricLines} from './meteo-realtime.js?v=weather-terrain-20261015';

const CLOUD='<path d="M18 39h39a12 12 0 0 0 0-24 17 17 0 0 0-32-3 13 13 0 0 0-7 27Z" fill="currentColor" fill-opacity=".18"/>';
const SHAPES={
  cloud:CLOUD,
  rain:CLOUD+'<path d="m25 46-4 9m18-9-4 9m18-9-4 9"/>',
  storm:CLOUD+'<path d="m40 41-9 13h9l-5 10 17-16H42l6-7"/>',
  wind:'<path d="M8 23h40c15 0 15-18 3-18-8 0-10 7-7 10M8 34h54c15 0 15 19 3 19-8 0-10-7-7-10M8 45h25c12 0 12 16 1 16"/>',
  snow:CLOUD+'<path d="M39 44v19m-8-14 16 10m-16 0 16-10"/>',
  fog:CLOUD+'<path d="M14 47h48M20 55h44"/>',
  sun:'<circle cx="39" cy="31" r="13" fill="currentColor" fill-opacity=".2"/><path d="M39 6v7m0 36v7M14 31h7m36 0h7M21 13l5 5m26 26 5 5m0-36-5 5M26 44l-5 5"/>',
  heat:'<path d="M34 39V14a7 7 0 0 1 14 0v25a13 13 0 1 1-14 0Z"/><path d="M41 20v29"/><circle cx="41" cy="50" r="5" fill="currentColor"/>'
};
export function weatherSymbol(point={}) {
 const badge=getMeteoBadge(point);
 const key=point.eventType==='heat-anomaly'?'heat':({Thunderstorm:'storm','Heavy rain':'rain',Rain:'rain',Wind:'wind','Snow / ice':'snow',Fog:'fog',Clear:'sun'})[badge.label] || 'cloud';
 return {...badge,key};
}
export function weatherSymbolSvg(point={}) {
 const {key,color}=weatherSymbol(point);
 const safeColor=/^#[0-9a-f]{6}$/i.test(color)?color:'#81c784';
 return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 68" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="color:${safeColor}" aria-hidden="true">${SHAPES[key]}</svg>`;
}
export function weatherPreviewHtml(point={},escape=String) {
 const badge=weatherSymbol(point), lines=meteoMetricLines(point);
 return `<div class="weather-vector-preview">${weatherSymbolSvg(point)}<strong>${escape(badge.label)}</strong>${lines.map(line=>`<span>${escape(line)}</span>`).join('')}<small>${escape(point.isAutoMeteoEvent?'Fetched-window signal':'Current model conditions')}</small></div>`;
}
