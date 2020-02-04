/*
 * Copyright (c) 2020. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */
use nalgebra::*;
use crate::*;

const _ROLE_COLORS: [[f32; 3]; 9] = [
    [0.799, 0.519, 0.304],
    [0.879, 0.295, 0.374],
    [0.215, 0.629, 0.747],
    [0.618, 0.126, 0.776],
    [0.670, 0.627, 0.398],
    [0.242, 0.879, 0.410],
    [0.613, 0.692, 0.382],
    [0.705, 0.709, 0.019],
    [0.577, 0.577, 0.577],
];

static _RAINBOW: [[f32; 3]; 12] = [
    [0.1373, 0.1608, 0.9686],
    [0.0000, 0.4824, 1.0000],
    [0.0000, 0.6471, 1.0000],
    [0.0000, 0.7686, 0.8431],
    [0.0000, 0.8667, 0.6784],
    [0.3059, 0.8667, 0.5137],
    [0.5020, 0.8549, 0.3216],
    [0.6863, 0.8235, 0.0000],
    [0.8314, 0.7098, 0.0000],
    [0.9294, 0.5804, 0.0000],
    [0.9843, 0.4431, 0.1647],
    [0.9882, 0.3020, 0.3020],
];

struct Joint {
    location: Vector3<f32>,
    force: Vector3<f32>,
    velocity: Vector3<f32>,
    interval_mass: f32,
}

impl Joint {
    pub fn physics(&mut self, gravity_above: f32, drag_above: f32, environment: &Environment) {
        let altitude = self.location.y;
        if altitude > 0.0 {
            self.velocity.y -= gravity_above;
            self.velocity *= 1.0 - drag_above;
            self.velocity += &self.force / self.interval_mass;
        } else {
            self.velocity += &self.force / self.interval_mass;
            let degree_submerged: f32 = if -altitude < 1.0 { -altitude } else { 0.0 };
            let degree_cushioned: f32 = 1.0 - degree_submerged;
            match environment.surface_character {
                SurfaceCharacter::Frozen => {
                    self.velocity.fill(0.0);
                    self.location.y = -0.0001; // RESURFACE
                }
                SurfaceCharacter::Sticky => {
                    self.velocity *= degree_cushioned;
                    self.velocity.y = degree_submerged * 0.0001; // RESURFACE
                }
                SurfaceCharacter::Slippery => {
                    self.location.fill(0.0);
                    self.velocity.fill(0.0);
                }
                SurfaceCharacter::Bouncy => {
                    self.velocity *= degree_cushioned;
                    self.velocity.y -= 0.001 * degree_submerged; // ANTIGRAVITY
                }
            }
        }
    }
}

struct Interval {
    alpha_index: usize,
    omega_index: usize,
    interval_role: IntervalRole,
    rest_length: f32,
    state_length: [f32; 2],
    stiffness: f32,
    linear_density: f32,
    countdown: u16,
    max_countdown: u16,
    unit: Vector3<f32>,
    strain: f32,
}

impl Interval {
    pub fn physics(&mut self, joints: &mut Vec<Joint>, stage: Stage, environment: &Environment) {
        let mut ideal_length = self.ideal_length_now();
        let omega_location = &joints[self.omega_index].location;
        let alpha_location = &joints[self.alpha_index].location;
        self.unit = omega_location - alpha_location;
        let real_length = self.unit.norm();
        let push = self.is_push();
        if push {
            match stage {
                Stage::Busy | Stage::Slack => {}
                Stage::Growing | Stage::Shaping => {
                    ideal_length *= 1.0 + environment.get_float_feature(FabricFeature::ShapingPretenstFactor);
                }
                Stage::Realizing => {
                    ideal_length *= 1.0 + environment.get_float_feature(FabricFeature::PretenstFactor);// TODO * getRealizingNuance()
                }
                Stage::Realized => {
                    ideal_length *= 1.0 + environment.get_float_feature(FabricFeature::PretenstFactor)
                }
            }
        }
        self.strain = (real_length - ideal_length) / ideal_length;
        if !environment.push_and_pull && (push && self.strain > 0.0 || !push && self.strain < 0.0) {
            self.strain = 0.0;
        }
        let mut force = self.strain * self.stiffness;
        if stage <= Stage::Slack {
            force *= environment.get_float_feature(FabricFeature::ShapingStiffnessFactor)
        }
        let mut push: Vector3<f32> = zero();
        push += &self.unit;
        if self.interval_role == IntervalRole::FacePull {
            push *= force / 6.0;
            // TODO
            joints[self.alpha_index].force += &push;
            joints[self.omega_index].force -= &push;
        } else {
            push *= force / 2.0;
            joints[self.alpha_index].force += &push;
            joints[self.omega_index].force -= &push;
            let half_mass = ideal_length * self.linear_density / 2.0;
            joints[self.alpha_index].interval_mass += half_mass;
            joints[self.omega_index].interval_mass += half_mass;
        }
    }

    fn is_push(&self) -> bool {
        self.interval_role == IntervalRole::NexusPush || self.interval_role == IntervalRole::ColumnPush
    }

    fn ideal_length_now(&mut self) -> f32 {
        if self.countdown == 0 {
            self.rest_length
        } else {
            let max = self.max_countdown as f32;
            let progress: f32 = (max - self.countdown as f32) / max;
            let state_length = self.state_length[0];
            self.rest_length * (1.0 - progress) + state_length * progress
        }
    }
}

pub struct EIG {
    stage: Stage,
    fabric: Fabric,
    joints: Vec<Joint>,
    intervals: Vec<Interval>,
}

impl EIG {
    pub fn new(joint_count: usize, interval_count: usize) -> EIG {
        let line_floats = joint_count * 2 * 3;
        EIG {
            stage: Stage::Busy,
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
            location: Vector3::new(x, y, z),
            force: zero(),
            velocity: zero(),
            interval_mass: 0.0,
        });
        index
    }

    pub fn create_interval(&mut self, alpha_index: usize, omega_index: usize, interval_role: IntervalRole,
                           rest_length: f32, stiffness: f32, linear_density: f32, countdown: u16) -> usize {
        let index = self.intervals.len();
        self.intervals.push(Interval {
            alpha_index,
            omega_index,
            interval_role,
            rest_length,
            state_length: [1.0; 2],
            stiffness,
            linear_density,
            countdown,
            max_countdown: countdown,
            unit: zero(),
            strain: 0.0,
        });
        index
    }

    fn tick(&mut self, environment: &Environment) {
        for interval in &mut self.intervals {
            interval.physics(&mut self.joints, self.stage, environment)
        }
        for joint in &mut self.joints {
            joint.physics(0.0, 0.0, environment)
        }
    }

    pub fn iterate(&mut self, iterations: u32, environment: &Environment) -> Stage {
        for _tick in 0..iterations {
            self.tick(environment);
        }
        for (index, interval) in self.intervals.iter().enumerate() {
            let omega_location = &self.joints[interval.omega_index].location;
            let alpha_location = &self.joints[interval.alpha_index].location;
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

