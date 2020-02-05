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
    pub fn new(push_and_pull: bool, color_pushes: bool, color_pulls: bool) -> Environment {
        Environment {
            surface_character: SurfaceCharacter::Bouncy,
            push_and_pull,
            color_pushes,
            color_pulls,
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

    pub fn set_float_feature(&mut self, feature: FabricFeature, value: f32) -> Option<f32> {
        self.float_features.insert(feature, value)
    }

    pub fn get_float(&self, feature: FabricFeature) -> f32 {
        *self.float_features.get(&feature).unwrap()
    }
}

#[wasm_bindgen]
pub struct View {
    midpoint: Point3<f32>,
    joint_locations: Vec<f32>,
    line_locations: Vec<f32>,
    line_colors: Vec<f32>,
}

#[wasm_bindgen]
impl View {
    pub fn new(joint_count: u16, interval_count: u16) -> View {
        View {
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
    let environment = Environment::new(false, true, true);
    let mut eig = Fabric::new(10, 10);
    let alpha = eig.create_joint(1.0, 1.0, 1.0);
    let omega = eig.create_joint(1.0, 1.0, -1.0);
    let interval = eig.create_interval(alpha, omega, IntervalRole::NexusPush, 1.0, 1.0, 1.0, 500);
    let face = eig.create_face(1, 2, 3);
    eig.iterate(Stage::Growing, &environment);
    let mut view = View::new(eig.get_joint_count(), eig.get_interval_count());
    eig.render_to(&mut view, &environment);
    println!("{} {}", interval, face);
}

#[cfg(test)]
#[test]
fn it_works() {
    assert_eq!(100, 10101);
}
