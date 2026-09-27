# topic.earth asset audit — 27 September 2026

The `assets/` tree on `main` held 845 files totaling about 770 MB before this cleanup. Counts and sizes use GitHub tree metadata (decimal MB). This is a deployment-tree review, not a rewrite of Git history.

| Area | Files | Approx. size | Decision |
| --- | ---: | ---: | --- |
| `assets/models/` | 112 | 543.7 MB | Keep active models, planetary maps, textures and Blender source; remove the archived GLB set and two `.blend1` backups below. |
| `assets/logo/` | 676 | 104.2 MB | Keep editable SVG/HTML, published logos and the runtime clock WebP; remove generated intermediate frame PNGs below. |
| `assets/textures/` | 28 | 89.8 MB | Keep. The globe and Fever Loop reference these paths, with local fallback behind Cloudinary delivery. |
| `assets/social/` | 16 | 29.4 MB | Keep. These are publication, README and social-preview material, not solely runtime media. |
| Other asset areas | 13 | 2.9 MB | Keep fonts, icons, audio cache and provenance records. |

## Removed from the deployed tree

| Paths | Files | Approx. size | Reason |
| --- | ---: | ---: | --- |
| `assets/logo/generated/**/frames/*.png` | 600 | 49.3 MB | Intermediate animation frames. The output WebP/GIF/MP4 and editable logo source remain; `TopBar` uses `assets/logo/generated/earth-rotate/topic-earth-logo-earth-rotate-128.webp`. |
| `assets/models/_solar-system-archive-20260603/*.glb` | 12 | 207.5 MB | Explicitly archived versions. The active `solar-system.glb` and `solar-system.real-orbits.linked.glb` remain. |
| `assets/models/*.blend1` | 2 | 2.0 MB | Blender automatic backup files; corresponding `.blend` project files remain. |

Total removed: **614 files, about 258.8 MB**. The final tree still includes these files in earlier Git commits; repository history size does not shrink.

## How references were checked

Searched current application HTML, JS, CSS, data, components, `lib/`, API code, README files and asset manifests for these exact paths and directory patterns. No runtime reference to the removed frame directory, archive directory or `.blend1` files was found. External links to a removed historic asset URL would now return 404; the files can be restored from the previous Git commit.

## Retained for review

- `assets/models/our.earth_textures_*` contains copies of some `assets/textures/` files, but also distinct files and potential model-source dependencies. Keep until their source and glTF use are mapped.
- Social GIF/WebP variants and Cloudinary export CSVs are retained because README and publication workflows reference them or may need their provenance.
- Planetary `scene.bin`, textures and model source files are retained. Dynamic model loading and editing workflows make filename-only pruning unsafe.
- The project needs a separate decision on moving Blender sources and large historical media outside the deployed static tree. That would change authoring paths and possibly existing public links.
