/*
 * Copyright (c) 2020. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

use nalgebra::*;
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub struct View {
    pub(crate) midpoint: Point3<f32>,
    pub(crate) joint_locations: Vec<f32>,
    pub(crate) line_locations: Vec<f32>,
    pub(crate) line_colors: Vec<f32>,
}

#[wasm_bindgen]
impl View {
    pub fn new(joint_count: u16, interval_count: u16) -> View {
        View {
            midpoint: Point3::origin(),
            joint_locations: Vec::with_capacity((joint_count * 3) as usize),
            line_locations: Vec::with_capacity((interval_count * 2 * 3) as usize),
            line_colors: Vec::with_capacity((interval_count * 2 * 3) as usize),
        }
    }

    pub fn clear(&mut self) {
        self.midpoint.coords.fill(0.0);
        self.joint_locations.clear();
        self.line_locations.clear();
        self.line_colors.clear();
    }

    pub fn copy_line_locations_to(&self, line_locations: &mut [f32]) {
        line_locations.copy_from_slice(&self.line_locations);
    }

    pub fn copy_line_colors_to(&self, line_colors: &mut [f32]) {
        line_colors.copy_from_slice(&self.line_colors);
    }

    pub fn copy_joint_locations_to(&self, joint_locations: &mut [f32]) {
        joint_locations.copy_from_slice(&self.joint_locations);
    }
}
