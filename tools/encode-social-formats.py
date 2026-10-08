"""Stream native SVG raster frames into FFmpeg; preserve exact output sizes."""
from pathlib import Path
import datetime
import json
import os
import subprocess
import sys

root = Path(__file__).resolve().parents[1]
out = root / 'assets/logo/social/formats'
items = json.loads((out / 'manifest.json').read_text())
if '--sample' in sys.argv:
    items = [item for item in items if item['name'] == 'topic-earth-social-1200x630-local']
captured = datetime.datetime.now(datetime.timezone.utc).isoformat()
env = {**os.environ, 'TOPIC_EXPORT_CAPTURED_AT': captured}
for index, item in enumerate(items):
    prefix = str(out / item['name'])
    renderer = subprocess.Popen(['node', str(root / 'tools/export-social-formats.cjs'), '--raw', '--name=' + item['name']], cwd=root, env=env, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    args = [r'C:/ffmpeg/bin/ffmpeg.exe', '-y', '-loglevel', 'error', '-f', 'rawvideo', '-pixel_format', 'rgba', '-video_size', f"{item['width']}x{item['height']}", '-framerate', '8', '-i', 'pipe:0',
        '-filter_complex_threads', '1', '-filter_complex', '[0:v]split[g1][g2];[g1]palettegen=stats_mode=single:max_colors=128:reserve_transparent=1[p];[g2][p]paletteuse=new=1:dither=bayer:bayer_scale=3[g]',
        '-map', '0:v', '-an', '-c:v', 'libvpx-vp9', '-threads', '2', '-deadline', 'realtime', '-cpu-used', '6', '-row-mt', '1', '-pix_fmt', 'yuva420p', '-auto-alt-ref', '0', '-crf', '30', '-b:v', '0', prefix + '.webm',
        '-map', '0:v', '-an', '-c:v', 'libwebp_anim', '-quality', '82', '-compression_level', '4', '-loop', '0', '-pix_fmt', 'yuva420p', prefix + '.webp',
        '-map', '[g]', '-an', '-loop', '0', prefix + '.gif']
    encoder = subprocess.Popen(args, stdin=renderer.stdout, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)
    renderer.stdout.close()
    renderer.stdout = None
    error = encoder.communicate()[1].decode(errors='replace')
    render_error = renderer.communicate()[1].decode(errors='replace')
    if encoder.returncode or renderer.returncode:
        raise RuntimeError(error + render_error)
    print(f"[{index+1}/{len(items)}] PNG / WebP / GIF / WebM: {item['name']}", flush=True)

(out / 'export-info.json').write_text(json.dumps({'capturedAt':captured, 'localTimeZone':'Europe/Brussels', 'durationSeconds':24, 'fps':8, 'automaticClock':'One simulated minute per 600 ms', 'animation':'Four six-second themes; clocks reset when a recorded loop repeats.', 'formats':['svg','png','webp','gif','webm'], 'count':len(items)}, indent=2))
