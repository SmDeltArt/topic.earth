// Validate the static local artwork before giving it to an <object>. This is a
// deliberately restricted SVG profile; no active content or external resources.
export function validateSvgDocument(doc) {
  if(doc.querySelector('parsererror') || doc.doctype || doc.documentElement.namespaceURI!=='http://www.w3.org/2000/svg') throw Error('Invalid SVG XML');
  const ids=new Set(),references=[];
  for(const node of doc.querySelectorAll('*')){
    if(['script','foreignobject','iframe','object','embed','image','audio','video','animate','set'].includes(node.localName.toLowerCase())) throw Error(`Unsupported active SVG element: ${node.localName}`);
    if(node.id){if(ids.has(node.id))throw Error(`Duplicate SVG ID: ${node.id}`);ids.add(node.id);}
    if(node.localName==='style' && /@import|url\(\s*["']?(?!#)/i.test(node.textContent)) throw Error('External SVG style');
    for(const attribute of node.attributes){
      const value=attribute.value;
      if(/^on/i.test(attribute.localName))throw Error('SVG event handler');
      if(attribute.localName==='href'){
        if(!value.startsWith('#'))throw Error('External SVG dependency');references.push(decodeURIComponent(value.slice(1)));
      }
      for(const match of value.matchAll(/url\(\s*["']?([^)'"\s]+)["']?\s*\)/g)){
        if(!match[1].startsWith('#'))throw Error('External SVG URL');references.push(decodeURIComponent(match[1].slice(1)));
      }
    }
  }
  const walker=doc.createTreeWalker(doc,64);while(walker.nextNode())if(walker.currentNode.target==='xml-stylesheet')throw Error('External SVG stylesheet');
  for(const ref of references)if(!ids.has(ref))throw Error(`Broken SVG reference: ${ref}`);
  return {ids:ids.size,references:references.length};
}
export async function safeSvgDocument(url){
  const response=await fetch(url);if(!response.ok)throw Error('SVG unavailable');
  const text=await response.text(),doc=new DOMParser().parseFromString(text,'image/svg+xml');
  validateSvgDocument(doc);
  return doc;
}
export async function safeSvgUrl(url){
  const doc=await safeSvgDocument(url);
  return URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(doc)],{type:'image/svg+xml'}));
}
