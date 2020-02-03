use std::collections::HashMap;
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum SurfaceCharacter {
    Frozen,
    Sticky,
    Slippery,
    Bouncy,
}

#[wasm_bindgen]
#[derive(Clone, Copy, Debug, Hash, PartialEq, Eq)]
pub enum FabricFeature {
    Gravity,
    Drag,
    PretenstFactor,
    IterationsPerFrame,
    IntervalCountdown,
    PretenstCountdown,
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
pub struct Environment {
    surface_character: SurfaceCharacter,
    push_and_pull: bool,
    color_pushes: bool,
    color_pulls: bool,
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
            float_features: HashMap::new(),
        }
    }

    pub fn set_coloring(&mut self, pushes: bool, pulls: bool) -> () {
        self.color_pushes = pushes;
        self.color_pulls = pulls;
    }

    pub fn set_surface_character(&mut self, surface_character: SurfaceCharacter) -> () {
        self.surface_character = surface_character;
    }

    pub fn set_push_and_pull(&mut self, push_and_pull: bool) -> () {
        self.push_and_pull = push_and_pull;
    }

    pub fn set_float_feature(&mut self, feature: FabricFeature, value: f32) -> Option<f32> {
        self.float_features.insert(feature, value)
    }
}

#[cfg(test)]
#[test]
fn it_works() {
    assert_eq!(10101, 10101);
}

