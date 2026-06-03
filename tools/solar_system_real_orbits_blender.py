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
    if name in bpy.data.objects:
        return bpy.data.objects[name]
    for obj in bpy.data.objects:
        if obj.name.lower() == name.lower():
            return obj
    return None


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


def center_visible_body_on_local_position(obj: bpy.types.Object, parent: bpy.types.Object, local_position: Vector) -> None:
    obj.location = Vector((0, 0, 0))
    bpy.context.view_layer.update()
    current_center_world = bbox_center(obj)
    current_center_local = parent.matrix_world.inverted() @ current_center_world
    obj.location += local_position - current_center_local
    bpy.context.view_layer.update()


def parent_visible_center_to_spin(obj: bpy.types.Object, spin: bpy.types.Object) -> None:
    old_world = obj.matrix_world.copy()
    obj.parent = spin
    obj.matrix_parent_inverse.identity()
    obj.matrix_world = old_world
    obj.location = Vector((0, 0, 0))
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


def create_orbits() -> None:
    sun = find_object("Sun")
    earth = find_object("Earth")
    if not sun or not earth:
        raise RuntimeError("Could not find Sun and Earth objects in the GLB.")

    sun.location = Vector((0, 0, 0))
    clear_animation_recursive(sun)
    sun_spin = make_spin_pivot("Sun", None, Vector((0, 0, 0)))
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

        if planet_name == "Moon":
            earth_pivot = pivots.get("Earth")
            if not earth_pivot:
                continue
            pivot = make_orbit_pivot("Orbit_Moon", parent=earth_pivot)
            pivot.location = Vector((orbit_radius(PLANETS["Earth"]["au"]), 0, 0))
            moon_distance = max(diameter(earth) * 2.25, 2.5)
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
        scale_object_to_diameter(sun, earth_diameter * target_ratio(SUN_DIAMETER_RATIO))

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
        bpy.context.collection.objects.link(obj)


def export_model() -> None:
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
    print(f"[GLB] Input:  {INPUT_GLB}")
    print(f"[GLB] Output: {OUTPUT_GLB}")
    reset_scene()
    import_model()
    bpy.context.scene.frame_start = FRAME_START
    bpy.context.scene.frame_end = FRAME_END

    rescale_planets()
    create_orbits()
    add_orbit_curves()
    export_model()

    print(f"[GLB] Output size: {file_mb(OUTPUT_GLB):.2f} MB")
    print("[GLB] Done. Inspect in Blender before replacing solar-system.glb.")


main()
