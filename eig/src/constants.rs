/*
 * Copyright (c) 2020. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

use wasm_bindgen::prelude::*;

pub const ROOT3:f32 = 1.732050807568877;
pub const ROOT5:f32 = 2.23606797749979;
pub const PHI:f32 = (1f32 + ROOT5) / 2f32;
pub const ROOT6:f32 = 2.44948974278;

#[wasm_bindgen]
#[repr(u8)]
#[derive(Clone, Copy, Debug, PartialEq, Eq, PartialOrd)]
pub enum Stage {
    Growing,
    Shaping,
    Slack,
    Pretensing,
    Pretenst,
}

#[wasm_bindgen]
#[repr(u8)]
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum SurfaceCharacter {
    Frozen,
    Sticky,
    Bouncy,
}

#[wasm_bindgen]
#[repr(u8)]
#[derive(Clone, Copy, Debug, Hash, PartialEq, Eq)]
pub enum WorldFeature {
    VisualStrain,
    IterationsPerFrame,
    Gravity,
    PretenstFactor,
    StiffnessFactor,
    PushOverPull,
    Drag,
    ShapingPretenstFactor,
    ShapingDrag,
    ShapingStiffnessFactor,
    Antigravity,
    IntervalCountdown,
    PretensingCountdown,
}

#[wasm_bindgen]
pub fn default_world_feature(fabric_feature: WorldFeature) -> f32 {
    match fabric_feature {
        WorldFeature::Gravity => 2e-7_f32,
        WorldFeature::Antigravity => 0.001_f32,
        WorldFeature::ShapingDrag => 0.0005_f32,
        WorldFeature::Drag => 0.0001_f32,
        WorldFeature::ShapingPretenstFactor => 0.3_f32,
        WorldFeature::PretenstFactor => 0.03_f32,
        WorldFeature::ShapingStiffnessFactor => 0.0005_f32,
        WorldFeature::StiffnessFactor => 0.01_f32,
        WorldFeature::IterationsPerFrame => 50_f32,
        WorldFeature::IntervalCountdown => 2000_f32,
        WorldFeature::PretensingCountdown => 10000_f32,
        WorldFeature::VisualStrain => 1_f32,
        WorldFeature::PushOverPull => 3_f32,
    }
}

#[wasm_bindgen]
extern "C" {
    // Use `js_namespace` here to bind `console.log(..)` instead of just
    // `log(..)`
    #[wasm_bindgen(js_namespace = console)]
    pub fn log(s: &str);

    // The `console.log` is quite polymorphic, so we can bind it with multiple
    // signatures. Note that we need to use `js_name` to ensure we always call
    // `log` in JS.
    #[wasm_bindgen(js_namespace = console, js_name = log)]
    pub fn log_f32(s: &str, a: f32);

    // The `console.log` is quite polymorphic, so we can bind it with multiple
    // signatures. Note that we need to use `js_name` to ensure we always call
    // `log` in JS.
    #[wasm_bindgen(js_namespace = console, js_name = log)]
    pub fn log_u32(s: &str, a: u32);
}
