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
    StiffnessFactor,
    ShapingStiffnessFactor,
    IterationsPerFrame,
    IntervalCountdown,
    PretensingCountdown,
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
    VisualStrain,
    PushRadius,
    PullRadius,
    JointRadiusFactor,
}

const ROOT2: f32 = 1.414213562373095_f32;
const ROOT3: f32 = 1.732050807568877;
const ROOT5: f32 = 2.23606797749979;
const PHI: f32 = (1_f32 + ROOT5) / 2_f32;
const RIBBON_WIDTH: f32 = 6_f32;
const RIBBON_STEP_LENGTH: f32 = 6_f32;

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
        WorldFeature::Antigravity => 0.001_f32,
        WorldFeature::ShapingDrag => 0.01_f32,
        WorldFeature::Drag => 0.0001_f32,
        WorldFeature::ShapingPretenstFactor => 0.2_f32,
        WorldFeature::PretenstFactor => 0.03_f32,
        WorldFeature::ShapingStiffnessFactor => 1_f32,
        WorldFeature::StiffnessFactor => 1_f32,
        WorldFeature::IterationsPerFrame => 50_f32,
        WorldFeature::IntervalCountdown => 2000_f32,
        WorldFeature::PretensingCountdown => 30000_f32,
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
        WorldFeature::VisualStrain => 1_f32,
        WorldFeature::PushOverPull => 1_f32,
        WorldFeature::PushRadius => 0.02_f32,
        WorldFeature::PullRadius => 0.004_f32,
        WorldFeature::JointRadiusFactor => 1.5_f32,
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
    SpherePush,
    SpherePull,
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
