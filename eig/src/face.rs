/*
 * Copyright (c) 2020. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */
use crate::joint::Joint;
use crate::view::View;
use nalgebra::*;

#[derive(Clone, Copy)]
pub struct Face {
    joints: [u16; 3],
}

impl Face {
    pub fn new(joint0: u16, joint1: u16, joint2: u16) -> Face {
        Face {
            joints: [joint0, joint1, joint2],
        }
    }

    pub fn joint<'a>(&self, joints: &'a Vec<Joint>, index: usize) -> &'a Joint {
        &joints[self.joints[index] as usize]
    }

    pub fn joint_mut<'a>(&self, joints: &'a mut Vec<Joint>, index: usize) -> &'a mut Joint {
        &mut joints[self.joints[index] as usize]
    }

    pub fn project_midpoint_vector(&self, joints: &Vec<Joint>, mid: &mut Vector3<f32>) {
        mid.fill(0.0);
        *mid += &joints[self.joints[0] as usize].location.coords;
        *mid += &joints[self.joints[1] as usize].location.coords;
        *mid += &joints[self.joints[2] as usize].location.coords;
        *mid /= 3.0;
    }

    pub fn project_midpoint(&self, joints: &Vec<Joint>, mid: &mut Point3<f32>) {
        self.project_midpoint_vector(joints, &mut mid.coords);
    }

    pub fn project_normal(&self, joints: &Vec<Joint>, normal: &mut Vector3<f32>) {
        normal.fill(0.0);
        let location0 = &joints[self.joints[0] as usize].location.coords;
        let location1 = &joints[self.joints[1] as usize].location.coords;
        let location2 = &joints[self.joints[2] as usize].location.coords;
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
            let location = &joints[self.joints[index] as usize].location;
            view.face_vertex_locations.push(location.x);
            view.face_vertex_locations.push(location.y);
            view.face_vertex_locations.push(location.z);
            view.face_normals.push(normal.x);
            view.face_normals.push(normal.y);
            view.face_normals.push(normal.z);
        }
    }
}
