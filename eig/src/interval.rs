/*
 * Copyright (c) 2020. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

extern crate fast_inv_sqrt;

use cgmath::num_traits::zero;
use cgmath::{InnerSpace, Vector3};
use fast_inv_sqrt::InvSqrt32;

use crate::constants::*;
use crate::joint::Joint;
use crate::view::View;
use crate::world::World;

#[derive(Clone, Copy)]
pub struct Interval {
    pub(crate) alpha_index: usize,
    pub(crate) omega_index: usize,
    pub(crate) push: bool,
    pub(crate) length_0: f32,
    pub(crate) length_1: f32,
    pub(crate) length_nuance: f32,
    pub(crate) attack: f32,
    pub(crate) decay: f32,
    pub(crate) stiffness: f32,
    pub(crate) linear_density: f32,
    pub(crate) unit: Vector3<f32>,
    pub(crate) strain: f32,
    pub(crate) strain_nuance: f32,
}

impl Interval {
    pub fn new(
        alpha_index: usize,
        omega_index: usize,
        push: bool,
        length_0: f32,
        length_1: f32,
        stiffness: f32,
        attack: f32,
    ) -> Interval {
        Interval {
            alpha_index,
            omega_index,
            push,
            length_0,
            length_1,
            length_nuance: 0_f32,
            attack,
            decay: 0_f32,
            stiffness,
            linear_density: if push { 1_f32 } else { 0.05_f32 },
            unit: zero(),
            strain: 0_f32,
            strain_nuance: 0_f32,
        }
    }

    pub fn joint_removed(&mut self, index: usize) {
        if self.alpha_index > index {
            self.alpha_index = self.alpha_index - 1;
        }
        if self.omega_index > index {
            self.omega_index = self.omega_index - 1;
        }
    }

    pub fn alpha<'a>(&self, joints: &'a Vec<Joint>) -> &'a Joint {
        &joints[self.alpha_index]
    }

    pub fn omega<'a>(&self, joints: &'a Vec<Joint>) -> &'a Joint {
        &joints[self.omega_index]
    }

    pub fn calculate_current_length_mut(&mut self, joints: &Vec<Joint>) -> f32 {
        let alpha_location = &joints[self.alpha_index].location;
        let omega_location = &joints[self.omega_index].location;
        self.unit = omega_location - alpha_location;
        let magnitude_squared = self.unit.magnitude2();
        if magnitude_squared < 0.00001_f32 {
            return 0.00001_f32;
        }
        let inverse_square_root = magnitude_squared.inv_sqrt32();
        self.unit *= inverse_square_root;
        1_f32 / inverse_square_root
    }

    pub fn calculate_current_length(&self, joints: &Vec<Joint>) -> f32 {
        let alpha_location = &joints[self.alpha_index].location;
        let omega_location = &joints[self.omega_index].location;
        let unit = omega_location - alpha_location;
        let magnitude_squared = unit.magnitude2();
        if magnitude_squared < 0.00001_f32 {
            return 0.00001_f32;
        }
        let inverse_square_root = magnitude_squared.inv_sqrt32();
        1_f32 / inverse_square_root
    }

    pub fn physics(
        &mut self,
        world: &World,
        joints: &mut Vec<Joint>,
        stage: Stage,
        pretensing_nuance: f32,
    ) {
        let ideal_length = self.ideal_length_now(world, stage, pretensing_nuance);
        let real_length = self.calculate_current_length_mut(joints);
        self.strain = (real_length - ideal_length) / ideal_length;
        if !world.push_and_pull
            && (self.push && self.strain > 0_f32 || !self.push && self.strain < 0_f32)
        {
            self.strain = 0_f32;
        }
        let push_over_pull = if self.push {
            world.push_over_pull
        } else {
            1_f32
        };
        let stiffness_factor = match stage {
            Stage::Slack => 0_f32,
            Stage::Growing | Stage::Shaping => world.shaping_stiffness_factor,
            Stage::Pretensing | Stage::Pretenst => world.stiffness_factor,
        };
        let force = self.strain * self.stiffness * push_over_pull * stiffness_factor;
        let force_vector: Vector3<f32> = self.unit.clone() * force / 2_f32;
        joints[self.alpha_index].force += force_vector;
        joints[self.omega_index].force -= force_vector;
        let half_mass = ideal_length * self.linear_density / 2_f32;
        joints[self.alpha_index].interval_mass += half_mass;
        joints[self.omega_index].interval_mass += half_mass;
        if self.attack > 0_f32 {
            self.length_nuance += self.attack;
            if self.length_nuance > 1_f32 {
                self.attack = 0_f32; // done attacking
                if self.decay == 0_f32 {
                    self.length_0 = self.length_1; // both the same now
                    self.length_nuance = 0_f32; // reset to zero
                } else {
                    self.length_nuance = 1_f32 - self.decay; // first step back
                }
            }
        } else if self.decay > 0_f32 {
            self.length_nuance -= self.decay;
            if self.length_nuance <= 0_f32 {
                self.length_nuance = 0_f32; // exactly zero
                self.decay = 0_f32; // done decaying
            }
        }
    }

    pub fn calculate_strain_nuance(&self, limits: &[f32; 4]) -> f32 {
        let unsafe_nuance = if self.push {
            (self.strain - limits[1]) / (limits[0] - limits[1])
        } else {
            (self.strain - limits[2]) / (limits[3] - limits[2])
        };
        if unsafe_nuance < 0_f32 {
            0_f32
        } else if unsafe_nuance > 1_f32 {
            1_f32
        } else {
            unsafe_nuance
        }
    }

    pub fn ideal_length_now(&self, world: &World, stage: Stage, pretensing_nuance: f32) -> f32 {
        let ideal =
            self.length_0 * (1_f32 - self.length_nuance) + self.length_1 * self.length_nuance;
        if self.push {
            match stage {
                Stage::Slack => ideal,
                Stage::Growing | Stage::Shaping => {
                    let nuance = if self.attack == 0_f32 {
                        1_f32
                    } else {
                        self.length_nuance
                    };
                    ideal * (1_f32 + world.shaping_pretenst_factor * nuance)
                }
                Stage::Pretensing => ideal * (1_f32 + world.pretenst_factor * pretensing_nuance),
                Stage::Pretenst => ideal * (1_f32 + world.pretenst_factor),
            }
        } else {
            ideal
        }
    }

    pub fn change_rest_length(&mut self, rest_length: f32, countdown: f32) {
        self.length_0 = self.length_1;
        self.length_1 = rest_length;
        self.length_nuance = 0_f32;
        self.attack = 1_f32 / countdown;
        self.decay = 0_f32;
    }

    pub fn twitch(&mut self, attack_countdown: f32, decay_countdown: f32, delta_size_nuance: f32) {
        if self.length_nuance != 0_f32 {
            // while changing? ignore!
            return;
        }
        self.length_1 = self.length_0 * delta_size_nuance;
        self.length_nuance = 0_f32;
        self.attack = 1_f32 / attack_countdown;
        self.decay = 1_f32 / decay_countdown;
    }

    pub fn multiply_rest_length(&mut self, factor: f32, countdown: f32) {
        self.change_rest_length(self.length_1 * factor, countdown)
    }

    pub fn project_line_locations<'a>(&self, view: &mut View, joints: &'a Vec<Joint>, extend: f32) {
        let alpha = &self.alpha(joints).location;
        let omega = &self.omega(joints).location;
        view.line_locations.push(alpha.x - self.unit.x * extend);
        view.line_locations.push(alpha.y - self.unit.y * extend);
        view.line_locations.push(alpha.z - self.unit.z * extend);
        view.line_locations.push(omega.x + self.unit.x * extend);
        view.line_locations.push(omega.y + self.unit.y * extend);
        view.line_locations.push(omega.z + self.unit.z * extend);
    }

    pub fn project_line_features<'a>(&self, view: &mut View, ideal_length: f32) {
        view.unit_vectors.push(self.unit.x);
        view.unit_vectors.push(self.unit.y);
        view.unit_vectors.push(self.unit.z);
        view.ideal_lengths.push(ideal_length);
        view.strains.push(self.strain);
        view.strain_nuances.push(self.strain_nuance);
        view.stiffnesses.push(self.stiffness);
        view.linear_densities.push(self.linear_density);
    }

    pub fn project_line_color_nuance(&self, view: &mut View) {
        let nuance = self.strain_nuance;
        let anti = 1_f32 - self.strain_nuance;
        let slack = 0.1_f32;
        if self.push {
            Interval::project_line_rgb(view, 0_f32, anti, nuance)
        } else if self.strain == 0_f32 {
            Interval::project_line_rgb(view, slack, slack, slack)
        } else {
            Interval::project_line_rgb(view, nuance, anti, 0_f32)
        }
    }

    pub fn project_line_rgb(view: &mut View, r: f32, g: f32, b: f32) {
        view.line_colors.push(r);
        view.line_colors.push(g);
        view.line_colors.push(b);
        view.line_colors.push(r);
        view.line_colors.push(g);
        view.line_colors.push(b);
    }
}
