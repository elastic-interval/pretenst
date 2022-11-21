/*
 * Copyright (c) 2020. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */
use cgmath::{EuclideanSpace, InnerSpace, Point3, Vector3};

use crate::interval::Interval;
use crate::joint::Joint;
use crate::tenscript::{FaceName, Mark, TenscriptNode};
use crate::view::View;

#[derive(Clone, Debug)]
pub struct Face {
    pub name: FaceName,
    pub index: usize,
    pub left_handed: bool,
    pub node: Option<TenscriptNode>,
    pub marks: Vec<Mark>,
    pub radial_intervals: [usize; 3],
    pub push_intervals: [usize; 3],
}

impl Face {
    pub fn interval_removed(&mut self, index: usize) {
        self.radial_intervals.iter_mut().for_each(|interval_index| {
            if *interval_index > index {
                *interval_index -= 1
            }
        });
        self.push_intervals.iter_mut().for_each(|interval_index| {
            if *interval_index > index {
                *interval_index -= 1
            }
        });
    }

    pub fn midpoint(&self, joints: &[Joint], intervals: &Vec<Interval>) -> Vector3<f32> {
        let loc = self.radial_joint_locations(joints, intervals);
        (loc[0].to_vec() + loc[1].to_vec() + loc[2].to_vec()) / 3.0
    }

    pub fn normal(&self, joints: &[Joint], intervals: &Vec<Interval>) -> Vector3<f32> {
        let loc = self.radial_joint_locations(joints, intervals);
        let v1 = loc[1] - loc[0];
        let v2 = loc[2] - loc[0];
        v1.cross(v2).normalize()
    }

    pub fn radial_joint_locations(&self, joints: &[Joint], intervals: &Vec<Interval>) -> [Point3<f32>; 3] {
        self.radial_joints(intervals)
            .map(|joint_index| joints[joint_index])
            .map(|Joint { location, .. }| location)
    }

    pub fn project_features(&self, joints: &[Joint], intervals: &Vec<Interval>, view: &mut View) {
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

    pub fn middle_joint(&self, intervals: &Vec<Interval>) -> usize {
        intervals[self.radial_intervals[0]].alpha_index
    }

    pub fn radial_joints(&self, intervals: &Vec<Interval>) -> [usize; 3] {
        self.radial_intervals
            .map(|index| intervals[index])
            .map(|Interval { omega_index, .. }| omega_index)
    }
}
