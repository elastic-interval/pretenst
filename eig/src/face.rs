/*
 * Copyright (c) 2020. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */
use nalgebra::*;

use crate::interval::Interval;
use crate::joint::Joint;
use crate::view::View;

#[derive(Clone, Copy)]
pub struct Face {
    joints: [usize; 3],
}

impl Face {
    pub fn new(joint0: usize, joint1: usize, joint2: usize) -> Face {
        Face {
            joints: [joint0, joint1, joint2],
        }
    }

    pub fn joint_removed(&mut self, index: usize) {
        self.joints.iter_mut().for_each(|joint_index| {
            if *joint_index > index {
                *joint_index = *joint_index - 1
            }
        })
    }

    pub fn _joint<'a>(&self, joints: &'a Vec<Joint>, index: usize) -> &'a Joint {
        &joints[self.joints[index]]
    }

    pub fn _joint_mut<'a>(&self, joints: &'a mut Vec<Joint>, index: usize) -> &'a mut Joint {
        &mut joints[self.joints[index]]
    }

    pub fn project_midpoint_vector(&self, joints: &Vec<Joint>, mid: &mut Vector3<f32>) {
        mid.fill(0.0);
        *mid += &joints[self.joints[0]].location.coords;
        *mid += &joints[self.joints[1]].location.coords;
        *mid += &joints[self.joints[2]].location.coords;
        *mid /= 3.0;
    }

    pub fn _project_midpoint(&self, joints: &Vec<Joint>, mid: &mut Point3<f32>) {
        self.project_midpoint_vector(joints, &mut mid.coords);
    }

    pub fn project_normal(&self, joints: &Vec<Joint>, normal: &mut Vector3<f32>) {
        normal.fill(0.0);
        let location0 = &joints[self.joints[0]].location.coords;
        let location1 = &joints[self.joints[1]].location.coords;
        let location2 = &joints[self.joints[2]].location.coords;
        let aa = location1 - location0;
        let bb = location2 - location0;
        aa.cross(&bb).normalize();
        *normal = aa
    }

    pub fn project_features(&self, joints: &Vec<Joint>, view: &mut View) {
        let mut midpoint: Vector3<f32> = zero();
        self.project_midpoint_vector(joints, &mut midpoint);
        view.face_midpoints.push(midpoint.x);
        view.face_midpoints.push(midpoint.y);
        view.face_midpoints.push(midpoint.z);
        let mut normal: Vector3<f32> = zero();
        self.project_normal(joints, &mut normal);
        for index in 0..3 {
            let location = &joints[self.joints[index]].location;
            view.face_vertex_locations.push(location.x);
            view.face_vertex_locations.push(location.y);
            view.face_vertex_locations.push(location.z);
            view.face_normals.push(normal.x);
            view.face_normals.push(normal.y);
            view.face_normals.push(normal.z);
        }
    }

    pub fn twitch(
        &self,
        intervals: &mut Vec<Interval>,
        attack_countdown: f32,
        decay_countdown: f32,
        delta_size_nuance: f32,
    ) {
        for interval in intervals.iter_mut().filter(|i| self.contains_interval(i)) {
            interval.twitch(attack_countdown, decay_countdown, delta_size_nuance)
        }
    }

    fn contains_interval(&self, interval: &Interval) -> bool {
        return self.contains_joint(interval.alpha_index)
            && self.contains_joint(interval.omega_index);
    }

    fn contains_joint(&self, joint_index: usize) -> bool {
        for index in 0..3 {
            if self.joints[index] == joint_index {
                return true;
            }
        }
        return false;
    }
}
