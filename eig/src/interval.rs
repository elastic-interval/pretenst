/*
 * Copyright (c) 2020. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */
use nalgebra::*;
use crate::*;
use joint::Joint;

pub struct Interval {
    pub(crate) alpha_index: usize,
    pub(crate) omega_index: usize,
    pub(crate) interval_role: IntervalRole,
    pub(crate) rest_length: f32,
    pub(crate) state_length: [f32; 2],
    pub(crate) stiffness: f32,
    pub(crate) linear_density: f32,
    pub(crate) countdown: u16,
    pub(crate) max_countdown: u16,
    pub(crate) unit: Vector3<f32>,
    pub(crate) strain: f32,
}

impl Interval {

    pub fn alpha<'a>(&self, joints: &'a Vec<Joint>) -> &'a Joint {
        &joints[self.alpha_index]
    }

    pub fn omega<'a>(&self, joints: &'a Vec<Joint>) -> &'a Joint {
        &joints[self.omega_index]
    }

    pub fn physics(&mut self, joints: &mut Vec<Joint>, stage: Stage, environment: &Environment, realizing_nuance: f32) {
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
                    ideal_length *= 1.0 + environment.get_float_feature(FabricFeature::PretenstFactor) * realizing_nuance
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

    pub fn is_push(&self) -> bool {
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

    fn change_rest_length(&mut self, rest_length: f32, countdown: u16) {
        self.rest_length = self.state_length[0];
        self.state_length[0] = rest_length;
        self.max_countdown = countdown;
        self.countdown = countdown;
    }

    pub fn multiply_rest_length(&mut self, factor: f32, countdown: u16) {
        let rest_length = self.state_length[0];
        self.change_rest_length(rest_length * factor, countdown)
    }
}

