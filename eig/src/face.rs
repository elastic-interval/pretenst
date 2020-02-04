/*
 * Copyright (c) 2020. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */
use nalgebra::*;
use crate::*;
use joint::Joint;

pub struct Face {
    joints: [u16; 3],
    pub(crate) midpoint: Vector3<f32>,
    pub(crate) normal: Vector3<f32>,
}

impl Face {
    pub fn new(joint0: u16, joint1: u16, joint2: u16) -> Face {
        Face {
            joints: [joint0, joint1, joint2],
            midpoint: zero(),
            normal: zero(),
        }
    }

    pub fn joint<'a>(&self, joints: &'a Vec<Joint>, index: usize) -> &'a Joint {
        &joints[self.joints[index] as usize]
    }
}
