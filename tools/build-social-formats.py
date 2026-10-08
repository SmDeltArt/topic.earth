"""Build portable SVG social masters and lossless Earth frames for raster export."""
from pathlib import Path
import copy
import io
import base64
import sys
import subprocess
import json
import re
import xml.etree.ElementTree as ET
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SOCIAL = ROOT / 'assets/logo/social'
OUT = SOCIAL / 'formats'
SVG = 'http://www.w3.org/2000/svg'
ET.register_namespace('', SVG)
ET.register_namespace('xlink', 'http://www.w3.org/1999/xlink')
ET.register_namespace('html', 'http://www.w3.org/1999/xhtml')
ns = {'s': SVG}


def load(name):
    return ET.parse(ROOT / 'assets/logo/local' / name).getroot()


def by_id(root, name):
    return next(node for node in root.iter() if node.get('id') == name)


def wrap_contents(root, transform):
    group = ET.Element(f'{{{SVG}}}g', {'transform': transform})
    for child in list(root):
        if child.tag.rsplit('}', 1)[-1] not in ('defs', 'style', 'title', 'desc', 'script') and child.get('class') != 'bg':
            root.remove(child)
            group.append(child)
    root.insert(len(root) - 1, group)


OUT.mkdir(exist_ok=True)
earth_data = re.search(r'data:image/webp;base64,([^"\s]+)', (ROOT / 'assets/logo/local/earth-512.svg').read_text(encoding='utf-8'))[1]
earth = Image.open(io.BytesIO(base64.b64decode(earth_data)))
if '--raster-frames' in sys.argv:
    frames = SOCIAL / '.export-earth-frames'
    frames.mkdir(exist_ok=True)
    for index in range(earth.n_frames):
        earth.seek(index)
        earth.convert('RGBA').save(frames / f'{index:03}.png')

banner = load('topic-earth-social-banner-1200x630-animated.svg')
square = load('topic-earth-social-logo-512-animated.svg')
clock = load('topic-earth-clock-transparent-512-animated.svg')
specs = []
for width, height in [(1920, 1080), (1500, 500), (1200, 630), (1080, 1920), (1080, 1080), (512, 512), (256, 256)]:
    if width == height:
        root = copy.deepcopy(square)
    elif (width, height) == (1920, 1080):
        root = copy.deepcopy(banner)
        wrap_contents(root, 'translate(0 36) scale(1.6)')
        root.set('viewBox', '0 0 1920 1080')
        root.find("s:rect[@class='bg']", ns).set('width', '1920')
        root.find("s:rect[@class='bg']", ns).set('height', '1080')
    elif (width, height) == (1500, 500):
        root = copy.deepcopy(banner)
        root.set('viewBox', '0 0 1500 500')
        bg = root.find("s:rect[@class='bg']", ns)
        bg.set('width', '1500'); bg.set('height', '500')
        by_id(root, 'logoBlock').set('transform', 'translate(-144 60)')
        by_id(root, 'infoBlock').set('transform', 'translate(736 -85) scale(.7)')
        badge = root.find("s:svg[@class='os-badge']", ns)
        for key, value in {'x':1082.5, 'y':281.8, 'width':147, 'height':25.2}.items():
            badge.set(key, str(value))
        # The badge's y coordinate follows the transformed information frame.
        badge.set('y', str(524 * .7 - 85))
    elif (width, height) == (1080, 1920):
        root = copy.deepcopy(square)
        wrap_contents(root, 'translate(0 120) scale(2.109375)')
        root.set('viewBox', '0 0 1080 1920')
        bg = root.find("s:rect[@class='bg']", ns)
        bg.set('width', '1080'); bg.set('height', '1920')
        info = copy.deepcopy(by_id(banner, 'infoBlock'))
        info.set('transform', 'translate(-174 920) scale(1.2)')
        root.insert(len(root) - 1, info)
        style = root.find('s:style', ns)
        banner_css = banner.find('s:style', ns).text
        for selector in ['info-panel', 'headline', 'info', 'info-muted', 'bar', 'chip', 'chip-text']:
            style.text += '\n' + re.search(r'\.' + selector + r' \{[^}]*\}', banner_css)[0]
    else:
        root = copy.deepcopy(banner)
    specs.append((f'topic-earth-social-{width}x{height}', width, height, root))

for size in [512, 256, 128, 64, 32]:
    specs.append((f'topic-earth-favicon-{size}', size, size, copy.deepcopy(clock)))

manifest = []
for name, width, height, master in specs:
    master.set('width', str(width)); master.set('height', str(height))
    title = master.find('s:title', ns)
    desc = master.find('s:desc', ns)
    for kind in ['local', 'automatic']:
        root = copy.deepcopy(master)
        root.set('data-clock', kind)
        root.find('s:title', ns).text = f'topic.earth {width} × {height} — {kind} clock'
        root.find('s:desc', ns).text = f'Embedded transparent rotating Earth; {kind} clock.' + ('' if name.startswith('topic-earth-favicon') else ' Four topic.earth palettes.')
        for style in root.findall('s:style', ns):
            style.text = style.text.replace('vector-effect: non-scaling-stroke;', '')
        script = root.find('s:script', ns)
        script.text = script.text.replace('Math.floor(Math.random() * modes.length)', '0').replace('6200', '6000')
        if (width, height) == (1080, 1920):
            copy_text = {
                'world':['World Update','Live Earth signals, climate layers, topic intelligence.','Worldwide context for weather, climate, and public data.'],
                'regional':['Regional Dashboard','Local initiatives, evidence, and climate signals.','Track places, compare updates, turn observations into topics.'],
                'space':['Space Watch','Atmosphere missions, orbital context, Earth observation.','Aura, OCO-2, PACE, ozone, and climate imagery.'],
                'fever':['Fever Simulation','Tipping points, scenarios, planetary risk signals.','Explore heat, feedback loops, and transition paths.']
            }
            statement = 'if (label) label.textContent = mode === "fever" ? "fever scenario" : mode;'
            script.text = script.text.replace(statement, statement + '\n        const copy = ' + json.dumps(copy_text) + '[mode];\n        ["headline", "infoLineA", "infoLineB"].forEach((id, i) => document.getElementById(id).textContent = copy[i]);')
        if kind == 'automatic':
            script.text = script.text.replace('function setHands() {', 'const clockStart = performance.now();\n      function setHands() {')
            script.text = script.text.replace('const now = new Date();', 'const now = new Date((performance.now() - clockStart) * 100);')
            for component in ['Seconds', 'Minutes', 'Hours']:
                script.text = script.text.replace(f'now.get{component}()', f'now.getUTC{component}()')
        filename = f'{name}-{kind}.svg'
        ET.ElementTree(root).write(OUT / filename, encoding='utf-8', xml_declaration=True)
        manifest.append({'name':f'{name}-{kind}', 'width':width, 'height':height, 'clock':kind, 'svg':filename, 'favicon':name.startswith('topic-earth-favicon')})
(OUT / 'manifest.json').write_text(json.dumps(manifest, indent=2), encoding='utf-8')
subprocess.run([sys.executable, str(ROOT / 'tools/localize_social_svgs.py')], check=True)
print(f'Built {len(manifest)} portable SVG masters.')
