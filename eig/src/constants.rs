/*
 * Copyright (c) 2020. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

pub const ROOT3:f32 = 1.732_050_8;
pub const ROOT5:f32 = 2.236_068;
pub const PHI:f32 = (1f32 + ROOT5) / 2f32;
pub const ROOT6:f32 = 2.449_489_8;

#[repr(u8)]
#[derive(Clone, Copy, Debug, PartialEq, Eq, PartialOrd)]
pub enum Stage {
    Growing,
    Shaping,
    Slack,
    Pretensing,
    Pretenst,
}

#[repr(u8)]
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum SurfaceCharacter {
    Frozen,
    Sticky,
    Bouncy,
}

#[repr(u8)]
#[derive(Clone, Copy, Debug, Hash, PartialEq, Eq)]
pub enum WorldFeature {
    VisualStrain,
    IterationsPerFrame,
    Gravity,
    PretenstFactor,
    StiffnessFactor,
    Viscosity,
    ShapingPretenstFactor,
    ShapingViscosity,
    ShapingStiffnessFactor,
    Antigravity,
    IntervalCountdown,
    PretensingCountdown,
}

pub fn default_world_feature(fabric_feature: WorldFeature) -> f32 {
    match fabric_feature {
        WorldFeature::Gravity => 2e-7_f32,
        WorldFeature::Antigravity => 0.001_f32,
        WorldFeature::ShapingViscosity => 1.0e5f32,
        WorldFeature::Viscosity => 1.0e4f32,
        WorldFeature::ShapingPretenstFactor => 0.3_f32,
        WorldFeature::PretenstFactor => 0.03_f32,
        WorldFeature::ShapingStiffnessFactor => 0.0005_f32,
        WorldFeature::StiffnessFactor => 0.01_f32,
        WorldFeature::IterationsPerFrame => 100_f32,
        WorldFeature::IntervalCountdown => 2000_f32,
        WorldFeature::PretensingCountdown => 10000_f32,
        WorldFeature::VisualStrain => 1_f32,
    }
}
