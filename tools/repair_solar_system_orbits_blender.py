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
ARCHIVED_INPUT_GLB = PROJECT_ROOT / "assets" / "models" / "_solar-system-archive-20260603" / "solar-system.real-orbits.glb"

FRAME_START = 1
FRAME_END = 900
EARTH_ORBITS_PER_LOOP = 1.0
EARTH_SPINS_PER_LOOP = 18.0
EARTH_ORBIT_RADIUS = 22.0
ORBIT_DISTANCE_EXPONENT = 0.5
ORBIT_INCLINATION_SCALE = 0.35
GLTF_ANIMATION_TRACK = "Solar_System_Real_Orbits"
SUN_VISUAL_SCALE_MULTIPLIER = 0.25
SCALE_GUIDE_Z = 0.35
UNIVERSE_SCENE_DIAMETER = 400.0
MOON_ORBIT_RADIUS_MULTIPLIER = 1.25
MOON_MIN_ORBIT_RADIUS = 1.25
MODEL_METADATA = {
    "title": "topic.earth readable solar-system simulation",
    "description": "Compressed educational solar-system scene with real-ratio reference topics, readable orbital animation, Saturn moons, Planet 9 hypothesis marker, Atlas31, and spacecraft context.",
    "creator": "BenDes",
    "project": "topic.earth",
    "brand": "Sm\u0394rt / CAD\u0394I",
    "workflow": "Built using Codex -> Python -> Blender -> topic.earth",
    "ai_assistance": "Powered by OpenAI-assisted development",
    "copyright": "BenDes, CAD\u0394I, Sm\u0394rt, topic.earth",
    "license_note": "Project educational model; verify third-party source textures and mission references before distribution.",
}


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
    "Planet9": {"diameter": 2.5, "au": 460.0, "period_days": 3652560.0, "inclination_deg": 20.0, "visual_radius": 165.0},
}

DETAIL_OBJECTS = {
    "Saturn": ["S_Rings", "Saturn_Rings", "Rings"],
}

SATELLITES = {
    "Titan": {"parent": "Saturn", "diameter": 0.404, "period_days": 15.945, "inclination_deg": 0.33, "visual_radius": 8.4, "color": (0.82, 0.58, 0.25, 1.0)},
    "Enceladus": {"parent": "Saturn", "diameter": 0.0395, "period_days": 1.37, "inclination_deg": 0.02, "visual_radius": 5.2, "color": (0.72, 0.86, 1.0, 1.0)},
}

EXTRA_SCENE_OBJECTS = {
    "Astroid": {"aliases": ["Astroid", "Asteroid", "Atlas31"], "name": "Atlas31", "orbit_parent": "Orbit_Mars", "visual_radius": 5.8, "scale_multiplier": 0.28},
    "Spaceship": {"aliases": ["Spaceship", "StarShip"], "name": "Spaceship", "orbit_parent": "Orbit_Mars", "visual_radius": 8.0, "scale_multiplier": 0.18},
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
    "Planet9": 0.9,
    "Titan": 15.945,
    "Enceladus": 1.37,
    "Atlas31": 0.45,
    "Spaceship": 0.35,
}


def orbit_radius_for(name: str, data: dict) -> float:
    return data.get("visual_radius") or orbit_radius(data["au"])


def reset_scene() -> None:
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete()


def import_model() -> None:
    input_path = INPUT_GLB if INPUT_GLB.exists() else ARCHIVED_INPUT_GLB
    if not input_path.exists():
        raise FileNotFoundError(f"Input not found: {INPUT_GLB} or {ARCHIVED_INPUT_GLB}")
    bpy.ops.import_scene.gltf(filepath=str(input_path))


def find_object(name: str) -> bpy.types.Object | None:
    if name in bpy.data.objects:
        return bpy.data.objects[name]
    for obj in bpy.data.objects:
        if obj.name.lower() == name.lower():
            return obj
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


def find_planet_object(name: str) -> bpy.types.Object | None:
    direct = find_object(name)
    if direct and direct.type == "MESH" and not is_helper_object(direct):
        return direct

    candidates = [
        obj for obj in bpy.data.objects
        if name.lower() in obj.name.lower()
        and has_mesh_geometry(obj)
        and not is_helper_object(obj)
    ]
    if not candidates:
        return None
    candidates.sort(key=lambda obj: (obj.type != "MESH", len(obj.name), obj.name))
    return candidates[0]


def find_detail_object(aliases: list[str]) -> bpy.types.Object | None:
    for alias in aliases:
        direct = find_object(alias)
        if direct and has_mesh_geometry(direct) and not is_helper_object(direct):
            return direct

    candidates = [
        obj for obj in bpy.data.objects
        if any(alias.lower() in obj.name.lower() for alias in aliases)
        and has_mesh_geometry(obj)
        and not is_helper_object(obj)
    ]
    if not candidates:
        return None
    candidates.sort(key=lambda obj: (obj.type != "MESH", len(obj.name), obj.name))
    return candidates[0]


def find_named_scene_object(aliases: list[str]) -> bpy.types.Object | None:
    for alias in aliases:
        direct = find_object(alias)
        if direct and has_mesh_geometry(direct) and not is_helper_object(direct):
            return direct

    candidates = [
        obj for obj in bpy.data.objects
        if any(alias.lower() in obj.name.lower() for alias in aliases)
        and has_mesh_geometry(obj)
        and not is_helper_object(obj)
    ]
    if not candidates:
        return None
    candidates.sort(key=lambda obj: (obj.type != "MESH", len(obj.name), obj.name))
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


def make_material(name: str, color: tuple[float, float, float, float]) -> bpy.types.Material:
    material = bpy.data.materials.new(name)
    material.diffuse_color = color
    return material


def create_sphere_body(name: str, visual_diameter: float, color: tuple[float, float, float, float]) -> bpy.types.Object:
    bpy.ops.mesh.primitive_uv_sphere_add(segments=48, ring_count=24, radius=visual_diameter * 0.5, location=(0, 0, 0))
    obj = bpy.context.object
    obj.name = name
    obj.data.name = f"{name}_Mesh"
    obj.data.materials.append(make_material(f"{name}_Material", color))
    bpy.context.view_layer.update()
    return obj


def scale_object_by_diameter(obj: bpy.types.Object, target_diameter: float) -> None:
    current = diameter(obj)
    if current <= 0:
        return
    obj.scale = obj.scale * (target_diameter / current)
    bpy.context.view_layer.update()


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


def detach_details() -> dict[str, list[bpy.types.Object]]:
    details: dict[str, list[bpy.types.Object]] = {}
    for owner, aliases in DETAIL_OBJECTS.items():
        obj = find_detail_object(aliases)
        if not obj:
            continue
        matrix = obj.matrix_world.copy()
        obj.parent = None
        obj.matrix_world = matrix
        details.setdefault(owner, []).append(obj)
        print(f"[Detach] Kept detail for {owner}: {obj.name}")
    return details


def detach_extra_scene_objects() -> dict[str, bpy.types.Object]:
    extras: dict[str, bpy.types.Object] = {}
    for key, config in EXTRA_SCENE_OBJECTS.items():
        obj = find_named_scene_object(config["aliases"])
        if not obj:
            print(f"[Detach] Missing extra scene object: {key}")
            continue
        matrix = obj.matrix_world.copy()
        obj.parent = None
        obj.matrix_world = matrix
        obj.name = config["name"]
        extras[config["name"]] = obj
        print(f"[Detach] Kept extra scene object: {config['name']}")
    return extras


def delete_old_helpers(planets: dict[str, bpy.types.Object], details: dict[str, list[bpy.types.Object]], extras: dict[str, bpy.types.Object]) -> None:
    keep = set(planets.values())
    keep.update(child for obj in planets.values() for child in obj.children_recursive)
    keep.update(detail for detail_list in details.values() for detail in detail_list)
    keep.update(child for detail_list in details.values() for detail in detail_list for child in detail.children_recursive)
    keep.update(extras.values())
    keep.update(child for obj in extras.values() for child in obj.children_recursive)
    solar_tokens = {
        name.lower()
        for name in [
            "Sun",
            *PLANETS.keys(),
            *SATELLITES.keys(),
            *sum(DETAIL_OBJECTS.values(), []),
            *sum((config["aliases"] for config in EXTRA_SCENE_OBJECTS.values()), []),
        ]
    }

    for obj in list(bpy.data.objects):
        if obj in keep:
            continue
        is_duplicate_solar_body = any(token in obj.name.lower() for token in solar_tokens)
        if is_helper_object(obj) or is_duplicate_solar_body or (obj.type == "EMPTY" and not has_mesh_geometry(obj)):
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


def apply_model_metadata(root: bpy.types.Object | None = None) -> None:
    for key, value in MODEL_METADATA.items():
        bpy.context.scene[key] = value
        if root:
            root[key] = value
    if root:
        root["model_version"] = "solar-system.real-orbits.topic-earth"
        root["scale_mode"] = "readable-compressed"
        root["animation"] = GLTF_ANIMATION_TRACK


def orbit_radius(au: float) -> float:
    return EARTH_ORBIT_RADIUS * (au ** ORBIT_DISTANCE_EXPONENT)


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


def make_spin_pivot(name: str, orbit_pivot: bpy.types.Object | None, local_position: Vector) -> bpy.types.Object:
    spin = make_empty(f"Spin_{name}", parent=orbit_pivot)
    spin.location = local_position
    return spin


def parent_visible_center_to_spin(obj: bpy.types.Object, spin: bpy.types.Object) -> None:
    obj.parent = spin
    obj.matrix_parent_inverse.identity()
    obj.location = Vector((0, 0, 0))
    obj.rotation_euler = (0, 0, 0)
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


def make_orbit_curves() -> None:
    material = bpy.data.materials.new("Orbit_Line_Cyan_Linked")
    material.diffuse_color = (0.2, 0.75, 1.0, 0.32)

    for planet_name, data in PLANETS.items():
        if planet_name == "Moon":
            continue
        radius = orbit_radius_for(planet_name, data)
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
        obj.rotation_euler.x = math.radians(data["inclination_deg"] * ORBIT_INCLINATION_SCALE)
        bpy.context.collection.objects.link(obj)

    satellite_material = bpy.data.materials.new("Satellite_Orbit_Line_Cyan_Linked")
    satellite_material.diffuse_color = (0.48, 0.88, 1.0, 0.28)
    saturn_radius = orbit_radius_for("Saturn", PLANETS["Saturn"])
    for satellite_name, data in SATELLITES.items():
        if data["parent"] != "Saturn":
            continue
        radius = data["visual_radius"]
        curve = bpy.data.curves.new(f"OrbitPath_{satellite_name}", type="CURVE")
        curve.dimensions = "3D"
        curve.resolution_u = 12
        curve.bevel_depth = 0.008
        curve.materials.append(satellite_material)
        spline = curve.splines.new("POLY")
        points = 96
        spline.points.add(points)
        for index in range(points + 1):
            angle = math.tau * index / points
            spline.points[index].co = (saturn_radius + math.cos(angle) * radius, math.sin(angle) * radius, 0, 1)
        obj = bpy.data.objects.new(f"OrbitPath_{satellite_name}", curve)
        obj.rotation_euler.x = math.radians(data["inclination_deg"] * ORBIT_INCLINATION_SCALE)
        bpy.context.collection.objects.link(obj)


def add_poly_curve(name: str, points: list[Vector], material: bpy.types.Material, bevel_depth: float = 0.018) -> bpy.types.Object:
    curve = bpy.data.curves.new(name, type="CURVE")
    curve.dimensions = "3D"
    curve.resolution_u = 1
    curve.bevel_depth = bevel_depth
    curve.materials.append(material)
    spline = curve.splines.new("POLY")
    spline.points.add(len(points) - 1)
    for index, point in enumerate(points):
        spline.points[index].co = (point.x, point.y, point.z, 1)
    obj = bpy.data.objects.new(name, curve)
    bpy.context.collection.objects.link(obj)
    return obj


def make_scale_cotation_guides() -> None:
    material = bpy.data.materials.new("Scale_Guide_Yellow_Compressed")
    material.diffuse_color = (1.0, 0.72, 0.16, 0.62)
    earth_radius = orbit_radius(PLANETS["Earth"]["au"])
    y_step = 0.46
    break_size = 0.38

    for index, (planet_name, data) in enumerate(PLANETS.items()):
        if planet_name in {"Earth", "Moon"}:
            continue
        radius = orbit_radius_for(planet_name, data)
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


def scale_universe_shell() -> None:
    universe = find_named_scene_object(["Universe"])
    if not universe:
        return
    scale_object_by_diameter(universe, UNIVERSE_SCENE_DIAMETER)
    universe.location = Vector((0, 0, 0))
    print(f"[Universe] Scaled Universe shell to {UNIVERSE_SCENE_DIAMETER:.2f} diameter for Planet9 margin")


def rebuild_orbits(planets: dict[str, bpy.types.Object], details: dict[str, list[bpy.types.Object]], extras: dict[str, bpy.types.Object]) -> None:
    sun = planets.get("Sun")
    earth = planets.get("Earth")
    if not sun or not earth:
        raise RuntimeError("Need Sun and Earth objects to rebuild orbits.")

    sun_spin = make_spin_pivot("Sun", None, Vector((0, 0, 0)))
    sun.scale = sun.scale * SUN_VISUAL_SCALE_MULTIPLIER
    force_mesh_origin_to_geometry(sun)
    parent_visible_center_to_spin(sun, sun_spin)
    animate_spin(sun_spin, "Sun")

    root = make_empty("Orbit_System_Root")
    root.location = Vector((0, 0, 0))
    apply_model_metadata(root)
    pivots: dict[str, bpy.types.Object] = {}

    for planet_name, data in PLANETS.items():
        obj = planets.get(planet_name)
        if not obj and planet_name == "Planet9":
            obj = create_sphere_body("Planet9", max(diameter(earth) * 0.9, 1.0), (0.35, 0.52, 0.95, 1.0))
            planets[planet_name] = obj
        if not obj:
            continue
        force_mesh_origin_to_geometry(obj)

        if planet_name == "Moon":
            earth_pivot = pivots.get("Earth")
            if not earth_pivot:
                continue
            pivot = make_empty("Orbit_Moon", parent=earth_pivot)
            pivot.location = Vector((orbit_radius_for("Earth", PLANETS["Earth"]), 0, 0))
            moon_distance = max(diameter(planets["Earth"]) * MOON_ORBIT_RADIUS_MULTIPLIER, MOON_MIN_ORBIT_RADIUS)
            spin = make_spin_pivot(planet_name, pivot, Vector((moon_distance, 0, 0)))
        else:
            pivot = make_empty(f"Orbit_{planet_name}", parent=root)
            pivot.location = Vector((0, 0, 0))
            pivot.rotation_euler.x = math.radians(data["inclination_deg"] * ORBIT_INCLINATION_SCALE)
            spin = make_spin_pivot(planet_name, pivot, Vector((orbit_radius_for(planet_name, data), 0, 0)))

        parent_visible_center_to_spin(obj, spin)
        for detail in details.get(planet_name, []):
            parent_visible_center_to_spin(detail, spin)
        animate_orbit(pivot, data["period_days"])
        animate_spin(spin, planet_name)
        pivots[planet_name] = pivot
        print(f"[Orbit] {planet_name} linked to {pivot.name}; spin={spin.name}; radius={spin.location.length:.3f}")

    for satellite_name, data in SATELLITES.items():
        parent_pivot = pivots.get(data["parent"])
        if not parent_pivot:
            continue
        visual_diameter = max(diameter(earth) * data["diameter"], 0.42 if satellite_name == "Enceladus" else 0.8)
        obj = create_sphere_body(satellite_name, visual_diameter, data["color"])
        pivot = make_empty(f"Orbit_{satellite_name}", parent=parent_pivot)
        pivot.location = Vector((orbit_radius_for(data["parent"], PLANETS[data["parent"]]), 0, 0))
        pivot.rotation_euler.x = math.radians(data["inclination_deg"] * ORBIT_INCLINATION_SCALE)
        spin = make_spin_pivot(satellite_name, pivot, Vector((data["visual_radius"], 0, 0)))
        parent_visible_center_to_spin(obj, spin)
        animate_orbit(pivot, data["period_days"])
        animate_spin(spin, satellite_name)
        pivots[satellite_name] = pivot
        print(f"[Satellite] {satellite_name} linked to {pivot.name}; parent={data['parent']}; radius={spin.location.length:.3f}")

    mars_pivot = pivots.get("Mars")
    for object_name, obj in extras.items():
        config = next((item for item in EXTRA_SCENE_OBJECTS.values() if item["name"] == object_name), None)
        if not config or not mars_pivot:
            continue
        scale_object_by_diameter(obj, max(diameter(earth) * config["scale_multiplier"], 0.45))
        spin = make_spin_pivot(object_name, mars_pivot, Vector((orbit_radius_for("Mars", PLANETS["Mars"]) + config["visual_radius"], 0, 0)))
        parent_visible_center_to_spin(obj, spin)
        animate_spin(spin, object_name)
        print(f"[Extra] {object_name} linked near Mars; radius={spin.location.length:.3f}")

    make_orbit_curves()
    # Distance cotation guides are intentionally not baked into the default
    # model. They work better as a one-at-a-time topic/UI overlay.
    scale_universe_shell()


def export_model() -> None:
    OUTPUT_GLB.parent.mkdir(parents=True, exist_ok=True)
    move_actions_to_shared_nla_track()
    bpy.ops.export_scene.gltf(
        filepath=str(OUTPUT_GLB),
        export_format="GLB",
        export_yup=True,
        export_apply=True,
        export_animations=True,
        export_extras=True,
        export_animation_mode="NLA_TRACKS",
        export_merge_animation="NLA_TRACK",
        export_nla_strips_merged_animation_name=GLTF_ANIMATION_TRACK,
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
    details = detach_details()
    extras = detach_extra_scene_objects()
    delete_old_helpers(planets, details, extras)
    rebuild_orbits(planets, details, extras)
    export_model()
    print(f"[Done] Exported linked orbit GLB: {OUTPUT_GLB}")


main()
