"""Validate and package the complete social export set for local download."""
from pathlib import Path
import json
import subprocess
import xml.etree.ElementTree as ET
from zipfile import ZipFile, ZIP_DEFLATED
from PIL import Image, ImageDraw

root = Path(__file__).resolve().parents[1]
out = root / 'assets/logo/social/formats'
manifest = json.loads((out / 'manifest.json').read_text())
ns = {'s':'http://www.w3.org/2000/svg', 'h':'http://www.w3.org/1999/xhtml'}
for item in manifest:
    expected = (item['width'], item['height'])
    for ext in ['png','webp','gif']:
        with Image.open(out / f"{item['name']}.{ext}") as im:
            assert im.size == expected, (item['name'],ext,im.size)
            if ext != 'png':
                assert im.n_frames == 192, (item['name'],ext,im.n_frames)
                assert im.info.get('loop') == 0
            if item['favicon'] and ext == 'png':
                assert im.convert('RGBA').getpixel((0,0))[3] == 0
    svg = ET.parse(out / item['svg']).getroot()
    assert (int(svg.get('width')), int(svg.get('height'))) == expected
    assert svg.get('data-clock') == item['clock']
    assert svg.find('.//h:source',ns).get('src').startswith('data:video/webm;base64,')
    for script in svg.findall('s:script',ns):
        subprocess.run(['node','--check'],input=script.text,text=True,check=True,capture_output=True)
    item['files'] = {ext:(out / f"{item['name']}.{ext}").stat().st_size for ext in ['svg','png','webp','gif','webm']}
    assert all(item['files'].values())

# Decode an alpha WebM with the alpha-capable VP9 decoder.
sample = out / 'topic-earth-favicon-128-automatic.webm'
decoded = subprocess.run([r'C:/ffmpeg/bin/ffmpeg.exe','-v','error','-c:v','libvpx-vp9','-i',str(sample),'-frames:v','1','-f','rawvideo','-pix_fmt','rgba','pipe:1'],check=True,capture_output=True).stdout
assert len(decoded) == 128 * 128 * 4 and decoded[3] == 0
(out / 'manifest.json').write_text(json.dumps(manifest,indent=2),encoding='utf-8')

for clock in ['local','automatic']:
    with Image.open(out / f'topic-earth-favicon-512-{clock}.png') as icon:
        icon.save(out / f'topic-earth-favicon-{clock}.ico',sizes=[(16,16),(32,32),(48,48),(64,64),(128,128),(256,256)])

canvas = Image.new('RGB',(1200,1000),'#070a12')
draw = ImageDraw.Draw(canvas)
sizes = ['1920x1080','1500x500','1200x630','1080x1920','1080x1080','512x512','256x256']
for index,size in enumerate(sizes):
    with Image.open(out / f'topic-earth-social-{size}-local.png') as im:
        im.thumbnail((370,260)); x=(index%3)*400+15; y=(index//3)*320+30
        canvas.paste(im,(x,y),im); draw.text((x,y-20),size,fill='white')
with Image.open(out / 'topic-earth-favicon-128-local.png') as im:
    canvas.paste(im,(420,720),im)
draw.text((420,690),'Transparent Earth-only favicon',fill='white')
canvas.save(out / 'formats-contact-sheet.png')

readme = '''topic.earth social export library

Social: 1920x1080, 1500x500, 1200x630, 1080x1920, 1080x1080, 512x512, 256x256.
Earth-only favicons: 512, 256, 128, 64 and 32 px. ICO contains 16-256 px.
Every size has local-time and automatic-clock versions.

SVG: self-contained editable master with embedded transparent Earth WebM.
Open directly or in an HTML object to run its scripts and video.
PNG: still image from the start of the recording.
WebP / GIF / WebM: 24 seconds at 8 fps. Social designs show all four themes.
Automatic clock: one simulated minute per 600 ms, starting at 12:00.
Local recording: Europe/Brussels time at capturedAt in export-info.json.
Recorded clocks reset when the animation repeats. SVG clocks continue live.
Favicon PNG, WebP and WebM preserve alpha; GIF has binary transparency.

Regenerate from the checkout:
python tools/build-social-formats.py
python tools/encode-social-formats.py
python tools/package-social-formats.py
'''
(out / 'README.txt').write_text(readme,encoding='utf-8')
for clock in ['local','automatic']:
    with ZipFile(out / f'topic-earth-social-{clock}.zip','w',compression=ZIP_DEFLATED,compresslevel=1) as archive:
        for item in manifest:
            if item['clock'] == clock:
                for ext in ['svg','png','webp','gif','webm']:
                    filename = f"{item['name']}.{ext}"; archive.write(out / filename,filename)
        for filename in ['README.txt','export-info.json','formats-contact-sheet.png',f'topic-earth-favicon-{clock}.ico']:
            archive.write(out / filename,filename)

# Remove only the exact intermediate frames created by build-social-formats.py.
frames = root / 'assets/logo/social/.export-earth-frames'
assert frames.resolve().is_relative_to((root / 'assets/logo/social').resolve())
for index in range(48):
    (frames / f'{index:03}.png').unlink(missing_ok=True)
frames.rmdir()
print(f'Validated {len(manifest)} complete sets: SVG, PNG, WebP, GIF and WebM; packaged both clock modes.',flush=True)
