"""Create image-safe SVGs and the small social/PWA compatibility fallbacks."""
from pathlib import Path
from PIL import Image
import base64
import io
import re
import shutil
import xml.etree.ElementTree as ET

root = Path(__file__).resolve().parents[1]
runtime = root / 'assets/logo/local'
runtime.mkdir(exist_ok=True)
source = root / 'assets/logo/generated/earth-rotate/topic-earth-logo-earth-rotate-512.webp'
if source.exists():
    earth = Image.open(source)
else:
    encoded = re.search(r'data:image/webp;base64,([^"\s]+)', (runtime / 'earth-512.svg').read_text())[1]
    earth = Image.open(io.BytesIO(base64.b64decode(encoded)))
all_frames=[]
for index in range(earth.n_frames):
    earth.seek(index); all_frames.append(earth.convert('RGBA').copy())
for size in [128,512]:
    frames=[im.resize((size,size),Image.Resampling.LANCZOS) for im in all_frames]
    data=io.BytesIO()
    frames[0].save(data,format='WEBP',save_all=True,append_images=frames[1:],duration=125,loop=0,background=(0,0,0,0),quality=88,method=4)
    encoded=base64.b64encode(data.getvalue()).decode()
    (runtime / f'earth-{size}.svg').write_text(f'<svg xmlns="http://www.w3.org/2000/svg" width="{size}" height="{size}" viewBox="0 0 {size} {size}"><title>topic.earth rotating Earth</title><image width="{size}" height="{size}" href="data:image/webp;base64,{encoded}"/></svg>',encoding='utf-8')

formats=root / 'assets/logo/social/formats'
# Preserve compatibility fallbacks when optional raster exports are absent.
if (formats / 'topic-earth-social-1200x630-local.png').exists():
    shutil.copy2(formats / 'topic-earth-social-1200x630-local.png',runtime / 'social-card-1200x630.png')
if (formats / 'topic-earth-favicon-512-local.png').exists():
    mark=Image.open(formats / 'topic-earth-favicon-512-local.png').convert('RGBA')
    for size in [192,512,180]:
        canvas=Image.new('RGBA',(size,size),'#071019')
        icon=mark.resize((round(size*.78),round(size*.78)),Image.Resampling.LANCZOS)
        offset=(size-icon.width)//2;canvas.alpha_composite(icon,(offset,offset))
        canvas.convert('RGB').save(runtime / (f'pwa-{size}.png' if size!=180 else 'apple-touch-180.png'))
if (formats / 'topic-earth-favicon-local.ico').exists():
    shutil.copy2(formats / 'topic-earth-favicon-local.ico',runtime / 'favicon.ico')
if (formats / 'topic-earth-favicon-64-local.png').exists():
    data=base64.b64encode((formats / 'topic-earth-favicon-64-local.png').read_bytes()).decode()
    (runtime / 'favicon.svg').write_text(f'<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><title>topic.earth Earth clock</title><image width="64" height="64" href="data:image/png;base64,{data}"/></svg>',encoding='utf-8')

ns='http://www.w3.org/2000/svg'
ET.register_namespace('',ns)
ET.register_namespace('xlink','http://www.w3.org/1999/xlink')
banner=ET.parse(root / 'assets/logo/local/topic-earth-social-banner-1200x630-animated.svg').getroot()
for node in list(banner):
    if node.tag.rsplit('}',1)[-1] not in ['defs','style','title','desc'] and node.get('id')!='logoBlock':banner.remove(node)
banner.set('width','848');banner.set('height','160');banner.set('viewBox','176 98 848 160')
logo=next(n for n in banner.iter() if n.get('id')=='logoBlock')
for parent in logo.iter():
    for node in list(parent):
        if node.get('id')=='modeLabel':parent.remove(node)
        elif node.tag.endswith('foreignObject'):
            poster=next(n.get('poster') for n in node.iter() if n.tag.endswith('video'))
            picture=ET.Element('{'+ns+'}image',{**node.attrib,'href':poster})
            parent.insert(list(parent).index(node),picture);parent.remove(node)
ET.ElementTree(banner).write(runtime / 'brand-header.svg',encoding='utf-8',xml_declaration=True)
print('Built SVG Earth textures, header, favicon and social/PWA fallbacks.')
