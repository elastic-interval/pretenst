/*
 * Copyright (c) 2020. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

use wasm_bindgen::prelude::*;

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
    Gravity,
    Antigravity,
    ShapingDrag,
    Drag,
    ShapingPretenstFactor,
    PretenstFactor,
    IterationsPerFrame,
    IntervalCountdown,
    PretensingCountdown,
    PushOverPull,
    VisualStrain,
}

#[wasm_bindgen]
pub fn default_world_feature(fabric_feature: WorldFeature) -> f32 {
    match fabric_feature {
        WorldFeature::Gravity => 0.0000001_f32,
        WorldFeature::Antigravity => 0.001_f32,
        WorldFeature::ShapingDrag => 0.01_f32,
        WorldFeature::Drag => 0.0001_f32,
        WorldFeature::ShapingPretenstFactor => 0.3_f32,
        WorldFeature::PretenstFactor => 0.03_f32,
        WorldFeature::IterationsPerFrame => 50_f32,
        WorldFeature::IntervalCountdown => 5000_f32,
        WorldFeature::PretensingCountdown => 30000_f32,
        WorldFeature::VisualStrain => 1_f32,
        WorldFeature::PushOverPull => 1_f32,
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
