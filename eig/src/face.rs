/*
 * Copyright (c) 2020. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */
use cgmath::{EuclideanSpace, InnerSpace, Vector3};
use crate::interval::Interval;
use crate::joint::Joint;
use crate::view::View;

#[derive(Clone, Copy)]
pub struct Face {
    radial_intervals: [usize; 3],
    push_intervals: [usize; 3],
}

impl Face {
    pub fn interval_removed(&mut self, index: usize) {
        self.radial_intervals.iter_mut().for_each(|joint_index| {
            if *joint_index > index {
                *joint_index = *joint_index - 1
            }
        });
        self.push_intervals.iter_mut().for_each(|joint_index| {
            if *joint_index > index {
                *joint_index = *joint_index - 1
            }
        });
    }

    pub fn radial_joints(self, intervals: &Vec<Interval>) -> [usize; 3] {
        self.radial_intervals
            .map(|index| intervals[index])
            .map(|Interval { omega_index, .. }| omega_index)
    }

    pub fn radial_joint_locations(self, joints: &Vec<Joint>, intervals: &Vec<Interval>) -> [Vector3<f32>; 3] {
        self.radial_joints(intervals)
            .map(|joint_index| joints[joint_index])
            .map(|Joint { location, .. }| location.to_vec())
    }

    pub fn middle_joint(self, intervals: &Vec<Interval>) -> usize {
        intervals[self.radial_intervals[0]].alpha_index
    }

    // pub fn _joint<'a>(&self, joints: &'a Vec<Joint>, index: usize) -> &'a Joint {
    //     &joints[self.joints[index]]
    // }
    //
    // pub fn _joint_mut<'a>(&self, joints: &'a mut Vec<Joint>, index: usize) -> &'a mut Joint {
    //     &mut joints[self.joints[index]]
    // }

    pub fn midpoint(&self, joints: &Vec<Joint>, intervals: &Vec<Interval>) -> Vector3<f32> {
        let loc = self.radial_joint_locations(joints, intervals);
        (loc[0] + loc[1] + loc[2]) / 3.0
    }

    pub fn normal(&self, joints: &Vec<Joint>, intervals: &Vec<Interval>) -> Vector3<f32> {
        let loc = self.radial_joint_locations(joints, intervals);
        let v1 = loc[1] - loc[0];
        let v2 = loc[2] - loc[0];
        v1.cross(v2).normalize()
    }

    pub fn project_features(&self, joints: &Vec<Joint>, intervals: &Vec<Interval>, view: &mut View) {
        let midpoint = self.midpoint(joints, intervals);
        view.face_midpoints.push(midpoint.x);
        view.face_midpoints.push(midpoint.y);
        view.face_midpoints.push(midpoint.z);
        let normal = self.normal(joints, intervals);
        for location in self.radial_joint_locations(joints, intervals) {
            view.face_vertex_locations.push(location.x);
            view.face_vertex_locations.push(location.y);
            view.face_vertex_locations.push(location.z);
            view.face_normals.push(normal.x);
            view.face_normals.push(normal.y);
            view.face_normals.push(normal.z);
        }
    }
}
