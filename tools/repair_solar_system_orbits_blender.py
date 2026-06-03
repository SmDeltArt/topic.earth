"""
Blender repair helper: rebuild linked solar-system orbit animation from an
already exported real-orbits GLB.

Use when planets still follow an old imported animation or are not visibly
locked to the orbit-radius pivots.

Open this file in Blender's Text Editor and press Run Script.

Input:
    assets/models/solar-system.real-orbits.glb

Output:
    assets/models/solar-system.real-orbits.linked.glb
"""

from __future__ import annotations

from pathlib import Path
import math

import bpy
from mathutils import Vector


PROJECT_ROOT = Path(
    r"C:\Users\bedes\OneDrive\SmDeltArt_Collection\__actual_vs\topic.earth"
)
INPUT_GLB = PROJECT_ROOT / "assets" / "models" / "solar-system.real-orbits.glb"
OUTPUT_GLB = PROJECT_ROOT / "assets" / "models" / "solar-system.real-orbits.linked.glb"

FRAME_START = 1
FRAME_END = 900
EARTH_ORBITS_PER_LOOP = 1.0
EARTH_SPINS_PER_LOOP = 18.0
EARTH_ORBIT_RADIUS = 22.0
ORBIT_DISTANCE_EXPONENT = 0.5
ORBIT_INCLINATION_SCALE = 0.35


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


def reset_scene() -> None:
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete()


def import_model() -> None:
    if not INPUT_GLB.exists():
        raise FileNotFoundError(f"Input not found: {INPUT_GLB}")
    bpy.ops.import_scene.gltf(filepath=str(INPUT_GLB))


def find_object(name: str) -> bpy.types.Object | None:
    if name in bpy.data.objects:
        return bpy.data.objects[name]
    for obj in bpy.data.objects:
        if obj.name.lower() == name.lower():
            return obj
    return None


def find_planet_object(name: str) -> bpy.types.Object | None:
    direct = find_object(name)
    if direct and direct.type != "CURVE":
        return direct

    candidates = [
        obj for obj in bpy.data.objects
        if name.lower() in obj.name.lower()
        and not obj.name.startswith("Orbit_")
        and not obj.name.startswith("OrbitPath_")
        and obj.type != "CURVE"
    ]
    if not candidates:
        return None
    candidates.sort(key=lambda obj: (obj.type != "EMPTY", len(obj.name)))
    return candidates[0]


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

    return (
        Vector((min(p.x for p in points), min(p.y for p in points), min(p.z for p in points))),
        Vector((max(p.x for p in points), max(p.y for p in points), max(p.z for p in points))),
    )


def diameter(obj: bpy.types.Object) -> float:
    bounds = world_bbox(obj)
    if not bounds:
        return 0.0
    min_v, max_v = bounds
    size = max_v - min_v
    return max(size.x, size.y, size.z)


def clear_all_animation() -> None:
    for obj in bpy.data.objects:
        if obj.animation_data:
            obj.animation_data_clear()
    for action in list(bpy.data.actions):
        bpy.data.actions.remove(action)


def detach_planets() -> dict[str, bpy.types.Object]:
    planets: dict[str, bpy.types.Object] = {}
    names = ["Sun", *PLANETS.keys()]
    for name in names:
        obj = find_planet_object(name)
        if not obj:
            print(f"[Detach] Missing {name}")
            continue
        matrix = obj.matrix_world.copy()
        obj.parent = None
        obj.matrix_world = matrix
        obj.name = name
        planets[name] = obj
        print(f"[Detach] Kept {name}: {obj.type}")
    return planets


def delete_old_helpers(planets: dict[str, bpy.types.Object]) -> None:
    keep = set(planets.values())
    keep.update(child for obj in planets.values() for child in obj.children_recursive)

    for obj in list(bpy.data.objects):
        if obj in keep:
            continue
        if (
            obj.name.startswith("Orbit_")
            or obj.name.startswith("OrbitPath_")
            or obj.name.startswith("Spin_")
            or obj.name in {"Orbit_System_Root", "Animation"}
            or obj.type == "CURVE"
        ):
            bpy.data.objects.remove(obj, do_unlink=True)


def set_linear_keyframes(obj: bpy.types.Object) -> None:
    action = obj.animation_data.action if obj.animation_data else None
    fcurves = getattr(action, "fcurves", None) if action else None
    if not fcurves:
        return
    for curve in fcurves:
        for keyframe in curve.keyframe_points:
            keyframe.interpolation = "LINEAR"


def make_empty(name: str, parent: bpy.types.Object | None = None) -> bpy.types.Object:
    obj = bpy.data.objects.new(name, None)
    bpy.context.collection.objects.link(obj)
    obj.empty_display_type = "PLAIN_AXES"
    obj.empty_display_size = 1.5
    if parent:
        obj.parent = parent
    return obj


def orbit_radius(au: float) -> float:
    return EARTH_ORBIT_RADIUS * (au ** ORBIT_DISTANCE_EXPONENT)


def bbox_center(obj: bpy.types.Object) -> Vector:
    bounds = world_bbox(obj)
    if not bounds:
        return obj.matrix_world.translation.copy()
    min_v, max_v = bounds
    return (min_v + max_v) * 0.5


def make_spin_pivot(name: str, orbit_pivot: bpy.types.Object | None, local_position: Vector) -> bpy.types.Object:
    spin = make_empty(f"Spin_{name}", parent=orbit_pivot)
    spin.location = local_position
    return spin


def parent_visible_center_to_spin(obj: bpy.types.Object, spin: bpy.types.Object) -> None:
    old_world = obj.matrix_world.copy()
    obj.parent = spin
    obj.matrix_parent_inverse.identity()
    obj.matrix_world = old_world
    obj.location = Vector((0, 0, 0))
    bpy.context.view_layer.update()

    # Imported GLBs often have planet mesh geometry offset from the object
    # origin. Center the visible planet body on the spin pivot, so self-spin
    # rotates around the planet body while the orbit pivot stays Sun-centered.
    current_center_world = bbox_center(obj)
    current_center_local = spin.matrix_world.inverted() @ current_center_world
    obj.location -= current_center_local
    bpy.context.view_layer.update()


def animate_orbit(pivot: bpy.types.Object, period_days: float) -> None:
    loops = EARTH_ORBITS_PER_LOOP * PLANETS["Earth"]["period_days"] / period_days
    pivot.rotation_euler.z = 0
    pivot.keyframe_insert(data_path="rotation_euler", frame=FRAME_START)
    pivot.rotation_euler.z = math.tau * loops
    pivot.keyframe_insert(data_path="rotation_euler", frame=FRAME_END)
    set_linear_keyframes(pivot)


def animate_spin(obj: bpy.types.Object, name: str) -> None:
    period = SPIN_PERIOD_DAYS.get(name)
    if not period:
        return
    loops = EARTH_SPINS_PER_LOOP * abs(SPIN_PERIOD_DAYS["Earth"]) / abs(period)
    direction = -1.0 if period < 0 else 1.0
    obj.rotation_mode = "XYZ"
    start = obj.rotation_euler.copy()
    obj.keyframe_insert(data_path="rotation_euler", frame=FRAME_START)
    obj.rotation_euler = (start.x, start.y, start.z + direction * math.tau * loops)
    obj.keyframe_insert(data_path="rotation_euler", frame=FRAME_END)
    set_linear_keyframes(obj)


def make_orbit_curves() -> None:
    material = bpy.data.materials.new("Orbit_Line_Cyan_Linked")
    material.diffuse_color = (0.2, 0.75, 1.0, 0.32)

    for planet_name, data in PLANETS.items():
        if planet_name == "Moon":
            continue
        radius = orbit_radius(data["au"])
        curve = bpy.data.curves.new(f"OrbitPath_{planet_name}", type="CURVE")
        curve.dimensions = "3D"
        curve.resolution_u = 16
        curve.bevel_depth = 0.012
        curve.materials.append(material)
        spline = curve.splines.new("POLY")
        points = 144
        spline.points.add(points)
        for index in range(points + 1):
            angle = math.tau * index / points
            spline.points[index].co = (math.cos(angle) * radius, math.sin(angle) * radius, 0, 1)
        obj = bpy.data.objects.new(f"OrbitPath_{planet_name}", curve)
        bpy.context.collection.objects.link(obj)


def rebuild_orbits(planets: dict[str, bpy.types.Object]) -> None:
    sun = planets.get("Sun")
    earth = planets.get("Earth")
    if not sun or not earth:
        raise RuntimeError("Need Sun and Earth objects to rebuild orbits.")

    sun_spin = make_spin_pivot("Sun", None, Vector((0, 0, 0)))
    parent_visible_center_to_spin(sun, sun_spin)
    animate_spin(sun_spin, "Sun")

    root = make_empty("Orbit_System_Root")
    root.location = Vector((0, 0, 0))
    pivots: dict[str, bpy.types.Object] = {}

    for planet_name, data in PLANETS.items():
        obj = planets.get(planet_name)
        if not obj:
            continue

        if planet_name == "Moon":
            earth_pivot = pivots.get("Earth")
            if not earth_pivot:
                continue
            pivot = make_empty("Orbit_Moon", parent=earth_pivot)
            pivot.location = Vector((orbit_radius(PLANETS["Earth"]["au"]), 0, 0))
            moon_distance = max(diameter(planets["Earth"]) * 2.25, 2.5)
            spin = make_spin_pivot(planet_name, pivot, Vector((moon_distance, 0, 0)))
        else:
            pivot = make_empty(f"Orbit_{planet_name}", parent=root)
            pivot.location = Vector((0, 0, 0))
            pivot.rotation_euler.x = math.radians(data["inclination_deg"] * ORBIT_INCLINATION_SCALE)
            spin = make_spin_pivot(planet_name, pivot, Vector((orbit_radius(data["au"]), 0, 0)))

        parent_visible_center_to_spin(obj, spin)
        animate_orbit(pivot, data["period_days"])
        animate_spin(spin, planet_name)
        pivots[planet_name] = pivot
        print(f"[Orbit] {planet_name} linked to {pivot.name}; spin={spin.name}; radius={spin.location.length:.3f}")

    make_orbit_curves()


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
    reset_scene()
    import_model()
    bpy.context.scene.frame_start = FRAME_START
    bpy.context.scene.frame_end = FRAME_END
    clear_all_animation()
    planets = detach_planets()
    delete_old_helpers(planets)
    rebuild_orbits(planets)
    export_model()
    print(f"[Done] Exported linked orbit GLB: {OUTPUT_GLB}")


main()
