/*
 * Copyright (c) 2020. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

use crate::constants::*;
use std::collections::HashMap;
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub struct World {
    pub(crate) surface_character: SurfaceCharacter,
    pub(crate) push_and_pull: bool,
    pub(crate) color_pushes: bool,
    pub(crate) color_pulls: bool,
    pub(crate) iterations_per_frame: u16,
    pub(crate) realizing_countdown: u32,
    pub(crate) float_features: HashMap<FabricFeature, f32>,
}

#[wasm_bindgen]
impl World {
    pub fn new() -> World {
        World {
            surface_character: SurfaceCharacter::Bouncy,
            push_and_pull: false,
            color_pushes: false,
            color_pulls: false,
            iterations_per_frame: 50,
            realizing_countdown: 1000,
            float_features: HashMap::new(),
        }
    }

    pub fn set_coloring(&mut self, pushes: bool, pulls: bool) {
        self.color_pushes = pushes;
        self.color_pulls = pulls;
    }

    pub fn set_surface_character(&mut self, surface_character: SurfaceCharacter) {
        self.surface_character = surface_character;
    }

    pub fn set_push_and_pull(&mut self, push_and_pull: bool) {
        self.push_and_pull = push_and_pull;
    }

    pub fn set_iterations_per_frame(&mut self, iterations: u16) {
        self.iterations_per_frame = iterations;
    }

    pub fn set_realizing_countdown(&mut self, countdown: u32) {
        self.realizing_countdown = countdown;
    }

    pub fn set_float_percent(&mut self, feature: FabricFeature, percent: f32) -> f32 {
        let value = percent * default_fabric_feature(feature) / 100_f32;
        self.float_features.insert(feature, value);
        value
    }

    pub fn get_float(&self, feature: FabricFeature) -> f32 {
        match self.float_features.get(&feature) {
            Some(value) => *value,
            None => default_fabric_feature(feature),
        }
    }
}
