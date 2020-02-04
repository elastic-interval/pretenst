/*
 * Copyright (c) 2020. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */
use nalgebra::*;
use crate::*;
use joint::Joint;

pub struct Face {
    pub(crate) joints: [u16; 3],
    pub(crate) midpoint: Vector3<f32>,
    pub(crate) normal: Vector3<f32>,
}

impl Face {
    pub fn joint<'a>(&self, joints: &'a Vec<Joint>, index: usize) -> &'a Joint {
        &joints[self.joints[index] as usize]
    }
}
