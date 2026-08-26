"""
Render a clean rotating topic.earth logo asset from a GLB in Blender.

Default input:
    assets/models/solar-system.real-orbits.linked.glb

Example from PowerShell, using a full Blender path if Blender is not on PATH:
    & "C:\\Program Files\\Blender Foundation\\Blender 4.3\\blender.exe" --background --python tools\\render_topic_earth_logo_blender.py -- --sizes 32,64,128,256,512 --frames 96 --make-mp4 --make-gif

The render is square, transparent, and contains no viewport grid, axes, cursor,
or UI overlays because it uses Blender's offline renderer.
"""

from __future__ import annotations

import argparse
import math
import shutil
import subprocess
import sys
from pathlib import Path

import bpy
from mathutils import Vector


PROJECT_ROOT = Path(r"C:\Users\bedes\OneDrive\SmDeltArt_Collection\__actual_vs\topic.earth")
DEFAULT_INPUT = PROJECT_ROOT / "assets" / "models" / "solar-system.real-orbits.linked.glb"
DEFAULT_OUTPUT = PROJECT_ROOT / "assets" / "logo" / "generated" / "earth-rotate"
DEFAULT_TEXTURE = PROJECT_ROOT / "assets" / "textures" / "fever" / "earth_2025_4k.png"
DEFAULT_FFMPEG = Path(r"C:\ffmpeg\bin\ffmpeg.exe")


def parse_args() -> argparse.Namespace:
    raw = sys.argv
    script_args = raw[raw.index("--") + 1 :] if "--" in raw else []
    parser = argparse.ArgumentParser(description="Render rotating Earth logo frames from a GLB.")
    parser.add_argument("--input", default=str(DEFAULT_INPUT), help="Input GLB/GLTF path.")
    parser.add_argument("--output", default=str(DEFAULT_OUTPUT), help="Output directory.")
    parser.add_argument("--earth-name", default="Earth", help="Object name/substring to isolate.")
    parser.add_argument("--texture", default=str(DEFAULT_TEXTURE), help="Optional Earth texture to apply before rendering.")
    parser.add_argument("--use-glb-earth", action="store_true", help="Use the Earth mesh from the input GLB instead of a clean generated sphere.")
    parser.add_argument("--sizes", default="32,64,128,256,512", help="Comma-separated square power-of-two sizes.")
    parser.add_argument("--frames", type=int, default=144, help="Frames for one 0-360 degree rotation.")
    parser.add_argument("--fps", type=int, default=24, help="Video/GIF frame rate.")
    parser.add_argument("--axis", choices=("x", "y", "z"), default="z", help="Local rotation axis.")
    parser.add_argument("--padding", type=float, default=1.18, help="Camera padding around Earth.")
    parser.add_argument("--samples", type=int, default=64, help="Cycles render samples.")
    parser.add_argument("--clock-hands", action="store_true", help="Overlay black symbolic clock hour/minute hands.")
    parser.add_argument("--clock-start-hour", type=float, default=0.0, help="Clock hour shown on the first frame.")
    parser.add_argument("--clock-hours-per-loop", type=float, default=1.0, help="Clock hours advanced during one Earth rotation loop; use 24 for a full-day clock.")
    parser.add_argument("--make-mp4", action="store_true", help="Create MP4 from largest frame set if ffmpeg is available.")
    parser.add_argument("--make-gif", action="store_true", help="Create GIF from largest frame set if ffmpeg is available.")
    parser.add_argument("--keep-scene", action="store_true", help="Render full imported scene instead of isolating Earth.")
    return parser.parse_args(script_args)


def reset_scene() -> None:
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete()
    for group in (bpy.data.meshes, bpy.data.materials, bpy.data.images, bpy.data.actions):
        for datablock in list(group):
            if datablock.users == 0:
                group.remove(datablock)


def import_glb(path: Path) -> None:
    if not path.exists():
        raise FileNotFoundError(f"Input not found: {path}")
    bpy.ops.import_scene.gltf(filepath=str(path))
    bpy.context.view_layer.update()


def resolve_project_path(path: str | Path) -> Path:
    resolved = Path(path)
    return resolved if resolved.is_absolute() else PROJECT_ROOT / resolved


def create_logo_sphere() -> bpy.types.Object:
    bpy.ops.mesh.primitive_uv_sphere_add(segments=128, ring_count=64, radius=1.0, location=(0, 0, 0))
    obj = bpy.context.object
    obj.name = "TopicEarthLogo_Earth"
    obj.data.name = "TopicEarthLogo_EarthMesh"
    return obj


def find_object(name: str) -> bpy.types.Object:
    normalized = name.lower()
    exact = bpy.data.objects.get(name)
    if exact:
        return exact

    candidates = [
        obj
        for obj in bpy.data.objects
        if normalized in obj.name.lower() and (obj.type == "MESH" or any(c.type == "MESH" for c in obj.children_recursive))
    ]
    if not candidates:
        raise RuntimeError(f'Could not find an Earth object matching "{name}".')
    candidates.sort(key=lambda obj: (obj.type != "MESH", len(obj.name), obj.name))
    return candidates[0]


def object_family(root: bpy.types.Object) -> set[bpy.types.Object]:
    family = {root, *root.children_recursive}
    parent = root.parent
    while parent:
        family.add(parent)
        parent = parent.parent
    return family


def isolate_objects(visible: set[bpy.types.Object]) -> None:
    for obj in bpy.data.objects:
        should_hide = obj not in visible and obj.type not in {"CAMERA", "LIGHT"}
        obj.hide_viewport = should_hide
        obj.hide_render = should_hide


def world_bbox(objects: set[bpy.types.Object]) -> tuple[Vector, Vector]:
    depsgraph = bpy.context.evaluated_depsgraph_get()
    points: list[Vector] = []
    for obj in objects:
        if obj.type != "MESH":
            continue
        evaluated = obj.evaluated_get(depsgraph)
        for corner in evaluated.bound_box:
            points.append(evaluated.matrix_world @ Vector(corner))
    if not points:
        raise RuntimeError("No mesh bounds available for render target.")
    return (
        Vector((min(p.x for p in points), min(p.y for p in points), min(p.z for p in points))),
        Vector((max(p.x for p in points), max(p.y for p in points), max(p.z for p in points))),
    )


def center_of(objects: set[bpy.types.Object]) -> Vector:
    min_v, max_v = world_bbox(objects)
    return (min_v + max_v) * 0.5


def max_extent(objects: set[bpy.types.Object]) -> float:
    min_v, max_v = world_bbox(objects)
    size = max_v - min_v
    return max(size.x, size.y, size.z)


def build_rotation_empty(target: bpy.types.Object, visible: set[bpy.types.Object]) -> bpy.types.Object:
    pivot = bpy.data.objects.new("TopicEarthLogo_RotationPivot", None)
    bpy.context.collection.objects.link(pivot)
    pivot.empty_display_type = "PLAIN_AXES"
    pivot.empty_display_size = max_extent(visible) * 0.25
    pivot.location = center_of(visible)

    world_matrix = target.matrix_world.copy()
    target.parent = pivot
    target.matrix_world = world_matrix
    return pivot


def apply_logo_material(objects: set[bpy.types.Object], texture_path: Path | None) -> None:
    if not texture_path or not texture_path.exists():
        print(f"[texture] Skipped; texture not found: {texture_path}")
        return

    image = bpy.data.images.load(str(texture_path), check_existing=True)
    material = bpy.data.materials.new("TopicEarthLogo_2025_Texture")
    material.use_nodes = True
    nodes = material.node_tree.nodes
    links = material.node_tree.links
    nodes.clear()

    output = nodes.new(type="ShaderNodeOutputMaterial")
    texture = nodes.new(type="ShaderNodeTexImage")
    texture.image = image
    emission = nodes.new(type="ShaderNodeEmission")
    emission.inputs["Strength"].default_value = 1.25
    links.new(texture.outputs["Color"], emission.inputs["Color"])
    links.new(emission.outputs["Emission"], output.inputs["Surface"])

    for obj in objects:
        if obj.type == "MESH":
            obj.data.materials.clear()
            obj.data.materials.append(material)


def setup_render(samples: int) -> None:
    scene = bpy.context.scene
    scene.render.engine = "CYCLES"
    scene.cycles.samples = samples
    scene.cycles.use_denoising = True
    scene.view_settings.view_transform = "Filmic"
    scene.view_settings.look = "Medium High Contrast"
    scene.view_settings.exposure = 0
    scene.view_settings.gamma = 1
    scene.render.film_transparent = True
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    scene.world = scene.world or bpy.data.worlds.new("World")
    scene.world.color = (0, 0, 0)


def setup_lighting(target_center: Vector, extent: float) -> None:
    bpy.ops.object.light_add(type="AREA", location=(target_center.x - extent * 2.0, target_center.y - extent * 3.0, target_center.z + extent * 3.0))
    key = bpy.context.object
    key.name = "TopicEarthLogo_KeyLight"
    key.data.energy = 450
    key.data.size = extent * 2.8

    bpy.ops.object.light_add(type="POINT", location=(target_center.x + extent * 2.0, target_center.y + extent * 2.5, target_center.z + extent * 1.4))
    rim = bpy.context.object
    rim.name = "TopicEarthLogo_RimLight"
    rim.data.energy = 75


def setup_camera(target_center: Vector, extent: float, padding: float) -> bpy.types.Object:
    bpy.ops.object.camera_add(location=(target_center.x, target_center.y - extent * 3.4, target_center.z + extent * 0.08))
    camera = bpy.context.object
    camera.name = "TopicEarthLogo_Camera"
    direction = target_center - camera.location
    camera.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()
    camera.data.type = "ORTHO"
    camera.data.ortho_scale = extent * padding
    bpy.context.scene.camera = camera
    return camera


def make_black_emission_material(name: str) -> bpy.types.Material:
    material = bpy.data.materials.new(name)
    material.use_nodes = True
    nodes = material.node_tree.nodes
    links = material.node_tree.links
    nodes.clear()

    output = nodes.new(type="ShaderNodeOutputMaterial")
    emission = nodes.new(type="ShaderNodeEmission")
    emission.inputs["Color"].default_value = (0, 0, 0, 1)
    emission.inputs["Strength"].default_value = 1.0
    links.new(emission.outputs["Emission"], output.inputs["Surface"])
    return material


def create_clock_hand(name: str, length: float, width: float, material: bpy.types.Material) -> bpy.types.Object:
    mesh = bpy.data.meshes.new(f"{name}_Mesh")
    half_width = width * 0.5
    verts = [
        (-half_width, -width * 0.9, 0),
        (half_width, -width * 0.9, 0),
        (half_width, length, 0),
        (-half_width, length, 0),
    ]
    faces = [(0, 1, 2, 3)]
    mesh.from_pydata(verts, [], faces)
    mesh.update()

    hand = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(hand)
    hand.data.materials.append(material)
    return hand


def create_clock_hands(camera: bpy.types.Object, extent: float) -> dict[str, bpy.types.Object]:
    material = make_black_emission_material("TopicEarthLogo_BlackClockHands")

    clock = bpy.data.objects.new("TopicEarthLogo_ClockHands", None)
    bpy.context.collection.objects.link(clock)
    clock.parent = camera
    clock.location = (0, 0, -1.0)
    clock.rotation_euler = (0, 0, 0)

    minute = create_clock_hand("TopicEarthLogo_MinuteHand", extent * 0.42, extent * 0.035, material)
    minute.parent = clock
    minute.location = (0, 0, 0)

    hour = create_clock_hand("TopicEarthLogo_HourHand", extent * 0.29, extent * 0.052, material)
    hour.parent = clock
    hour.location = (0, 0, 0.002)

    bpy.ops.mesh.primitive_uv_sphere_add(segments=24, ring_count=12, radius=extent * 0.055, location=(0, 0, 0.004))
    hub = bpy.context.object
    hub.name = "TopicEarthLogo_ClockHub"
    hub.parent = clock
    hub.location = (0, 0, 0.004)
    hub.data.materials.append(material)

    return {"minute": minute, "hour": hour, "hub": hub}


def update_clock_hands(
    clock_hands: dict[str, bpy.types.Object] | None,
    frame: int,
    frames: int,
    start_hour: float,
    hours_per_loop: float,
) -> None:
    if not clock_hands:
        return

    hour_24 = start_hour + (hours_per_loop * frame / frames)
    minute_angle = -math.tau * hour_24
    hour_angle = -math.tau * (hour_24 / 12.0)
    clock_hands["minute"].rotation_euler = (0, 0, minute_angle)
    clock_hands["hour"].rotation_euler = (0, 0, hour_angle)


def render_frames(
    output: Path,
    size: int,
    frames: int,
    fps: int,
    pivot: bpy.types.Object,
    axis: str,
    clock_hands: dict[str, bpy.types.Object] | None,
    clock_start_hour: float,
    clock_hours_per_loop: float,
) -> Path:
    scene = bpy.context.scene
    frame_dir = output / f"{size}x{size}" / "frames"
    frame_dir.mkdir(parents=True, exist_ok=True)
    scene.render.resolution_x = size
    scene.render.resolution_y = size
    scene.render.fps = fps

    axis_index = {"x": 0, "y": 1, "z": 2}[axis]
    for frame in range(frames):
        angle = (math.tau * frame) / frames
        pivot.rotation_euler = (0, 0, 0)
        pivot.rotation_euler[axis_index] = angle
        update_clock_hands(clock_hands, frame, frames, clock_start_hour, clock_hours_per_loop)
        scene.frame_set(frame + 1)
        scene.render.filepath = str(frame_dir / f"topic-earth-logo-{size}-{frame + 1:04d}.png")
        bpy.ops.render.render(write_still=True)

    return frame_dir


def run_ffmpeg(frame_dir: Path, output_dir: Path, largest_size: int, fps: int, make_mp4: bool, make_gif: bool) -> None:
    if not (make_mp4 or make_gif):
        return
    ffmpeg = str(DEFAULT_FFMPEG) if DEFAULT_FFMPEG.exists() else shutil.which("ffmpeg")
    if not ffmpeg:
        print("[ffmpeg] Not found on PATH; PNG frames were rendered, MP4/GIF skipped.")
        return

    pattern = str(frame_dir / f"topic-earth-logo-{largest_size}-%04d.png")
    if make_mp4:
        mp4 = output_dir / f"topic-earth-logo-earth-rotate-{largest_size}.mp4"
        subprocess.run(
            [
                ffmpeg,
                "-y",
                "-framerate",
                str(fps),
                "-start_number",
                "1",
                "-i",
                pattern,
                "-vf",
                "format=yuv420p",
                "-movflags",
                "+faststart",
                str(mp4),
            ],
            check=False,
        )
        print(f"[mp4] {mp4}")

    if make_gif:
        gif = output_dir / f"topic-earth-logo-earth-rotate-{largest_size}.gif"
        palette = output_dir / "topic-earth-logo-palette.png"
        subprocess.run(
            [ffmpeg, "-y", "-framerate", str(fps), "-start_number", "1", "-i", pattern, "-vf", "palettegen=reserve_transparent=1", "-update", "1", str(palette)],
            check=False,
        )
        subprocess.run(
            [
                ffmpeg,
                "-y",
                "-framerate",
                str(fps),
                "-start_number",
                "1",
                "-i",
                pattern,
                "-i",
                str(palette),
                "-lavfi",
                "paletteuse=alpha_threshold=128",
                str(gif),
            ],
            check=False,
        )
        print(f"[gif] {gif}")


def main() -> None:
    args = parse_args()
    input_path = resolve_project_path(args.input)
    output_dir = resolve_project_path(args.output)
    sizes = [int(value.strip()) for value in args.sizes.split(",") if value.strip()]
    if not sizes:
        raise ValueError("At least one render size is required.")
    for size in sizes:
        if size < 16 or size > 4096 or size & (size - 1):
            raise ValueError(f"Render size must be a power of two between 16 and 4096: {size}")

    reset_scene()
    if args.use_glb_earth:
        import_glb(input_path)
        earth = find_object(args.earth_name)
        visible = set(bpy.data.objects) if args.keep_scene else object_family(earth)
    else:
        earth = create_logo_sphere()
        visible = {earth}
    isolate_objects(visible)
    apply_logo_material(visible, resolve_project_path(args.texture) if args.texture else None)
    bpy.context.view_layer.update()

    target_center = center_of(visible)
    extent = max_extent(visible)
    pivot = build_rotation_empty(earth, visible)

    setup_render(args.samples)
    setup_lighting(target_center, extent)
    camera = setup_camera(target_center, extent, args.padding)
    clock_hands = create_clock_hands(camera, extent) if args.clock_hands else None

    largest_frame_dir = None
    for size in sorted(sizes):
        print(f"[render] {size}x{size}, {args.frames} frames")
        largest_frame_dir = render_frames(
            output_dir,
            size,
            args.frames,
            args.fps,
            pivot,
            args.axis,
            clock_hands,
            args.clock_start_hour,
            args.clock_hours_per_loop,
        )

    largest_size = max(sizes)
    run_ffmpeg(largest_frame_dir, output_dir, largest_size, args.fps, args.make_mp4, args.make_gif)
    print(f"[done] frames in {output_dir}")


if __name__ == "__main__":
    main()
