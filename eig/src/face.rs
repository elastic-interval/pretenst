/*
 * Copyright (c) 2020. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */
use cgmath::{EuclideanSpace, InnerSpace, Point3, Vector3};
use crate::fabric::{Fabric, JointMap, UniqueId};

use crate::interval::Interval;
use crate::joint::Joint;
use crate::tenscript::{FaceName, Mark, TenscriptNode};
use crate::view::View;

#[derive(Clone, Debug)]
pub struct Face {
    pub id: UniqueId,
    pub name: FaceName,
    pub scale: f32,
    pub left_handed: bool,
    pub node: Option<TenscriptNode>,
    pub marks: Vec<Mark>,
    pub radial_intervals: [UniqueId; 3],
    pub push_intervals: [UniqueId; 3],
}

impl Face {
    pub fn midpoint(&self, joints: &JointMap, fabric: &Fabric) -> Vector3<f32> {
        let loc = self.radial_joint_locations(joints, fabric);
        (loc[0].to_vec() + loc[1].to_vec() + loc[2].to_vec()) / 3.0
    }

    pub fn normal(&self, joints:  &JointMap, fabric: &Fabric) -> Vector3<f32> {
        let loc = self.radial_joint_locations(joints, fabric);
        let v1 = loc[1] - loc[0];
        let v2 = loc[2] - loc[0];
        v1.cross(v2).normalize()
    }

    pub fn radial_joint_locations(&self, joints: &JointMap, fabric: &Fabric) -> [Point3<f32>; 3] {
        self.radial_joints(fabric)
            .map(|joint_id| joints.get(&joint_id).unwrap())
            .map(|Joint { location, .. }| *location)
    }

    pub fn project_features(&self, joints: &JointMap, fabric: &Fabric, view: &mut View) {
        let midpoint = self.midpoint(joints, fabric);
        view.face_midpoints.push(midpoint.x);
        view.face_midpoints.push(midpoint.y);
        view.face_midpoints.push(midpoint.z);
        let normal = self.normal(joints, fabric);
        for location in self.radial_joint_locations(joints, fabric) {
            view.face_vertex_locations.push(location.x);
            view.face_vertex_locations.push(location.y);
            view.face_vertex_locations.push(location.z);
            view.face_normals.push(normal.x);
            view.face_normals.push(normal.y);
            view.face_normals.push(normal.z);
        }
    }

    pub fn middle_joint(&self, fabric: &Fabric) -> UniqueId {
        fabric.interval(self.radial_intervals[0]).alpha_id
    }

    pub fn radial_joints(&self, fabric: &Fabric) -> [UniqueId; 3] {
        self.radial_intervals
            .map(|id| fabric.interval(id))
            .map(|Interval { omega_id, .. }| *omega_id)
    }
}
