/*
 * Copyright (c) 2020. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */
use crate::*;
use joint::Joint;
use nalgebra::*;

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

    pub fn project_midpoint(&self, joints: &Vec<Joint>, mid: &mut Point3<f32>) {
        mid.coords.fill(0.0);
        mid.coords += &joints[self.joints[0] as usize].location.coords;
        mid.coords += &joints[self.joints[1] as usize].location.coords;
        mid.coords += &joints[self.joints[2] as usize].location.coords;
        mid.coords /= 3.0;
    }
}
