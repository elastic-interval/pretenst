use std::collections::HashMap;
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Stage {
    Busy,
    Growing,
    Shaping,
    Slack,
    Realizing,
    Realized,
}

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

#[wasm_bindgen]
pub struct Fabric {
    line_locations: Vec<f32>
}

#[wasm_bindgen]
impl Fabric {
    pub fn line_locations(&self, line_locations: &mut [f32]) {
        line_locations.copy_from_slice(&self.line_locations);
    }
}

struct Joint {
    location: [f32; 3],
    force: [f32; 3],
    velocity: [f32; 3],
}

impl Joint {
    pub fn physics(&mut self) {
        vec3::add_mut(&mut self.location, &self.velocity);
    }
}

struct Interval {
    alpha_index: usize,
    omega_index: usize,
    rest_length: f32,
    stiffness: f32,
    linear_density: f32,
    countdown: u16,
    unit: [f32; 3],
}

impl Interval {
    pub fn physics(&mut self, joints: &mut Vec<Joint>) {
        let omega_location = joints[self.omega_index].location;
        let alpha_location = joints[self.alpha_index].location;
        vec3::sub(&mut self.unit, &omega_location, &alpha_location);
        let length = vec3::norm_mut(&mut self.unit);
        let strain = (length - self.rest_length) / self.rest_length;
        let mut push = vec3::new_zero();
        vec3::add_mut(&mut push, &self.unit);
        vec3::smul_mut(&mut push, &strain);
        vec3::add_mut(&mut joints[self.alpha_index].force, &push);
        vec3::sub_mut(&mut joints[self.omega_index].force, &push);
    }
}

struct EIG {
    fabric: Fabric,
    joints: Vec<Joint>,
    intervals: Vec<Interval>,
}

impl EIG {
    pub fn new(joint_count: usize, interval_count: usize) -> EIG {
        let line_floats = joint_count * 2 * 3;
        EIG {
            fabric: Fabric {
                line_locations: Vec::with_capacity(line_floats),
            },
            joints: Vec::with_capacity(joint_count),
            intervals: Vec::with_capacity(interval_count),
        }
    }

    pub fn create_joint(&mut self, x: f32, y: f32, z: f32) -> usize {
        let index = self.joints.len();
        self.joints.push(Joint {
            location: [x, y, z],
            force: [0.0, 0.0, 0.0],
            velocity: [0.0, 0.0, 0.0],
        });
        index
    }

    pub fn create_interval(&mut self, alpha_index: usize, omega_index: usize,
                           rest_length: f32, stiffness: f32, linear_density: f32, countdown: u16) -> usize {
        let index = self.intervals.len();
        self.intervals.push(Interval {
            alpha_index,
            omega_index,
            rest_length,
            stiffness,
            linear_density,
            countdown,
            unit: [0.0; 3],
        });
        index
    }

    pub fn iterate(&mut self, iterations: u32) -> Stage {
        for _tick in 0..iterations {
            for interval in &mut self.intervals {
                interval.physics(&mut self.joints)
            }
            for joint in &mut self.joints {
                joint.physics()
            }
        }
        for (index, interval) in self.intervals.iter().enumerate() {
            let omega_location = self.joints[interval.omega_index].location;
            let alpha_location = self.joints[interval.alpha_index].location;
            let offset = index * 6;
            self.fabric.line_locations[offset] = alpha_location[0];
            self.fabric.line_locations[offset + 1] = alpha_location[1];
            self.fabric.line_locations[offset + 2] = alpha_location[2];
            self.fabric.line_locations[offset + 3] = omega_location[0];
            self.fabric.line_locations[offset + 4] = omega_location[1];
            self.fabric.line_locations[offset + 5] = omega_location[2];
        }
        Stage::Busy
    }
}

pub fn main() {
    let mut eig = EIG::new(10, 10);
    let alpha = eig.create_joint(1.0, 1.0, 1.0);
    let omega = eig.create_joint(1.0, 1.0, -1.0);
    let interval = eig.create_interval(alpha, omega,
                                       1.0, 1.0, 1.0, 500);
    eig.iterate(1);
    println!("{}", interval);
}

#[cfg(test)]
#[test]
fn it_works() {
    assert_eq!(100, 10101);
}

