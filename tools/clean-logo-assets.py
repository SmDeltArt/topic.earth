"""Archive superseded branding and optional raster exports, preserving a restore log."""
from pathlib import Path
import hashlib
import json

root = Path(__file__).resolve().parents[1]
assets = (root / 'assets').resolve()
archive = (root / 'local-asset-archive/20261008-social-cleanup').resolve()
assert archive.is_relative_to(root) and not archive.is_relative_to(assets)
logo = assets / 'logo'
candidates = [p for p in logo.iterdir() if p.is_file() and p.name not in ['README.md', 'metadata.json']]
for folder in [logo / 'brand', logo / 'generated', assets / 'icons', assets / 'social']:
    if folder.exists():
        candidates.extend(p for p in folder.rglob('*') if p.is_file())
formats = logo / 'social/formats'
candidates.extend(p for p in formats.iterdir() if p.is_file() and p.suffix != '.svg' and p.name != 'manifest.json')
archive.mkdir(parents=True, exist_ok=True)
log = archive / 'restore-manifest.json'
records = json.loads(log.read_text()) if log.exists() else []
for source in sorted(set(candidates)):
    source = source.resolve()
    assert source.is_relative_to(assets)
    relative = source.relative_to(root)
    target = (archive / relative).resolve()
    assert target.is_relative_to(archive) and not target.exists(), target
    with source.open('rb') as stream:
        digest = hashlib.file_digest(stream, 'sha256').hexdigest()
    record = {'path': relative.as_posix(), 'bytes': source.stat().st_size, 'sha256': digest}
    target.parent.mkdir(parents=True, exist_ok=True)
    source.rename(target)
    records.append(record)
    log.write_text(json.dumps(records, indent=2), encoding='utf-8')
for folder in sorted(assets.rglob('*'), key=lambda p: len(p.parts), reverse=True):
    if folder.is_dir() and folder.resolve().is_relative_to(assets) and not any(folder.iterdir()):
        try:
            folder.rmdir()
        except PermissionError:
            pass  # Windows can retain a locked empty directory; no assets remain inside.
manifest = json.loads((formats / 'manifest.json').read_text())
for item in manifest:
    if item.get('svg') and not item['svg'].startswith('https:') and (formats / item['svg']).is_file():
        item['files'] = {'svg': (formats / item['svg']).stat().st_size}
(formats / 'manifest.json').write_text(json.dumps(manifest, indent=2), encoding='utf-8')
print(f'Archived {len(records)} files ({sum(r["bytes"] for r in records)/1024**2:.1f} MiB); kept {len(manifest)} SVG formats.')
