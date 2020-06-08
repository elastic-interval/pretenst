# Copyright (c) 2020. Beautiful Code BV, Rotterdam, Netherlands
# Licensed under GNU GENERAL PUBLIC LICENSE Version 3.

import json
import math
from dataclasses import dataclass
from datetime import datetime
from os import path

import bpy
from mathutils import Vector
from bpy.props import StringProperty, PointerProperty, FloatProperty
from bpy.types import Operator
from bpy_extras.io_utils import ImportHelper

@dataclass
class Joint:
    index: int
    co: Vector
    radius: float

@dataclass
class Interval:
    index: int
    alpha: Joint
    omega: Joint
    type: str
    isPush: bool
    strain: float
    stiffness: float
    linear_density: float
    role: str
    idealLength: float
    length: float
    radius: float

def track_axis_to_vector(track_axis: str) -> Vector:
    if track_axis == "POS_X":
        return Vector((1, 0, 0))
    if track_axis == "POS_Y":
        return Vector((0, 0, 1))
    if track_axis == "POS_Z":
        return Vector((0, 1, 0))
    raise ValueError(f"Cannot convert tracking axis {track_axis}")


def create_joint_node(jt: Joint, prototype_scene: bpy.types.Scene, object_name) -> bpy.types.Object:
    joint_node = prototype_scene.objects[object_name].copy()
    joint_node.name = f"J{jt.index}-{object_name}"
    joint_node.location = jt.co
    scale = jt.radius
    joint_node.scale.x *= scale
    joint_node.scale.y *= scale
    joint_node.scale.z *= scale
    return joint_node


def create_interval_node(intv: Interval, prototype_scene: bpy.types.Scene, object_name) -> bpy.types.Object:
    alpha = intv.alpha
    omega = intv.omega

    intv_node = prototype_scene.objects[object_name].copy()
    intv_node.name = f"I{intv.index}-{object_name}"

    intv_arrow = omega.co - alpha.co
    track_axis = track_axis_to_vector(intv_node.track_axis)

    # Translation
    intv_node.location = alpha.co.lerp(omega.co, 0.5)

    # Rotation
    rotation = track_axis.rotation_difference(intv_arrow)
    intv_node.rotation_mode = 'QUATERNION'
    intv_node.rotation_quaternion = rotation

    # Scale
    intv_node.scale.x *= intv.radius
    intv_node.scale.y *= intv.radius
    intv_node.scale.z *= intv.length/2

    return intv_node


def clean_main_scene(scene: bpy.types.Scene):
    for (name, collection) in scene.collection.children.items():
        if not name.startswith("Pretenst"):
            continue
        print(f"Deleting collection '{name}'")
        for obj in collection.objects.values():
            bpy.data.objects.remove(obj, do_unlink=True)
        bpy.data.collections.remove(collection, do_unlink=True)


def joint_dict_to_dataclass(joint_dict):
    x = joint_dict['x']
    y = joint_dict['y']
    z = joint_dict['z']
    return Joint(
        index=int(joint_dict['index']),
        co=Vector((x, y, z)),
        radius=joint_dict['radius'],
    )

def interval_dict_to_dataclass(index, interval_dict, joints_dict):
    joints = interval_dict['joints']
    alpha = joints_dict[joints[0]]
    omega = joints_dict[joints[1]]
    isPush = interval_dict['isPush']
    return Interval(
        index=index,
        alpha=alpha,
        omega=omega,
        isPush=isPush,
        type=interval_dict['type'],
        strain=interval_dict['strain'],
        stiffness=interval_dict['stiffness'],
        linear_density=interval_dict['linearDensity'],
        role=interval_dict['role'],
        idealLength=interval_dict['idealLength'],
        length=interval_dict['length'],
        radius=interval_dict['radius'],
    )


def load_pretenst_from_json(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        fabric = json.load(f)
    joints = [joint_dict_to_dataclass(joint_dict) for joint_dict in fabric['joints']]
    joints_dict = {
        joint.index: joint
        for joint in joints
    }
    intervals = [
        interval_dict_to_dataclass(i, interval_dict, joints_dict)
        for i, interval_dict in enumerate(fabric['intervals'])
    ]
    return intervals, joints

class ImportPretenst(Operator, ImportHelper):
    """Import a directory of Pretenst JSON files describing a tensegrity structure"""
    bl_idname = "pretenst.do_import"
    bl_label = "Pretenst Import"

    # ImportHelper mixin class uses this
    filename_ext = ".json"

    filter_glob: StringProperty(
        default="*.json",
        options={'HIDDEN'},
        maxlen=255,  # Max internal buffer length, longer would be clamped.
    )

    def execute(self, context):
        do_import_pretenst_json(self, context)
        return {'FINISHED'}


# Only needed if you want to add into a dynamic menu
def menu_func_import(self, context):
    self.layout.operator(ImportPretenst.bl_idname, text="Pretenst JSON")


def register():
    bpy.utils.register_class(ImportPretenst)
    bpy.types.TOPBAR_MT_file_import.append(menu_func_import)


def unregister():
    bpy.utils.unregister_class(ImportPretenst)
    bpy.types.TOPBAR_MT_file_import.remove(menu_func_import)

def do_import_pretenst_json(self: ImportPretenst, context):
    intervals, joints = load_pretenst_from_json(self.filepath)
    self.report({'INFO'}, f"Pretenst: Loaded {len(intervals)} intervals from {self.filepath}.")
    _, pretenst_name = path.split(self.filepath)
    collection_name = f"Pretenst: {pretenst_name}"
    collection = bpy.data.collections.new(name=collection_name)
    main_scene = bpy.data.scenes["Scene"]
    clean_main_scene(main_scene)
    main_scene.collection.children.link(collection)
    prototype_scene = bpy.data.scenes["Prototype"]
    for interval in intervals:
        if (interval.isPush):
            collection.objects.link(create_interval_node(interval, prototype_scene, "Push"))
        else:
            collection.objects.link(create_interval_node(interval, prototype_scene, "Pull"))
    for joint in joints:
        collection.objects.link(create_joint_node(joint, prototype_scene, "Joint"))

if __name__ == "__main__":
    register()

    # test call
    bpy.ops.pretenst.do_import('INVOKE_DEFAULT')

