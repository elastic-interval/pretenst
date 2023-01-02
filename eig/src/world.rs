/*
 * Copyright (c) 2020. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

use crate::constants::*;

pub struct World {
    pub(crate) surface_character: SurfaceCharacter,
    pub(crate) gravity: f32,
    pub(crate) viscosity: f32,
    pub(crate) pretenst_factor: f32,
    pub(crate) stiffness_factor: f32,
    pub(crate) shaping_pretenst_factor: f32,
    pub(crate) shaping_viscosity: f32,
    pub(crate) shaping_stiffness_factor: f32,
    pub(crate) visual_strain: f32,
    pub(crate) antigravity: f32,
}

impl Default for World {
    fn default() -> Self {
        World {
            surface_character: SurfaceCharacter::Bouncy,
            gravity: default_world_feature(WorldFeature::Gravity),
            viscosity: default_world_feature(WorldFeature::Viscosity),
            pretenst_factor: default_world_feature(WorldFeature::PretenstFactor),
            stiffness_factor: default_world_feature(WorldFeature::StiffnessFactor),
            shaping_pretenst_factor: default_world_feature(WorldFeature::ShapingPretenstFactor),
            shaping_viscosity: default_world_feature(WorldFeature::ShapingViscosity),
            shaping_stiffness_factor: default_world_feature(WorldFeature::ShapingStiffnessFactor),
            visual_strain: default_world_feature(WorldFeature::VisualStrain),
            antigravity: default_world_feature(WorldFeature::Antigravity),
        }
    }
}

impl World {
    pub fn set_surface_character(&mut self, surface_character: SurfaceCharacter) {
        self.surface_character = surface_character;
    }

    pub fn get_float_value(&self, feature: WorldFeature) -> f32 {
        match feature {
            WorldFeature::Gravity => self.gravity,
            WorldFeature::Viscosity => self.viscosity,
            WorldFeature::PretenstFactor => self.pretenst_factor,
            WorldFeature::StiffnessFactor => self.stiffness_factor,
            WorldFeature::ShapingPretenstFactor => self.shaping_pretenst_factor,
            WorldFeature::ShapingViscosity => self.shaping_viscosity,
            WorldFeature::ShapingStiffnessFactor => self.shaping_stiffness_factor,
            WorldFeature::VisualStrain => self.visual_strain,
            WorldFeature::Antigravity => self.antigravity,
        }
    }

    pub fn set_float_value(&mut self, feature: WorldFeature, value: f32) -> f32 {
        let value_pointer: &mut f32 = match feature {
            WorldFeature::Gravity => &mut self.gravity,
            WorldFeature::Viscosity => &mut self.viscosity,
            WorldFeature::PretenstFactor => &mut self.pretenst_factor,
            WorldFeature::StiffnessFactor => &mut self.stiffness_factor,
            WorldFeature::ShapingPretenstFactor => &mut self.shaping_pretenst_factor,
            WorldFeature::ShapingViscosity => &mut self.shaping_viscosity,
            WorldFeature::ShapingStiffnessFactor => &mut self.shaping_stiffness_factor,
            WorldFeature::VisualStrain => &mut self.visual_strain,
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
