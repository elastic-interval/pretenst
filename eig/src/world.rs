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
    pub(crate) color_pushes: bool,
    pub(crate) color_pulls: bool,
    pub(crate) gravity: f32,
    pub(crate) drag: f32,
    pub(crate) pretenst_factor: f32,
    pub(crate) iterations_per_frame: f32,
    pub(crate) interval_countdown: f32,
    pub(crate) realizing_countdown: f32,
    pub(crate) slack_threshold: f32,
    pub(crate) shaping_pretenst_factor: f32,
    pub(crate) shaping_stiffness_factor: f32,
    pub(crate) shaping_drag: f32,
    pub(crate) max_strain: f32,
    pub(crate) visual_strain: f32,
    pub(crate) nexus_push_length: f32,
    pub(crate) column_push_length: f32,
    pub(crate) triangle_length: f32,
    pub(crate) ring_length: f32,
    pub(crate) cross_length: f32,
    pub(crate) bow_mid_length: f32,
    pub(crate) bow_end_length: f32,
    pub(crate) push_over_pull: f32,
    pub(crate) push_radius: f32,
    pub(crate) pull_radius: f32,
    pub(crate) joint_radius: f32,
    pub(crate) max_stiffness: f32,
    pub(crate) stiffness_factor: f32,
    pub(crate) antigravity: f32,
}

#[wasm_bindgen]
impl World {
    pub fn new() -> World {
        World {
            surface_character: SurfaceCharacter::Bouncy,
            push_and_pull: false,
            color_pushes: false,
            color_pulls: false,
            gravity: default_fabric_feature(FabricFeature::Gravity),
            drag: default_fabric_feature(FabricFeature::Drag),
            pretenst_factor: default_fabric_feature(FabricFeature::PretenstFactor),
            iterations_per_frame: default_fabric_feature(FabricFeature::IterationsPerFrame),
            interval_countdown: default_fabric_feature(FabricFeature::IntervalCountdown),
            realizing_countdown: default_fabric_feature(FabricFeature::RealizingCountdown),
            slack_threshold: default_fabric_feature(FabricFeature::SlackThreshold),
            shaping_pretenst_factor: default_fabric_feature(FabricFeature::ShapingPretenstFactor),
            shaping_stiffness_factor: default_fabric_feature(FabricFeature::ShapingStiffnessFactor),
            shaping_drag: default_fabric_feature(FabricFeature::ShapingDrag),
            max_strain: default_fabric_feature(FabricFeature::MaxStrain),
            visual_strain: default_fabric_feature(FabricFeature::VisualStrain),
            nexus_push_length: default_fabric_feature(FabricFeature::NexusPushLength),
            column_push_length: default_fabric_feature(FabricFeature::ColumnPushLength),
            triangle_length: default_fabric_feature(FabricFeature::TriangleLength),
            ring_length: default_fabric_feature(FabricFeature::RingLength),
            cross_length: default_fabric_feature(FabricFeature::CrossLength),
            bow_mid_length: default_fabric_feature(FabricFeature::BowMidLength),
            bow_end_length: default_fabric_feature(FabricFeature::BowEndLength),
            push_over_pull: default_fabric_feature(FabricFeature::PushOverPull),
            push_radius: default_fabric_feature(FabricFeature::PushRadius),
            pull_radius: default_fabric_feature(FabricFeature::PullRadius),
            joint_radius: default_fabric_feature(FabricFeature::JointRadius),
            max_stiffness: default_fabric_feature(FabricFeature::MaxStiffness),
            stiffness_factor: default_fabric_feature(FabricFeature::StiffnessFactor),
            antigravity: default_fabric_feature(FabricFeature::Antigravity),
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

    pub fn set_float_value(&mut self, feature: FabricFeature, value: f32) -> f32 {
        let value_pointer: &mut f32 = match feature {
            FabricFeature::Gravity => &mut self.gravity,
            FabricFeature::Drag => &mut self.drag,
            FabricFeature::PretenstFactor => &mut self.pretenst_factor,
            FabricFeature::IterationsPerFrame => &mut self.iterations_per_frame,
            FabricFeature::IntervalCountdown => &mut self.interval_countdown,
            FabricFeature::RealizingCountdown => &mut self.realizing_countdown,
            FabricFeature::SlackThreshold => &mut self.slack_threshold,
            FabricFeature::ShapingPretenstFactor => &mut self.shaping_pretenst_factor,
            FabricFeature::ShapingStiffnessFactor => &mut self.shaping_stiffness_factor,
            FabricFeature::ShapingDrag => &mut self.shaping_drag,
            FabricFeature::MaxStrain => &mut self.max_strain,
            FabricFeature::VisualStrain => &mut self.visual_strain,
            FabricFeature::NexusPushLength => &mut self.nexus_push_length,
            FabricFeature::ColumnPushLength => &mut self.column_push_length,
            FabricFeature::TriangleLength => &mut self.triangle_length,
            FabricFeature::RingLength => &mut self.ring_length,
            FabricFeature::CrossLength => &mut self.cross_length,
            FabricFeature::BowMidLength => &mut self.bow_mid_length,
            FabricFeature::BowEndLength => &mut self.bow_end_length,
            FabricFeature::PushOverPull => &mut self.push_over_pull,
            FabricFeature::PushRadius => &mut self.push_radius,
            FabricFeature::PullRadius => &mut self.pull_radius,
            FabricFeature::JointRadius => &mut self.joint_radius,
            FabricFeature::MaxStiffness => &mut self.max_stiffness,
            FabricFeature::StiffnessFactor => &mut self.stiffness_factor,
            FabricFeature::Antigravity => &mut self.antigravity,
        };
        *value_pointer = value;
        value
    }

    pub fn set_float_percent(&mut self, feature: FabricFeature, percent: f32) -> f32 {
        let value = percent * default_fabric_feature(feature) / 100_f32;
        self.set_float_value(feature, value)
    }
}
