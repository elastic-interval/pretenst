/*
 * Copyright (c) 2020. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

extern crate fast_inv_sqrt;

use cgmath::num_traits::zero;
use cgmath::{InnerSpace, Vector3};
use fast_inv_sqrt::InvSqrt32;

use crate::constants::*;
use crate::fabric::UniqueId;
use crate::interval::Span::{Approaching, Fixed, Twitching};
use crate::joint::Joint;
use crate::role::Role;
use crate::world::World;

#[derive(Clone, Copy)]
pub enum Span {
    Fixed {
        length: f32
    },
    Approaching {
        initial_length: f32,
        final_length: f32,
        attack: f32,
        nuance: f32,
    },
    Twitching {
        initial_length: f32,
        final_length: f32,
        attack: f32,
        decay: f32,
        attacking: bool,
        nuance: f32,
    },
}

#[derive(Clone, Copy)]
pub struct Interval {
    pub id: UniqueId,
    pub alpha_index: usize,
    pub omega_index: usize,
    pub role: &'static Role,
    pub span: Span,
    pub unit: Vector3<f32>,
    pub strain: f32,
    pub strain_nuance: f32,
}

impl Interval {
    pub fn new(
        id: UniqueId,
        alpha_index: usize,
        omega_index: usize,
        role: &'static Role,
        span: Span,
    ) -> Interval {
        Interval {
            id,
            alpha_index,
            omega_index,
            role,
            span,
            unit: zero(),
            strain: 0_f32,
            strain_nuance: 0_f32,
        }
    }

    pub fn joint_removed(&mut self, index: usize) {
        if self.alpha_index > index {
            self.alpha_index -= 1;
        }
        if self.omega_index > index {
            self.omega_index -= 1;
        }
    }

    pub fn alpha<'a>(&self, joints: &'a [Joint]) -> &'a Joint {
        &joints[self.alpha_index]
    }

    pub fn omega<'a>(&self, joints: &'a [Joint]) -> &'a Joint {
        &joints[self.omega_index]
    }

    pub fn calculate_current_length_mut(&mut self, joints: &[Joint]) -> f32 {
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

    pub fn calculate_current_length(&self, joints: &[Joint]) -> f32 {
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
        joints: &mut [Joint],
        stage: Stage,
        pretensing_nuance: f32,
    ) {
        let ideal_length = self.ideal_length_now(world, stage, pretensing_nuance);
        let real_length = self.calculate_current_length_mut(joints);
        self.strain = (real_length - ideal_length) / ideal_length;
        if !world.push_and_pull
            && (self.role.push && self.strain > 0_f32 || !self.role.push && self.strain < 0_f32)
        {
            self.strain = 0_f32;
        }
        let push_over_pull = if self.role.push {
            world.push_over_pull
        } else {
            1_f32
        };
        let stiffness_factor = match stage {
            Stage::Slack => 0_f32,
            Stage::Growing | Stage::Shaping => world.shaping_stiffness_factor,
            Stage::Pretensing | Stage::Pretenst => world.stiffness_factor,
        };
        let force = self.strain * self.role.stiffness * push_over_pull * stiffness_factor;
        let force_vector: Vector3<f32> = self.unit * force / 2_f32;
        joints[self.alpha_index].force += force_vector;
        joints[self.omega_index].force -= force_vector;
        let half_mass = self.role.density * ideal_length / 2_f32;
        joints[self.alpha_index].interval_mass += half_mass;
        joints[self.omega_index].interval_mass += half_mass;
        self.span = match self.span {
            Approaching { initial_length, final_length, attack, nuance } => {
                let updated_nuance = nuance + attack;
                if updated_nuance >= 1_f32 {
                    Fixed { length: final_length }
                } else {
                    Approaching { initial_length, final_length, attack, nuance: updated_nuance }
                }
            }
            Twitching { initial_length, final_length, attack, decay, attacking, nuance } => {
                if attacking {
                    let updated_nuance = nuance + attack;
                    if updated_nuance >= 1_f32 {
                        Twitching { initial_length, final_length, attack, decay, attacking: false, nuance: 1f32 }
                    } else {
                        Twitching { initial_length, final_length, attack, decay, attacking, nuance: updated_nuance }
                    }
                } else {
                    let updated_nuance = nuance - decay;
                    if nuance <= 0f32 {
                        Fixed { length: initial_length }
                    } else {
                        Twitching { initial_length, final_length, attack, decay, attacking, nuance: updated_nuance }
                    }
                }
            }
            whatever => { whatever }
        }
    }

    pub fn calculate_strain_nuance(&self, limits: &[f32; 4]) -> f32 {
        let unsafe_nuance = if self.role.push {
            (self.strain - limits[1]) / (limits[0] - limits[1])
        } else {
            (self.strain - limits[2]) / (limits[3] - limits[2])
        };
        unsafe_nuance.clamp(0_f32, 1_f32)
    }

    pub fn ideal_length_now(&self, world: &World, stage: Stage, pretensing_nuance: f32) -> f32 {
        let ideal = match self.span {
            Fixed { length } => { length }
            Approaching { initial_length, final_length, nuance, .. } => {
                initial_length * (1_f32 - nuance) + final_length * nuance
            }
            Twitching { initial_length, final_length, nuance, .. } => {
                initial_length * (1_f32 - nuance) + final_length * nuance
            }
        };
        if self.role.push {
            match stage {
                Stage::Slack => ideal,
                Stage::Growing | Stage::Shaping => ideal * (1_f32 + world.shaping_pretenst_factor),
                Stage::Pretensing => ideal * (1_f32 + world.pretenst_factor * pretensing_nuance),
                Stage::Pretenst => ideal * (1_f32 + world.pretenst_factor),
            }
        } else {
            ideal
        }
    }

    pub fn change_rest_length(&mut self, rest_length: f32, countdown: f32) {
        if let Fixed { length } = self.span {
            self.span = Approaching {
                initial_length: length,
                final_length: rest_length,
                attack: 1f32 / countdown,
                nuance: 0f32,
            }
        }
    }

    pub fn twitch(&mut self, attack_countdown: f32, decay_countdown: f32, delta_size_nuance: f32) {
        if let Fixed { length } = self.span {
            self.span = Twitching {
                initial_length: length,
                final_length: length * delta_size_nuance,
                attacking: true,
                attack: 1f32 / attack_countdown,
                decay: 1f32 / decay_countdown,
                nuance: 0f32,
            }
        }
    }

    pub fn multiply_rest_length(&mut self, factor: f32, countdown: f32) {
        if let Fixed { length } = self.span {
            self.change_rest_length(length * factor, countdown)
        }
    }
}
