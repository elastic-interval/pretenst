/*
 * Copyright (c) 2020. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

use crate::constants::*;
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub struct World {
    pub(crate) surface_character: SurfaceCharacter,
    pub(crate) push_and_pull: bool,
    pub(crate) gravity: f32,
    pub(crate) drag: f32,
    pub(crate) pretenst_factor: f32,
    pub(crate) iterations_per_frame: f32,
    pub(crate) interval_countdown: f32,
    pub(crate) pretensing_countdown: f32,
    pub(crate) shaping_pretenst_factor: f32,
    pub(crate) shaping_drag: f32,
    pub(crate) visual_strain: f32,
    pub(crate) push_over_pull: f32,
    pub(crate) antigravity: f32,
}

#[wasm_bindgen]
impl World {
    pub fn new(surface_character: SurfaceCharacter) -> World {
        World {
            surface_character,
            push_and_pull: false,
            gravity: default_world_feature(WorldFeature::Gravity),
            drag: default_world_feature(WorldFeature::Drag),
            pretenst_factor: default_world_feature(WorldFeature::PretenstFactor),
            iterations_per_frame: default_world_feature(WorldFeature::IterationsPerFrame),
            interval_countdown: default_world_feature(WorldFeature::IntervalCountdown),
            pretensing_countdown: default_world_feature(WorldFeature::PretensingCountdown),
            shaping_pretenst_factor: default_world_feature(WorldFeature::ShapingPretenstFactor),
            shaping_drag: default_world_feature(WorldFeature::ShapingDrag),
            visual_strain: default_world_feature(WorldFeature::VisualStrain),
            push_over_pull: default_world_feature(WorldFeature::PushOverPull),
            antigravity: default_world_feature(WorldFeature::Antigravity),
        }
    }

    pub fn set_surface_character(&mut self, surface_character: SurfaceCharacter) {
        self.surface_character = surface_character;
    }

    pub fn set_push_and_pull(&mut self, push_and_pull: bool) {
        self.push_and_pull = push_and_pull;
    }

    pub fn set_float_value(&mut self, feature: WorldFeature, value: f32) -> f32 {
        let value_pointer: &mut f32 = match feature {
            WorldFeature::Gravity => &mut self.gravity,
            WorldFeature::Drag => &mut self.drag,
            WorldFeature::PretenstFactor => &mut self.pretenst_factor,
            WorldFeature::IterationsPerFrame => &mut self.iterations_per_frame,
            WorldFeature::IntervalCountdown => &mut self.interval_countdown,
            WorldFeature::PretensingCountdown => &mut self.pretensing_countdown,
            WorldFeature::ShapingPretenstFactor => &mut self.shaping_pretenst_factor,
            WorldFeature::ShapingDrag => &mut self.shaping_drag,
            WorldFeature::VisualStrain => &mut self.visual_strain,
            WorldFeature::PushOverPull => &mut self.push_over_pull,
            WorldFeature::Antigravity => &mut self.antigravity,
        };
        *value_pointer = value;
        value
    }

    pub fn set_float_percent(&mut self, feature: WorldFeature, percent: f32) -> f32 {
        let value = percent * default_world_feature(feature) / 100_f32;
        self.set_float_value(feature, value)
    }
}
