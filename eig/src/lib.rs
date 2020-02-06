mod constants;
mod fabric;
mod face;
mod interval;
mod joint;

use fabric::*;
use nalgebra::*;
use std::collections::HashMap;
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
#[repr(u8)]
#[derive(Clone, Copy, Debug, PartialEq, Eq, PartialOrd)]
pub enum Stage {
    Busy,
    Growing,
    Shaping,
    Slack,
    Realizing,
    Realized,
}

#[wasm_bindgen]
#[repr(u8)]
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum SurfaceCharacter {
    Frozen,
    Sticky,
    Slippery,
    Bouncy,
}

#[wasm_bindgen]
#[repr(u8)]
#[derive(Clone, Copy, Debug, Hash, PartialEq, Eq)]
pub enum FabricFeature {
    Gravity,
    Drag,
    PretenstFactor,
    IterationsPerFrame,
    IntervalCountdown,
    RealizingCountdown,
    FacePullEndZone,
    FacePullOrientationForce,
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
    NexusCrossLength,
    ColumnCrossLength,
    BowMidLength,
    BowEndLength,
    PushOverPull,
    PushRadiusFactor,
    PullRadiusFactor,
    MaxStiffness,
}

#[wasm_bindgen]
pub fn default_fabric_feature(fabric_feature: FabricFeature) -> f32 {
    let one: f32 = 1.0;
    let two: f32 = 2.0;
    let three: f32 = 3.0;
    let five: f32 = 5.0;
    let six: f32 = 6.0;
    let two_thirds: f32 = two / three;
    let phi: f32 = (one + five.sqrt()) / two;
    let rt2: f32 = two.sqrt();
    let rt3: f32 = three.sqrt();
    let ring: f32 = (two - two * two_thirds.sqrt()).sqrt();
    let t1: f32 = 0.5;
    let t2: f32 = (phi / three - one / six) * rt3;
    let t3: f32 = phi / three * rt3 - one + rt2 / rt3;
    let cross: f32 = (t1 * t1 + t2 * t2 + t3 * t3).sqrt();

    match fabric_feature {
        FabricFeature::Gravity => 0.0000001_f32,
        FabricFeature::Drag => 0.0001_f32,
        FabricFeature::PretenstFactor => 0.03_f32,
        FabricFeature::IterationsPerFrame => 100_f32,
        FabricFeature::IntervalCountdown => 1000_f32,
        FabricFeature::RealizingCountdown => 30000_f32,
        FabricFeature::FacePullEndZone => 4_f32,
        FabricFeature::FacePullOrientationForce => 0.0001_f32,
        FabricFeature::SlackThreshold => 0.0001_f32,
        FabricFeature::ShapingPretenstFactor => 0.1_f32,
        FabricFeature::ShapingStiffnessFactor => 10_f32,
        FabricFeature::ShapingDrag => 0.1_f32,
        FabricFeature::MaxStrain => 0.1_f32,
        FabricFeature::VisualStrain => 1_f32,
        FabricFeature::NexusPushLength => phi,
        FabricFeature::ColumnPushLength => rt2,
        FabricFeature::TriangleLength => one,
        FabricFeature::RingLength => ring,
        FabricFeature::NexusCrossLength => cross,
        FabricFeature::ColumnCrossLength => one,
        FabricFeature::BowMidLength => 0.4_f32,
        FabricFeature::BowEndLength => 0.6_f32,
        FabricFeature::PushOverPull => one,
        FabricFeature::PushRadiusFactor => 4_f32,
        FabricFeature::PullRadiusFactor => 2_f32,
        FabricFeature::MaxStiffness => 0.0005_f32,
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
    NexusCross,
    ColumnCross,
    BowMid,
    BowEnd,
    FacePull,
}

#[wasm_bindgen]
pub struct Environment {
    surface_character: SurfaceCharacter,
    push_and_pull: bool,
    color_pushes: bool,
    color_pulls: bool,
    iterations_per_frame: u16,
    realizing_countdown: u32,
    float_features: HashMap<FabricFeature, f32>,
}

#[wasm_bindgen]
impl Environment {
    pub fn new() -> Environment {
        Environment {
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

#[wasm_bindgen]
pub struct FabricView {
    midpoint: Point3<f32>,
    joint_locations: Vec<f32>,
    line_locations: Vec<f32>,
    line_colors: Vec<f32>,
}

#[wasm_bindgen]
impl FabricView {
    pub fn new(joint_count: u16, interval_count: u16) -> FabricView {
        FabricView {
            midpoint: Point3::origin(),
            joint_locations: Vec::with_capacity((joint_count * 3) as usize),
            line_locations: Vec::with_capacity((interval_count * 2 * 3) as usize),
            line_colors: Vec::with_capacity((interval_count * 2 * 3) as usize),
        }
    }

    pub fn clear(&mut self) {
        self.midpoint.coords.fill(0.0);
        self.joint_locations.clear();
        self.line_locations.clear();
        self.line_colors.clear();
    }

    pub fn copy_line_locations_to(&self, line_locations: &mut [f32]) {
        line_locations.copy_from_slice(&self.line_locations);
    }

    pub fn copy_line_colors_to(&self, line_colors: &mut [f32]) {
        line_colors.copy_from_slice(&self.line_colors);
    }

    pub fn copy_joint_locations_to(&self, joint_locations: &mut [f32]) {
        joint_locations.copy_from_slice(&self.joint_locations);
    }
}

pub fn main() {
    let environment = Environment::new();
    let mut eig = Fabric::new(10, 10);
    let alpha = eig.create_joint(1.0, 1.0, 1.0);
    let omega = eig.create_joint(1.0, 1.0, -1.0);
    let interval = eig.create_interval(alpha, omega, IntervalRole::NexusPush, 1.0, 1.0, 1.0, 500);
    let face = eig.create_face(1, 2, 3);
    eig.iterate(Stage::Growing, &environment);
    let mut view = FabricView::new(eig.get_joint_count(), eig.get_interval_count());
    eig.render_to(&mut view, &environment);
    println!("{} {}", interval, face);
}

#[cfg(test)]
#[test]
fn it_works() {
    assert_eq!(100, 10101);
}
