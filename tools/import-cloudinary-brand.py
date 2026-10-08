"""Map explicit Cloudinary export URLs; never infer URLs or clock mode from folder order."""
from pathlib import Path
import csv
import json
import re
import shutil
import subprocess
import sys
from urllib.parse import urlparse

root = Path(__file__).resolve().parents[1]
social = root / 'assets/logo/social'
local = root / 'assets/logo/local'
local.mkdir(exist_ok=True)
assets = {}
sources = []
for filename in sys.argv[1:]:
    rows = list(csv.DictReader(Path(filename).open(encoding='utf-8-sig', newline='')))
    sources.append({'file': Path(filename).name, 'rows': len(rows)})
    for row in rows:
        match = re.fullmatch(r'(topic-earth-(?:social-\d+x\d+|favicon-\d+)-(local|automatic))(?:_[\w-]+)?', row['filename'])
        if not match or row['format'] not in ['svg','png','webp','webm','gif']:
            continue
        url = urlparse(row['url'])
        assert url.scheme == 'https' and url.netloc == 'res.cloudinary.com'
        entry = assets.setdefault(match[1], {'clock': match[2], 'urls': {}})
        prior = entry['urls'].get(row['format'])
        assert not prior or prior == row['url'], f'Conflicting URL: {match[1]} {row["format"]}'
        entry['urls'][row['format']] = row['url']
additional = social / 'cloudinary-additional.json'
if additional.exists():
    for name, item in json.loads(additional.read_text()).items():
        assets.setdefault(name, {'clock': item['clock'], 'urls': {}})['urls'].update(item['urls'])
archive = root / 'local-asset-archive/20261008-social-cleanup/assets/logo/social/formats'
for clock in ['local','automatic']:
    for name in [f'topic-earth-social-512x512-{clock}', f'topic-earth-favicon-64-{clock}']:
        for extension in ['webp','webm','gif','png']:
            source = archive / f'{name}.{extension}'
            target = local / source.name
            if not target.exists():
                shutil.copy2(source, target)
            if extension == 'gif' and target.stat().st_size > 5 * 1024**2:
                encoder = shutil.which('ffmpeg') or 'C:/ffmpeg/bin/ffmpeg.exe'
                subprocess.run([encoder, '-y', '-loglevel', 'error', '-i', str(source),
                    '-filter_complex_threads', '1', '-filter_complex',
                    '[0:v]fps=4,split[a][b];[a]palettegen=max_colors=128[p];[b][p]paletteuse=dither=bayer:bayer_scale=4',
                    '-loop', '0', str(target)], check=True)
catalog = {'sources': sources, 'assets': assets, 'standards': {'logo':'social-512x512','favicon':'favicon-64'},
           'cloudClockModes': sorted({a['clock'] for a in assets.values()}),
           'notes': ['Raster local clocks show the captured export time. Live time requires the SVG/page clock.',
                     'Raster artwork is English; browser language selection translates the preview UI and live SVGs.']}
(social / 'cloudinary-assets.json').write_text(json.dumps(catalog, indent=2), encoding='utf-8')
manifest_file = social / 'formats/manifest.json'
if manifest_file.exists():
    items = json.loads(manifest_file.read_text())
    for item in items:
        item.pop('files', None)
        item['svg'] = assets.get(item['name'], {}).get('urls', {}).get('svg')
    manifest_file.write_text(json.dumps(items, indent=2), encoding='utf-8')
print(f'Mapped {len(assets)} designs, {sum(len(a["urls"]) for a in assets.values())} URLs; cloud clock modes: {catalog["cloudClockModes"]}')
