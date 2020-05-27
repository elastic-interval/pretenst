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
    pub(crate) realizing_countdown: f32,
    pub(crate) shaping_pretenst_factor: f32,
    pub(crate) shaping_stiffness_factor: f32,
    pub(crate) shaping_drag: f32,
    pub(crate) visual_strain: f32,
    pub(crate) nexus_push_length: f32,
    pub(crate) column_push_length: f32,
    pub(crate) triangle_length: f32,
    pub(crate) ring_length: f32,
    pub(crate) cross_length: f32,
    pub(crate) bow_mid_length: f32,
    pub(crate) bow_end_length: f32,
    pub(crate) ribbon_push_length: f32,
    pub(crate) ribbon_short_length: f32,
    pub(crate) ribbon_long_length: f32,
    pub(crate) ribbon_hanger_length: f32,
    pub(crate) push_over_pull: f32,
    pub(crate) push_radius: f32,
    pub(crate) pull_radius: f32,
    pub(crate) joint_radius: f32,
    pub(crate) stiffness_factor: f32,
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
            realizing_countdown: default_world_feature(WorldFeature::PretensingCountdown),
            shaping_pretenst_factor: default_world_feature(WorldFeature::ShapingPretenstFactor),
            shaping_stiffness_factor: default_world_feature(WorldFeature::ShapingStiffnessFactor),
            shaping_drag: default_world_feature(WorldFeature::ShapingDrag),
            visual_strain: default_world_feature(WorldFeature::VisualStrain),
            nexus_push_length: default_world_feature(WorldFeature::NexusPushLength),
            column_push_length: default_world_feature(WorldFeature::ColumnPushLength),
            triangle_length: default_world_feature(WorldFeature::TriangleLength),
            ring_length: default_world_feature(WorldFeature::RingLength),
            cross_length: default_world_feature(WorldFeature::CrossLength),
            bow_mid_length: default_world_feature(WorldFeature::BowMidLength),
            bow_end_length: default_world_feature(WorldFeature::BowEndLength),
            ribbon_push_length: default_world_feature(WorldFeature::RibbonPushLength),
            ribbon_short_length: default_world_feature(WorldFeature::RibbonShortLength),
            ribbon_long_length: default_world_feature(WorldFeature::RibbonLongLength),
            ribbon_hanger_length: default_world_feature(WorldFeature::RibbonHangerLength),
            push_over_pull: default_world_feature(WorldFeature::PushOverPull),
            push_radius: default_world_feature(WorldFeature::PushRadius),
            pull_radius: default_world_feature(WorldFeature::PullRadius),
            joint_radius: default_world_feature(WorldFeature::JointRadiusFactor),
            stiffness_factor: default_world_feature(WorldFeature::StiffnessFactor),
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
            WorldFeature::PretensingCountdown => &mut self.realizing_countdown,
            WorldFeature::ShapingPretenstFactor => &mut self.shaping_pretenst_factor,
            WorldFeature::ShapingStiffnessFactor => &mut self.shaping_stiffness_factor,
            WorldFeature::ShapingDrag => &mut self.shaping_drag,
            WorldFeature::VisualStrain => &mut self.visual_strain,
            WorldFeature::NexusPushLength => &mut self.nexus_push_length,
            WorldFeature::ColumnPushLength => &mut self.column_push_length,
            WorldFeature::TriangleLength => &mut self.triangle_length,
            WorldFeature::RingLength => &mut self.ring_length,
            WorldFeature::CrossLength => &mut self.cross_length,
            WorldFeature::BowMidLength => &mut self.bow_mid_length,
            WorldFeature::BowEndLength => &mut self.bow_end_length,
            WorldFeature::RibbonPushLength => &mut self.ribbon_push_length,
            WorldFeature::RibbonShortLength => &mut self.ribbon_short_length,
            WorldFeature::RibbonLongLength => &mut self.ribbon_long_length,
            WorldFeature::RibbonHangerLength => &mut self.ribbon_hanger_length,
            WorldFeature::PushOverPull => &mut self.push_over_pull,
            WorldFeature::PushRadius => &mut self.push_radius,
            WorldFeature::PullRadius => &mut self.pull_radius,
            WorldFeature::JointRadiusFactor => &mut self.joint_radius,
            WorldFeature::StiffnessFactor => &mut self.stiffness_factor,
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
