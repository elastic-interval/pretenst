/*
 * Copyright (c) 2020. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

use wasm_bindgen::prelude::*;

pub const ATTENUATED_COLOR: [f32; 3] = [0.0, 0.0, 0.0];

pub const SLACK_COLOR: [f32; 3] = [0.0, 1.0, 0.0];

pub const ROLE_COLORS: [[f32; 3]; 9] = [
    [0.3961, 0.2549, 0.7059],
    [0.1843, 0.2275, 0.7922],
    [0.7882, 0.7686, 0.2706],
    [0.9098, 0.2275, 0.8549],
    [0.3490, 0.9216, 0.7961],
    [0.1608, 0.6000, 0.5843],
    [0.9451, 0.2627, 0.0078],
    [0.7529, 0.2314, 0.0078],
    [0.9961, 0.0039, 0.0196],
];

pub const RAINBOW: [[f32; 3]; 12] = [
    [0.000, 0.000, 1.000], // 0000ff
    [0.000, 0.082, 0.780], // 0015c7
    [0.000, 0.365, 0.639], // 005da3
    [0.004, 0.502, 0.545], // 01808b
    [0.000, 0.498, 0.404], // 007f67
    [0.055, 0.306, 0.000], // 0e4e00
    [0.114, 0.424, 0.004], // 1d6c01
    [0.424, 0.537, 0.004], // 6c8901
    [0.537, 0.486, 0.000], // 897c00
    [0.835, 0.557, 0.110], // d58e1c
    [0.788, 0.310, 0.000], // c94f00
    [0.992, 0.000, 0.000], // fd0000
];

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
    Drag,
    PretenstFactor,
    IterationsPerFrame,
    IntervalCountdown,
    PretensingCountdown,
    SlackThreshold,
    ShapingPretenstFactor,
    ShapingStiffnessFactor,
    ShapingDrag,
    MaxStrain,
    VisualStrain,
    NexusPushLength,
    ColumnPushLength,
    TriangleLength,
    RingLength,
    CrossLength,
    BowMidLength,
    BowEndLength,
    RibbonPushLength,
    RibbonShortLength,
    RibbonLongLength,
    RibbonHangerLength,
    PushOverPull,
    PushRadius,
    PullRadius,
    JointRadiusFactor,
    MaxStiffness,
    StiffnessFactor,
    Antigravity,
}

const ROOT2: f32 = 1.414213562373095_f32;
const ROOT3: f32 = 1.732050807568877;
const ROOT5: f32 = 2.23606797749979;
const PHI: f32 = (1_f32 + ROOT5) / 2_f32;
const RIBBON_WIDTH: f32 = 6_f32;
const RIBBON_STEP_LENGTH: f32 = 5_f32;

fn ring() -> f32 {
    (2_f32 - 2_f32 * (2_f32 / 3_f32).sqrt()).sqrt()
}

fn cross() -> f32 {
    const CROSS1: f32 = 0.5_f32;
    const CROSS2: f32 = (PHI / 3_f32 - 1_f32 / 6_f32) * ROOT3;
    const CROSS3: f32 = PHI / 3_f32 * ROOT3 - 1_f32 + ROOT2 / ROOT3;
    (CROSS1 * CROSS1 + CROSS2 * CROSS2 + CROSS3 * CROSS3).sqrt()
}

fn ribbon_push() -> f32 {
    (RIBBON_WIDTH * RIBBON_WIDTH + RIBBON_STEP_LENGTH * RIBBON_STEP_LENGTH).sqrt()
}

#[wasm_bindgen]
pub fn default_world_feature(fabric_feature: WorldFeature) -> f32 {
    match fabric_feature {
        WorldFeature::Gravity => 0.0000001_f32,
        WorldFeature::Drag => 0.0001_f32,
        WorldFeature::PretenstFactor => 0.03_f32,
        WorldFeature::IterationsPerFrame => 50_f32,
        WorldFeature::IntervalCountdown => 2000_f32,
        WorldFeature::PretensingCountdown => 30000_f32,
        WorldFeature::SlackThreshold => 0.0001_f32,
        WorldFeature::ShapingPretenstFactor => 0.2_f32,
        WorldFeature::ShapingStiffnessFactor => 7_f32,
        WorldFeature::ShapingDrag => 0.1_f32,
        WorldFeature::MaxStrain => 0.1_f32,
        WorldFeature::VisualStrain => 1_f32,
        WorldFeature::NexusPushLength => PHI,
        WorldFeature::ColumnPushLength => ROOT2,
        WorldFeature::TriangleLength => 1_f32,
        WorldFeature::RingLength => ring(),
        WorldFeature::CrossLength => cross(),
        WorldFeature::BowMidLength => 0.4_f32,
        WorldFeature::BowEndLength => 0.6_f32,
        WorldFeature::RibbonPushLength => ribbon_push(),
        WorldFeature::RibbonShortLength => RIBBON_STEP_LENGTH / 2_f32,
        WorldFeature::RibbonLongLength => RIBBON_WIDTH,
        WorldFeature::RibbonHangerLength => 1_f32,
        WorldFeature::PushOverPull => 1_f32,
        WorldFeature::PushRadius => 0.01_f32,
        WorldFeature::PullRadius => 0.002_f32,
        WorldFeature::JointRadiusFactor => 1.5_f32,
        WorldFeature::MaxStiffness => 0.0005_f32,
        WorldFeature::StiffnessFactor => 1_f32,
        WorldFeature::Antigravity => 0.001_f32,
    }
}

#[wasm_bindgen]
#[repr(u8)]
#[derive(Clone, Copy, Debug, Hash, PartialEq, Eq)]
pub enum IntervalRole {
    NexusPush,
    ColumnPush,
    Triangle,
    Ring,
    Cross,
    BowMid,
    BowEnd,
    FaceConnector,
    FaceDistancer,
    FaceAnchor,
    RibbonPush,
    RibbonShort,
    RibbonLong,
    RibbonHanger,
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
