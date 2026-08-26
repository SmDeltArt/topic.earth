"""
Blender 5 helper: create a lighter copy of solar-system2.glb.

Open this file inside Blender and press Run Script.
It does not overwrite the original.
"""

from pathlib import Path
import math

import bpy


MODEL_DIR = Path(
    r"C:\Users\bedes\SmDeltArt_Collection\_Y__ourEarth\_actual_vs_y1"
)
INPUT_GLB = MODEL_DIR / "solar-system2.glb"
OUTPUT_GLB = MODEL_DIR / "solar-system2.optimized.glb"

# Start gentle. If the file is still too big, try 0.94, then 0.92.
DECIMATE_RATIO = 0.96


def file_mb(path: Path) -> float:
    return path.stat().st_size / (1024 * 1024)


def reset_scene() -> None:
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete()


def optimize_mesh(obj: bpy.types.Object) -> None:
    if obj.type != "MESH":
        return

    bpy.ops.object.select_all(action="DESELECT")
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)

    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.mesh.remove_doubles(threshold=0.00001)
    bpy.ops.object.mode_set(mode="OBJECT")

    if 0 < DECIMATE_RATIO < 1 and len(obj.data.vertices) >= 250:
        modifier = obj.modifiers.new("gentle_decimate", "DECIMATE")
        modifier.ratio = DECIMATE_RATIO
        bpy.ops.object.modifier_apply(modifier=modifier.name)


def export_optimized_glb() -> None:
    OUTPUT_GLB.parent.mkdir(parents=True, exist_ok=True)

    bpy.ops.export_scene.gltf(
        filepath=str(OUTPUT_GLB),
        export_format="GLB",
        export_apply=True,
        export_yup=True,
        export_animations=True,
        export_skins=True,
        export_morph=True,
        export_draco_mesh_compression_enable=True,
        export_draco_mesh_compression_level=6,
        export_draco_position_quantization=14,
        export_draco_normal_quantization=10,
        export_draco_texcoord_quantization=12,
        export_draco_color_quantization=10,
        export_draco_generic_quantization=12,
    )


def main() -> None:
    if not INPUT_GLB.exists():
        raise FileNotFoundError(f"Input not found: {INPUT_GLB}")

    print(f"[GLB] Input:  {INPUT_GLB}")
    print(f"[GLB] Output: {OUTPUT_GLB}")
    print(f"[GLB] Before: {file_mb(INPUT_GLB):.2f} MB")

    reset_scene()
    bpy.ops.import_scene.gltf(filepath=str(INPUT_GLB))

    for obj in list(bpy.context.scene.objects):
        optimize_mesh(obj)

    export_optimized_glb()

    before = file_mb(INPUT_GLB)
    after = file_mb(OUTPUT_GLB)
    saved = before - after
    pct = 0 if math.isclose(before, 0) else saved / before * 100

    print(f"[GLB] After:  {after:.2f} MB")
    print(f"[GLB] Saved:  {saved:.2f} MB ({pct:.1f}%)")

    if after > 10:
        print("[GLB] Still above 10 MB: set DECIMATE_RATIO = 0.94 and run again.")
    else:
        print("[GLB] Under 10 MB. Inspect visually before replacing the app model.")


main()
