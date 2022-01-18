/*
 * Copyright (c) 2020. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */
use nalgebra::*;

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

    pub fn midpoint(&self, joints: &Vec<Joint>) -> Vector3<f32> {
        (&joints[self.joints[0]].location.coords +
            &joints[self.joints[1]].location.coords +
            &joints[self.joints[2]].location.coords) / 3.0
    }

    pub fn normal(&self, joints: &Vec<Joint>) -> Vector3<f32> {
        let location0 = &joints[self.joints[0]].location;
        let location1 = &joints[self.joints[1]].location;
        let location2 = &joints[self.joints[2]].location;
        let aa = location1 - location0;
        let bb = location2 - location0;
        aa.cross(&bb).normalize()
    }

    pub fn project_features(&self, joints: &Vec<Joint>, view: &mut View) {
        let midpoint = self.midpoint(joints);
        view.face_midpoints.push(midpoint.x);
        view.face_midpoints.push(midpoint.y);
        view.face_midpoints.push(midpoint.z);
        let normal = self.normal(joints);
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
}
