"""Create a separate Janus teaching scene from topic.earth's solar-system.glb.

Blender 4.2+ Text Editor: set PROJECT_ROOT, then Run Script.
CLI: blender --background --python tools/janus_metric_demo_blender.py --
     --project-root /path/to/topic.earth --ratio 0.6 --flatten 0.5

Ratios and motion are illustrative. No field equations, physical twin planets,
universal proper time, or inferred cosmological ratio are implemented.
Creates a NEW scene; keeps objects in existing scenes untouched.
"""
from pathlib import Path
import argparse
import math
import sys

import bpy
from mathutils import Vector

PROJECT_ROOT = Path(r"C:\Users\bedes\OneDrive\SmDeltArt_Collection\__actual_vs\topic.earth")
SPATIAL_RATIO = 0.6
FLATTEN_Z = 0.5
EXTRA_ROTATE_XY_180 = False
FRAMES = 180


def material(name, color):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*color, 1)
    mat.use_nodes = True
    shader = mat.node_tree.nodes.get('Principled BSDF')
    shader.inputs['Base Color'].default_value = (*color, 1)
    shader.inputs['Emission Color'].default_value = (*color, 1)
    shader.inputs['Emission Strength'].default_value = 0.5
    return mat


def empty(name, parent=None):
    obj = bpy.data.objects.new(name, None)
    bpy.context.scene.collection.objects.link(obj)
    obj.parent = parent
    return obj


def polyline(name, points, mat, parent=None):
    curve = bpy.data.curves.new(name, 'CURVE')
    curve.dimensions = '3D'
    curve.bevel_depth = 0.025
    curve.bevel_resolution = 1
    spline = curve.splines.new('POLY')
    spline.points.add(len(points) - 1)
    for dest, point in zip(spline.points, points):
        dest.co = (*point, 1)
    obj = bpy.data.objects.new(name, curve)
    bpy.context.scene.collection.objects.link(obj)
    obj.parent = parent
    obj.data.materials.append(mat)
    return obj


def hemisphere(root, mat):
    for j in range(7):
        phi = math.pi / 2 * j / 7
        polyline(f'{root.name}_Latitude_{j}', [
            (10 * math.cos(phi) * math.cos(math.tau * i / 96),
             10 * math.cos(phi) * math.sin(math.tau * i / 96), 10 * math.sin(phi))
            for i in range(97)], mat, root)
    for j in range(16):
        theta = math.tau * j / 16
        polyline(f'{root.name}_Meridian_{j}', [
            (10 * math.cos(math.pi / 2 * i / 32) * math.cos(theta),
             10 * math.cos(math.pi / 2 * i / 32) * math.sin(theta),
             10 * math.sin(math.pi / 2 * i / 32)) for i in range(33)], mat, root)


def time_arrow(sign, mat):
    root = empty('Time_Plus' if sign > 0 else 'Time_Minus')
    z = sign * 9
    polyline(f'{root.name}_Axis', [(-11, 0, z), (11, 0, z)], mat)
    polyline(f'{root.name}_Shaft', [(0, 0, 0), (sign * 2, 0, 0)], mat, root)
    polyline(f'{root.name}_Head', [(sign * 1.3, 0, 0.5), (sign * 2, 0, 0), (sign * 1.3, 0, -0.5)], mat, root)
    # Sample each frame to avoid action API differences in Blender 4/5.
    for frame in range(1, FRAMES + 1):
        root.location = (sign * (-10 + 20 * (frame - 1) / (FRAMES - 1)), 0, z)
        root.keyframe_insert(data_path='location', frame=frame)
    root['meaning'] = 'Opposite time orientation; playback rate is graphical only'


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--project-root', type=Path, default=PROJECT_ROOT)
    parser.add_argument('--ratio', type=float, default=SPATIAL_RATIO)
    parser.add_argument('--flatten', type=float, default=FLATTEN_Z)
    parser.add_argument('--rotate-xy-180', action='store_true', default=EXTRA_ROTATE_XY_180)
    argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    args = parser.parse_args(argv)
    if not 0 < args.ratio <= 1 or not 0 < args.flatten <= 1:
        raise ValueError('ratio and flatten must be in (0, 1]')
    source = args.project_root / 'assets/models/solar-system.glb'
    if not source.is_file():
        raise FileNotFoundError(source)
    output = args.project_root / 'assets/models/solar-system.janus-demo'
    scene = bpy.data.scenes.new('Janus_Metric_Illustration')
    bpy.context.window.scene = scene
    scene.frame_start, scene.frame_end = 1, FRAMES
    scene.render.fps = 30
    scene['janus_spatial_ratio'] = args.ratio
    scene['ratio_status'] = 'Illustrative user parameter, not an established estimate'
    scene['cut_plane'] = 'XY; flatten Z; negative sector reflected through Z'
    plus_mat = material('Janus_Plus_Cyan', (0.15, 0.7, 1))
    minus_mat = material('Janus_Minus_Amber', (1, 0.45, 0.15))
    plus, minus = empty('Janus_Plus'), empty('Janus_Minus')
    plus.location.z, minus.location.z = 1.4, -1.4
    plus.scale = (1, 1, args.flatten)
    minus.scale = (args.ratio, args.ratio, -args.ratio * args.flatten)
    turn = empty('Janus_Mirror_Extra_Rotation', minus)
    if args.rotate_xy_180:
        turn.rotation_euler = (math.pi, math.pi, 0)
    hemisphere(plus, plus_mat)
    hemisphere(turn, minus_mat)
    # Import only into the new scene. A snapshot prevents modifying prior objects.
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=str(source))
    imported = set(bpy.data.objects) - before
    for obj in list(imported):
        if 'universe' in obj.name.lower() and obj.type == 'MESH':
            imported.remove(obj)
            bpy.data.objects.remove(obj, do_unlink=True)
    # Freeze planetary motion: time arrows are independent of orbital dynamics.
    scene.frame_set(1)
    bpy.context.view_layer.update()
    corners = [obj.matrix_world @ Vector(corner) for obj in imported if obj.type == 'MESH' for corner in obj.bound_box]
    if not corners:
        raise RuntimeError('No solar meshes found')
    radius = max(p.length for p in corners)
    holder = empty('Janus_Solar_Reference', plus)
    holder.scale = (8 / radius,) * 3
    for obj in imported:
        obj.animation_data_clear()
        if obj.parent not in imported:
            obj.parent = holder
    copies = {}
    for obj in imported:
        copy = obj.copy()
        scene.collection.objects.link(copy)
        copy.name = 'Janus_Ghost_' + obj.name
        copies[obj] = copy
        if copy.type == 'MESH':
            for slot in copy.material_slots:
                slot.link = 'OBJECT'
                slot.material = minus_mat
    ghost_holder = empty('Janus_Solar_Ghost_Reference', turn)
    ghost_holder.scale = holder.scale
    for original, copy in copies.items():
        copy.parent = copies.get(original.parent, ghost_holder)
    time_arrow(1, plus_mat)
    time_arrow(-1, minus_mat)
    scene.frame_set(1)
    scene.world = bpy.data.worlds.new('Janus_Background')
    scene.world.color = (0.015, 0.025, 0.05)
    camera_data = bpy.data.cameras.new('Janus_Camera')
    camera = bpy.data.objects.new('Janus_Camera', camera_data)
    scene.collection.objects.link(camera)
    camera.location = (24, -34, 20)
    camera.rotation_euler = (-camera.location).to_track_quat('-Z', 'Y').to_euler()
    camera_data.type, camera_data.ortho_scale = 'ORTHO', 36
    scene.camera = camera
    scene.render.resolution_x, scene.render.resolution_y = 1280, 900
    scene.render.resolution_percentage = 100
    for name, body, location, mat in [
        ('Label_Plus', 'Secteur + | t+ ->', (-10, 0, 10.5), plus_mat),
        ('Label_Minus', 'Secteur - | <- t-', (-10, 0, -10.5), minus_mat),
        ('Label_Ratio', f'a- / a+ = {args.ratio:g} | ratio illustratif', (-11, 0, -13), minus_mat),
    ]:
        text = bpy.data.curves.new(name, 'FONT')
        text.body, text.size = body, 0.6
        label = bpy.data.objects.new(name, text)
        scene.collection.objects.link(label)
        label.location = location
        label.rotation_euler = camera.rotation_euler.copy()
        label.data.materials.append(mat)
    # Convert our curves for GLB; restrict selection to this new scene.
    bpy.ops.object.select_all(action='DESELECT')
    for obj in list(scene.objects):
        if obj.type in {'CURVE', 'FONT'}:
            obj.select_set(True)
            bpy.context.view_layer.objects.active = obj
    bpy.ops.object.convert(target='MESH')
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.export_scene.gltf(filepath=str(output) + '.glb', export_format='GLB',
                              use_selection=True, export_animations=True, export_extras=True)
    bpy.ops.wm.save_as_mainfile(filepath=str(output) + '.blend')
    print(f'Janus illustration saved: {output}; spatial ratio={args.ratio} (illustrative)')


if __name__ == '__main__':
    main()
