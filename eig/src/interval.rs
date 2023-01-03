/*
 * Copyright (c) 2020. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

use cgmath::num_traits::zero;
use cgmath::{InnerSpace, Point3, Vector3};
use fast_inv_sqrt::InvSqrt32;

use crate::fabric::{Stage, StrainLimits, UniqueId};
use crate::joint::Joint;
use crate::world::World;

#[derive(Clone, Copy, Debug)]
pub enum Span {
    Fixed {
        length: f32
    },
    Approaching {
        length: f32,
        initial_length: f32,
    },
}

#[derive(Clone, Copy, PartialEq, Debug)]
pub enum Role {
    Push,
    Pull,
}

#[derive(Clone, Copy, Debug)]
pub struct Material {
    pub stiffness: f32,
    pub mass: f32,
}

#[derive(Clone, Debug)]
pub struct Interval {
    pub id: UniqueId,
    pub alpha_index: usize,
    pub omega_index: usize,
    pub role: Role,
    pub material: Material,
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
        role: Role,
        material: Material,
        span: Span,
    ) -> Interval {
        Interval {
            id,
            alpha_index,
            omega_index,
            role,
            material,
            span,
            unit: zero(),
            strain: 0.0,
            strain_nuance: 0.0,
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

    pub fn locations<'a>(&self, joints: &'a [Joint]) -> (&'a Point3<f32>, &'a Point3<f32>) {
        (&joints[self.alpha_index].location, &joints[self.omega_index].location)
    }

    pub fn length(&mut self, joints: &[Joint]) -> f32 {
        let (alpha_location, omega_location) = self.locations(joints);
        self.unit = omega_location - alpha_location;
        let magnitude_squared = self.unit.magnitude2();
        if magnitude_squared < 0.00001 {
            return 0.00001;
        }
        let inverse_square_root = magnitude_squared.inv_sqrt32();
        self.unit *= inverse_square_root;
        1.0 / inverse_square_root
    }

    pub fn physics(&mut self, world: &World, joints: &mut [Joint], stage: Stage) {
        let ideal_length = self.ideal_length_now(world, stage);
        let real_length = self.length(joints);
        self.strain = match self.role {
            Role::Push if self.strain > 0.0 => 0.0,
            Role::Pull if self.strain < 0.0 => 0.0,
            _ => (real_length - ideal_length) / ideal_length
        };
        let stiffness_factor = match stage {
            Stage::Dormant | Stage::Adjusting { .. } | Stage::Calming { .. } | Stage::Shaping | Stage::Slack => world.safe_physics.stiffness,
            Stage::Pretensing { .. } | Stage::Pretenst => world.physics.stiffness,
        };
        let force = self.strain * self.material.stiffness * stiffness_factor;
        let force_vector: Vector3<f32> = self.unit * force / 2.0;
        joints[self.alpha_index].force += force_vector;
        joints[self.omega_index].force -= force_vector;
        let half_mass = self.material.mass * real_length / 2.0;
        joints[self.alpha_index].interval_mass += half_mass;
        joints[self.omega_index].interval_mass += half_mass;
    }

    pub fn calculate_strain_nuance(&mut self, _limits: &StrainLimits) {
        // let unsafe_nuance = match self.role {
        //     Role::Push => (self.strain - limits[1]) / (limits[0] - limits[1]),
        //     Role::Pull => (self.strain - limits[2]) / (limits[3] - limits[2]),
        // };
        // self.strain_nuance = unsafe_nuance.clamp(0.0, 1.0);
    }

    pub fn ideal_length_now(&self, world: &World, stage: Stage) -> f32 {
        let ideal_nuance = |nuance| match self.span {
            Span::Fixed { length } => { length }
            Span::Approaching { initial_length, length: final_length, .. } => {
                initial_length * (1.0 - nuance) + final_length * nuance
            }
        };
        let ideal = match self.span {
            Span::Fixed { length } => length,
            Span::Approaching { length: final_length, .. } => final_length,
        };
        match self.role {
            Role::Push => {
                match stage {
                    Stage::Adjusting { nuance, .. } =>
                        ideal_nuance(nuance) * (1.0 + world.safe_physics.push_extension),
                    Stage::Dormant | Stage::Shaping | Stage::Calming { .. } =>
                        ideal * (1.0 + world.safe_physics.push_extension),
                    Stage::Slack =>
                        ideal,
                    Stage::Pretensing { nuance, .. } =>
                        ideal * (1.0 + world.physics.push_extension * nuance),
                    Stage::Pretenst =>
                        ideal * (1.0 + world.physics.push_extension),
                }
            }
            Role::Pull => {
                match stage {
                    Stage::Adjusting { nuance, .. } => ideal_nuance(nuance),
                    _ => ideal,
                }
            }
        }
    }
}
