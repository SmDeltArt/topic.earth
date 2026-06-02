"""
Blender helper: import a GLB, resize every image texture to 50%, and export a new GLB.

Open this file inside Blender's Text Editor and press Run Script.
It uses Blender only; no PIL/Pillow dependency.
"""

from __future__ import annotations

from pathlib import Path

import bpy


INPUT_GLB = Path(
    r"C:\Users\bedes\OneDrive\SmDeltArt_Collection\__actual_vs\topic.earth\assets\models\solar-system.glb"
)
OUTPUT_GLB = Path(
    r"C:\Users\bedes\OneDrive\SmDeltArt_Collection\__actual_vs\topic.earth\assets\models\solar-system.textures-0.5.blender.glb"
)
TEXTURE_SCALE = 0.5


def file_mb(path: Path) -> float:
    return path.stat().st_size / (1024 * 1024)


def reset_scene() -> None:
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete()

    for datablock_group in (
        bpy.data.meshes,
        bpy.data.materials,
        bpy.data.images,
        bpy.data.textures,
    ):
        for datablock in list(datablock_group):
            if datablock.users == 0:
                datablock_group.remove(datablock)


def resize_images() -> None:
    for image in list(bpy.data.images):
        if image.type != "IMAGE":
            continue
        if image.size[0] <= 1 or image.size[1] <= 1:
            continue

        old_width, old_height = image.size
        new_width = max(1, int(old_width * TEXTURE_SCALE))
        new_height = max(1, int(old_height * TEXTURE_SCALE))

        if new_width == old_width and new_height == old_height:
            continue

        print(f"[Texture] {image.name}: {old_width}x{old_height} -> {new_width}x{new_height}")
        image.scale(new_width, new_height)

        # Keep the resized pixels embedded in the exported GLB.
        if not image.packed_file:
            image.pack()


def export_glb() -> None:
    OUTPUT_GLB.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.export_scene.gltf(
        filepath=str(OUTPUT_GLB),
        export_format="GLB",
        export_yup=True,
        export_apply=True,
        export_animations=True,
        export_skins=True,
        export_morph=True,
    )


def main() -> None:
    if not INPUT_GLB.exists():
        raise FileNotFoundError(f"Input not found: {INPUT_GLB}")

    print(f"[GLB] Input:  {INPUT_GLB}")
    print(f"[GLB] Output: {OUTPUT_GLB}")
    print(f"[GLB] Before: {file_mb(INPUT_GLB):.2f} MB")

    reset_scene()
    bpy.ops.import_scene.gltf(filepath=str(INPUT_GLB))

    resize_images()
    export_glb()

    print(f"[GLB] After:  {file_mb(OUTPUT_GLB):.2f} MB")
    print("[GLB] Done. Inspect visually before replacing the original model.")


main()
