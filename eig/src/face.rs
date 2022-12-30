/*
 * Copyright (c) 2020. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */
use cgmath::{EuclideanSpace, InnerSpace, Point3, Vector3};
use crate::fabric::{Fabric, UniqueId};

use crate::interval::Interval;
use crate::joint::Joint;
use crate::tenscript::Spin;

#[derive(Clone, Debug)]
pub struct Face {
    pub id: UniqueId,
    pub scale: f32,
    pub spin: Spin,
    pub radial_intervals: [UniqueId; 3],
    pub push_intervals: [UniqueId; 3],
}

impl Face {
    pub fn midpoint(&self, joints: &[Joint], fabric: &Fabric) -> Vector3<f32> {
        let loc = self.radial_joint_locations(joints, fabric);
        (loc[0].to_vec() + loc[1].to_vec() + loc[2].to_vec()) / 3.0
    }

    pub fn normal(&self, joints: &[Joint], fabric: &Fabric) -> Vector3<f32> {
        let loc = self.radial_joint_locations(joints, fabric);
        let v1 = loc[1] - loc[0];
        let v2 = loc[2] - loc[0];
        v1.cross(v2).normalize()
    }

    pub fn radial_joint_locations(&self, joints: &[Joint], fabric: &Fabric) -> [Point3<f32>; 3] {
        self.radial_joints(fabric)
            .map(|joint_index| joints[joint_index])
            .map(|Joint { location, .. }| location)
    }

    pub fn middle_joint(&self, fabric: &Fabric) -> usize {
        fabric.find_interval(self.radial_intervals[0]).alpha_index
    }

    pub fn radial_joints(&self, fabric: &Fabric) -> [usize; 3] {
        self.radial_intervals
            .map(|id| fabric.find_interval(id))
            .map(|Interval { omega_index, .. }| *omega_index)
    }
}
