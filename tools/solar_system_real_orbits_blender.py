"""
Blender helper: rebuild solar-system planet scale and orbital animation.

Open this file in Blender's Text Editor and press Run Script.
It imports the current topic.earth GLB, rescales planets from Earth, creates
orbit pivots around the Sun, animates the pivots, and exports a new GLB.

Default output:
    assets/models/solar-system.real-orbits.glb

Important:
- SCALE_MODE = "balanced" is recommended for the app: real ratios are softened
  so the Sun/Jupiter remain navigable.
- SCALE_MODE = "real" uses true diameter ratios vs Earth, which makes the Sun
  enormous and is usually not usable inside a compact interactive scene.
"""

from __future__ import annotations

from pathlib import Path
import math

import bpy
from mathutils import Vector


PROJECT_ROOT = Path(
    r"C:\Users\bedes\OneDrive\SmDeltArt_Collection\__actual_vs\topic.earth"
)
INPUT_GLB = PROJECT_ROOT / "assets" / "models" / "solar-system.glb"
OUTPUT_GLB = PROJECT_ROOT / "assets" / "models" / "solar-system.real-orbits.glb"

# "balanced" keeps the model readable. "real" uses physical diameter ratios.
SCALE_MODE = "balanced"

# Animation timing.
FRAME_START = 1
FRAME_END = 900
EARTH_ORBITS_PER_LOOP = 1.0

# Visual orbit distances. Real AU distances are too wide for a compact app scene,
# so use sqrt(AU) compression while preserving correct planet order.
EARTH_ORBIT_RADIUS = 22.0
ORBIT_DISTANCE_EXPONENT = 0.5
ORBIT_INCLINATION_SCALE = 0.35
GLTF_ANIMATION_TRACK = "Solar_System_Real_Orbits"
SUN_VISUAL_SCALE_MULTIPLIER = 0.25
SCALE_GUIDE_Z = 0.35
MOON_ORBIT_RADIUS_MULTIPLIER = 1.25
MOON_MIN_ORBIT_RADIUS = 1.25

# Imported GLB actions can keep planets locked to their old motion. Clear them
# and build fresh orbit + self-spin animation from this script.
CLEAR_IMPORTED_PLANET_ANIMATION = True
ADD_SELF_SPIN_ANIMATION = True
EARTH_SPINS_PER_LOOP = 18.0


PLANETS = {
    "Mercury": {"diameter": 0.383, "au": 0.387, "period_days": 87.969, "inclination_deg": 7.005},
    "Venus": {"diameter": 0.949, "au": 0.723, "period_days": 224.701, "inclination_deg": 3.394},
    "Earth": {"diameter": 1.000, "au": 1.000, "period_days": 365.256, "inclination_deg": 0.000},
    "Moon": {"diameter": 0.273, "au": 0.00257, "period_days": 27.322, "inclination_deg": 5.145},
    "Mars": {"diameter": 0.532, "au": 1.524, "period_days": 686.980, "inclination_deg": 1.850},
    "Jupiter": {"diameter": 11.209, "au": 5.203, "period_days": 4332.589, "inclination_deg": 1.303},
    "Saturn": {"diameter": 9.449, "au": 9.537, "period_days": 10759.22, "inclination_deg": 2.485},
    "Uranus": {"diameter": 4.007, "au": 19.191, "period_days": 30685.4, "inclination_deg": 0.773},
    "Neptune": {"diameter": 3.883, "au": 30.069, "period_days": 60190.0, "inclination_deg": 1.770},
    "Pluto": {"diameter": 0.186, "au": 39.482, "period_days": 90560.0, "inclination_deg": 17.16},
}

SPIN_PERIOD_DAYS = {
    "Sun": 27.0,
    "Mercury": 58.646,
    "Venus": -243.025,
    "Earth": 0.997,
    "Moon": 27.322,
    "Mars": 1.026,
    "Jupiter": 0.414,
    "Saturn": 0.444,
    "Uranus": -0.718,
    "Neptune": 0.671,
    "Pluto": -6.387,
}

SUN_DIAMETER_RATIO = 109.2

# Balanced ratio = real ratio ^ exponent. This preserves order while keeping the
# Sun and giant planets visible in a small solar-system scene.
BALANCED_SCALE_EXPONENT = 0.58


def reset_scene() -> None:
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete()
    for group in (bpy.data.meshes, bpy.data.materials, bpy.data.images, bpy.data.actions):
        for datablock in list(group):
            if datablock.users == 0:
                group.remove(datablock)


def import_model() -> None:
    if not INPUT_GLB.exists():
        raise FileNotFoundError(f"Input not found: {INPUT_GLB}")
    bpy.ops.import_scene.gltf(filepath=str(INPUT_GLB))


def file_mb(path: Path) -> float:
    return path.stat().st_size / (1024 * 1024)


def find_object(name: str) -> bpy.types.Object | None:
    direct = bpy.data.objects.get(name)
    if direct and direct.type == "MESH" and not is_helper_object(direct):
        return direct
    for obj in bpy.data.objects:
        if obj.name.lower() == name.lower() and obj.type == "MESH" and not is_helper_object(obj):
            return obj
    candidates = [
        obj for obj in bpy.data.objects
        if name.lower() in obj.name.lower()
        and has_mesh_geometry(obj)
        and not is_helper_object(obj)
    ]
    if candidates:
        candidates.sort(key=lambda obj: (obj.type != "MESH", len(obj.name), obj.name))
        return candidates[0]
    return None


def has_mesh_geometry(obj: bpy.types.Object) -> bool:
    return obj.type == "MESH" or any(child.type == "MESH" for child in obj.children_recursive)


def is_helper_object(obj: bpy.types.Object) -> bool:
    return (
        obj.name.startswith("Orbit_")
        or obj.name.startswith("OrbitPath_")
        or obj.name.startswith("Spin_")
        or obj.name in {"Orbit_System_Root", "Animation"}
        or obj.type == "CURVE"
    )


def world_bbox(obj: bpy.types.Object) -> tuple[Vector, Vector] | None:
    depsgraph = bpy.context.evaluated_depsgraph_get()
    points: list[Vector] = []
    for child in [obj, *obj.children_recursive]:
        if child.type != "MESH":
            continue
        evaluated = child.evaluated_get(depsgraph)
        for corner in evaluated.bound_box:
            points.append(evaluated.matrix_world @ Vector(corner))

    if not points:
        return None

    min_v = Vector((min(p.x for p in points), min(p.y for p in points), min(p.z for p in points)))
    max_v = Vector((max(p.x for p in points), max(p.y for p in points), max(p.z for p in points)))
    return min_v, max_v


def diameter(obj: bpy.types.Object) -> float:
    bounds = world_bbox(obj)
    if not bounds:
        return 0.0
    min_v, max_v = bounds
    size = max_v - min_v
    return max(size.x, size.y, size.z)


def target_ratio(real_ratio: float) -> float:
    if SCALE_MODE == "real":
        return real_ratio
    if SCALE_MODE == "balanced":
        return real_ratio ** BALANCED_SCALE_EXPONENT
    raise ValueError(f"Unknown SCALE_MODE: {SCALE_MODE}")


def scale_object_to_diameter(obj: bpy.types.Object, target_diameter: float) -> None:
    current = diameter(obj)
    if current <= 0:
        print(f"[Scale] Skipped {obj.name}: no mesh diameter")
        return
    factor = target_diameter / current
    obj.scale = obj.scale * factor
    bpy.context.view_layer.update()
    print(f"[Scale] {obj.name}: {current:.4f} -> {diameter(obj):.4f} (factor {factor:.4f})")


def clear_animation_recursive(obj: bpy.types.Object) -> None:
    if not CLEAR_IMPORTED_PLANET_ANIMATION:
        return
    for item in [obj, *obj.children_recursive]:
        if item.animation_data:
            item.animation_data_clear()


def set_linear_keyframes(obj: bpy.types.Object) -> None:
    action = obj.animation_data.action if obj.animation_data else None
    if not action:
        return
    fcurves = getattr(action, "fcurves", None)
    if fcurves is None:
        print(f"[Animation] {obj.name}: keyframes inserted, interpolation left at Blender default")
        return
    for curve in fcurves:
        for keyframe in curve.keyframe_points:
            keyframe.interpolation = "LINEAR"


def parent_local(obj: bpy.types.Object, parent: bpy.types.Object) -> None:
    obj.parent = parent
    obj.matrix_parent_inverse.identity()


def bbox_center(obj: bpy.types.Object) -> Vector:
    bounds = world_bbox(obj)
    if not bounds:
        return obj.matrix_world.translation.copy()
    min_v, max_v = bounds
    return (min_v + max_v) * 0.5


def force_mesh_origin_to_geometry(obj: bpy.types.Object) -> None:
    if obj.type != "MESH":
        return

    selected = [item for item in bpy.context.scene.objects if item.select_get()]
    active = bpy.context.view_layer.objects.active
    child_matrices = {child: child.matrix_world.copy() for child in obj.children_recursive}

    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    try:
        bpy.ops.object.origin_set(type="ORIGIN_GEOMETRY", center="BOUNDS")
    except Exception as exc:
        print(f"[Origin] Skipped {obj.name}: {exc}")
    finally:
        for child, matrix in child_matrices.items():
            child.matrix_world = matrix
        obj.select_set(False)
        for item in selected:
            item.select_set(True)
        bpy.context.view_layer.objects.active = active
        bpy.context.view_layer.update()


def center_visible_body_on_local_position(obj: bpy.types.Object, parent: bpy.types.Object, local_position: Vector) -> None:
    obj.location = Vector((0, 0, 0))
    bpy.context.view_layer.update()
    current_center_world = bbox_center(obj)
    current_center_local = parent.matrix_world.inverted() @ current_center_world
    obj.location += local_position - current_center_local
    bpy.context.view_layer.update()


def parent_visible_center_to_spin(obj: bpy.types.Object, spin: bpy.types.Object) -> None:
    obj.parent = spin
    obj.matrix_parent_inverse.identity()
    obj.location = Vector((0, 0, 0))
    obj.rotation_euler = (0, 0, 0)
    bpy.context.view_layer.update()

    current_center_world = bbox_center(obj)
    current_center_local = spin.matrix_world.inverted() @ current_center_world
    obj.location -= current_center_local
    bpy.context.view_layer.update()


def make_orbit_pivot(name: str, parent: bpy.types.Object | None = None) -> bpy.types.Object:
    pivot = bpy.data.objects.new(name, None)
    bpy.context.collection.objects.link(pivot)
    if parent:
        pivot.parent = parent
    return pivot


def make_spin_pivot(name: str, orbit_pivot: bpy.types.Object | None, local_position: Vector) -> bpy.types.Object:
    spin = make_orbit_pivot(f"Spin_{name}", parent=orbit_pivot)
    spin.location = local_position
    return spin


def orbit_radius(au: float) -> float:
    return EARTH_ORBIT_RADIUS * (au ** ORBIT_DISTANCE_EXPONENT)


def set_planet_orbit_position(obj: bpy.types.Object, planet_name: str) -> None:
    if planet_name == "Moon":
        earth = find_object("Earth")
        if not earth:
            return
        moon_distance = max(diameter(earth) * 2.25, 2.5)
        if obj.parent:
            center_visible_body_on_local_position(obj, obj.parent, Vector((moon_distance, 0, 0)))
        else:
            obj.location = Vector((moon_distance, 0, 0))
        return

    data = PLANETS[planet_name]
    radius = orbit_radius(data["au"])
    if obj.parent:
        center_visible_body_on_local_position(obj, obj.parent, Vector((radius, 0, 0)))
    else:
        obj.location = Vector((radius, 0, 0))


def animate_pivot_rotation(pivot: bpy.types.Object, period_days: float, earth_period_days: float, retrograde: bool = False) -> None:
    loops = EARTH_ORBITS_PER_LOOP * earth_period_days / period_days
    direction = -1.0 if retrograde else 1.0

    pivot.rotation_euler = (0, 0, 0)
    pivot.keyframe_insert(data_path="rotation_euler", frame=FRAME_START)
    pivot.rotation_euler = (0, 0, direction * math.tau * loops)
    pivot.keyframe_insert(data_path="rotation_euler", frame=FRAME_END)

    if not pivot.animation_data or not pivot.animation_data.action:
        return
    set_linear_keyframes(pivot)


def animate_self_spin(obj: bpy.types.Object, planet_name: str) -> None:
    if not ADD_SELF_SPIN_ANIMATION:
        return
    period = SPIN_PERIOD_DAYS.get(planet_name)
    if not period:
        return

    earth_period = abs(SPIN_PERIOD_DAYS["Earth"])
    loops = EARTH_SPINS_PER_LOOP * earth_period / abs(period)
    direction = -1.0 if period < 0 else 1.0

    obj.rotation_mode = "XYZ"
    start = obj.rotation_euler.copy()
    obj.rotation_euler = start
    obj.keyframe_insert(data_path="rotation_euler", frame=FRAME_START)
    obj.rotation_euler = (start.x, start.y, start.z + direction * math.tau * loops)
    obj.keyframe_insert(data_path="rotation_euler", frame=FRAME_END)
    set_linear_keyframes(obj)


def move_actions_to_shared_nla_track() -> None:
    for obj in bpy.data.objects:
        if not obj.animation_data or not obj.animation_data.action:
            continue
        action = obj.animation_data.action
        track = obj.animation_data.nla_tracks.new()
        track.name = GLTF_ANIMATION_TRACK
        strip = track.strips.new(action.name, FRAME_START, action)
        strip.name = action.name
        obj.animation_data.action = None


def create_orbits() -> None:
    sun = find_object("Sun")
    earth = find_object("Earth")
    if not sun or not earth:
        raise RuntimeError("Could not find Sun and Earth objects in the GLB.")

    sun.location = Vector((0, 0, 0))
    clear_animation_recursive(sun)
    sun_spin = make_spin_pivot("Sun", None, Vector((0, 0, 0)))
    force_mesh_origin_to_geometry(sun)
    parent_visible_center_to_spin(sun, sun_spin)
    animate_self_spin(sun_spin, "Sun")
    earth_period = PLANETS["Earth"]["period_days"]

    root = make_orbit_pivot("Orbit_System_Root")
    root.location = Vector((0, 0, 0))

    pivots: dict[str, bpy.types.Object] = {}

    for planet_name, data in PLANETS.items():
        obj = find_object(planet_name)
        if not obj:
            print(f"[Orbit] Missing {planet_name}")
            continue

        clear_animation_recursive(obj)
        force_mesh_origin_to_geometry(obj)

        if planet_name == "Moon":
            earth_pivot = pivots.get("Earth")
            if not earth_pivot:
                continue
            pivot = make_orbit_pivot("Orbit_Moon", parent=earth_pivot)
            pivot.location = Vector((orbit_radius(PLANETS["Earth"]["au"]), 0, 0))
            moon_distance = max(diameter(earth) * MOON_ORBIT_RADIUS_MULTIPLIER, MOON_MIN_ORBIT_RADIUS)
            spin = make_spin_pivot(planet_name, pivot, Vector((moon_distance, 0, 0)))
        else:
            pivot = make_orbit_pivot(f"Orbit_{planet_name}", parent=root)
            pivot.location = Vector((0, 0, 0))
            spin = make_spin_pivot(planet_name, pivot, Vector((orbit_radius(data["au"]), 0, 0)))

        inclination = math.radians(data["inclination_deg"] * ORBIT_INCLINATION_SCALE)
        pivot.rotation_euler.x = inclination
        parent_visible_center_to_spin(obj, spin)
        animate_pivot_rotation(
            pivot,
            data["period_days"],
            earth_period,
            retrograde=False,
        )
        animate_self_spin(spin, planet_name)
        pivots[planet_name] = pivot
        print(f"[Orbit] {planet_name}: radius={spin.location.length:.3f}, period={data['period_days']} days")


def rescale_planets() -> None:
    earth = find_object("Earth")
    if not earth:
        raise RuntimeError("Could not find Earth object.")

    earth_diameter = diameter(earth)
    if earth_diameter <= 0:
        raise RuntimeError("Could not measure Earth diameter.")

    print(f"[Scale] Earth anchor diameter: {earth_diameter:.4f}")

    sun = find_object("Sun")
    if sun:
        scale_object_to_diameter(sun, earth_diameter * target_ratio(SUN_DIAMETER_RATIO) * SUN_VISUAL_SCALE_MULTIPLIER)

    for planet_name, data in PLANETS.items():
        obj = find_object(planet_name)
        if not obj:
            print(f"[Scale] Missing {planet_name}")
            continue
        if planet_name == "Earth":
            continue
        scale_object_to_diameter(obj, earth_diameter * target_ratio(data["diameter"]))


def add_orbit_curves() -> None:
    material = bpy.data.materials.new("Orbit_Line_Cyan")
    material.diffuse_color = (0.2, 0.75, 1.0, 0.28)

    for planet_name, data in PLANETS.items():
        if planet_name == "Moon":
            continue
        radius = orbit_radius(data["au"])
        curve = bpy.data.curves.new(f"OrbitPath_{planet_name}", type="CURVE")
        curve.dimensions = "3D"
        curve.resolution_u = 16
        curve.bevel_depth = 0.01
        curve.materials.append(material)
        poly = curve.splines.new("POLY")
        points = 96
        poly.points.add(points)
        for index in range(points + 1):
            angle = math.tau * index / points
            poly.points[index].co = (math.cos(angle) * radius, math.sin(angle) * radius, 0, 1)
        obj = bpy.data.objects.new(f"OrbitPath_{planet_name}", curve)
        obj.rotation_euler.x = math.radians(data["inclination_deg"] * ORBIT_INCLINATION_SCALE)
        bpy.context.collection.objects.link(obj)


def add_poly_curve(name: str, points: list[Vector], material: bpy.types.Material, bevel_depth: float = 0.018) -> bpy.types.Object:
    curve = bpy.data.curves.new(name, type="CURVE")
    curve.dimensions = "3D"
    curve.resolution_u = 1
    curve.bevel_depth = bevel_depth
    curve.materials.append(material)
    poly = curve.splines.new("POLY")
    poly.points.add(len(points) - 1)
    for index, point in enumerate(points):
        poly.points[index].co = (point.x, point.y, point.z, 1)
    obj = bpy.data.objects.new(name, curve)
    bpy.context.collection.objects.link(obj)
    return obj


def add_scale_cotation_guides() -> None:
    material = bpy.data.materials.new("Scale_Guide_Yellow_Compressed")
    material.diffuse_color = (1.0, 0.72, 0.16, 0.62)
    earth_radius = orbit_radius(PLANETS["Earth"]["au"])
    y_step = 0.46
    break_size = 0.38

    for index, (planet_name, data) in enumerate(PLANETS.items()):
        if planet_name in {"Earth", "Moon"}:
            continue
        radius = orbit_radius(data["au"])
        start_x = min(earth_radius, radius)
        end_x = max(earth_radius, radius)
        if abs(end_x - start_x) < 0.01:
            continue

        y = -(index + 1) * y_step
        z = SCALE_GUIDE_Z
        gap = min(1.0, max(0.35, (end_x - start_x) * 0.08))
        break_x = start_x + (end_x - start_x) * 0.48
        before = Vector((break_x - gap * 0.5, y, z))
        after = Vector((break_x + gap * 0.5, y, z))

        add_poly_curve(
            f"ScaleGuide_Earth_to_{planet_name}",
            [Vector((start_x, y, z)), before, after, Vector((end_x, y, z))],
            material,
            bevel_depth=0.014,
        )
        add_poly_curve(
            f"ScaleBreak_Earth_to_{planet_name}_A",
            [
                Vector((break_x - break_size * 0.5, y - break_size * 0.28, z)),
                Vector((break_x - break_size * 0.1, y + break_size * 0.28, z)),
            ],
            material,
            bevel_depth=0.018,
        )
        add_poly_curve(
            f"ScaleBreak_Earth_to_{planet_name}_B",
            [
                Vector((break_x + break_size * 0.1, y - break_size * 0.28, z)),
                Vector((break_x + break_size * 0.5, y + break_size * 0.28, z)),
            ],
            material,
            bevel_depth=0.018,
        )


def export_model() -> None:
    OUTPUT_GLB.parent.mkdir(parents=True, exist_ok=True)
    move_actions_to_shared_nla_track()
    bpy.ops.export_scene.gltf(
        filepath=str(OUTPUT_GLB),
        export_format="GLB",
        export_yup=True,
        export_apply=True,
        export_animations=True,
        export_animation_mode="NLA_TRACKS",
        export_merge_animation="NLA_TRACK",
        export_nla_strips_merged_animation_name=GLTF_ANIMATION_TRACK,
        export_skins=True,
        export_morph=True,
    )


def main() -> None:
    print(f"[GLB] Input:  {INPUT_GLB}")
    print(f"[GLB] Output: {OUTPUT_GLB}")
    reset_scene()
    import_model()
    bpy.context.scene.frame_start = FRAME_START
    bpy.context.scene.frame_end = FRAME_END

    rescale_planets()
    create_orbits()
    add_orbit_curves()
    add_scale_cotation_guides()
    export_model()

    print(f"[GLB] Output size: {file_mb(OUTPUT_GLB):.2f} MB")
    print("[GLB] Done. Inspect in Blender before replacing solar-system.glb.")


main()
