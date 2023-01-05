/*
 * Copyright (c) 2020. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

use cgmath::{InnerSpace, Point3, Vector3};
use cgmath::num_traits::zero;
use fast_inv_sqrt::InvSqrt32;

use crate::fabric::{Progress, Stage};
use crate::fabric::Stage::{*};
use crate::interval::Role::{Pull, Push};
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
    pub alpha_index: usize,
    pub omega_index: usize,
    pub role: Role,
    pub material: Material,
    pub span: Span,
    pub unit: Vector3<f32>,
    pub strain: f32,
}

impl Interval {
    pub fn new(
        alpha_index: usize,
        omega_index: usize,
        role: Role,
        material: Material,
        span: Span,
    ) -> Interval {
        Interval {
            alpha_index,
            omega_index,
            role,
            material,
            span,
            unit: zero(),
            strain: 0.0,
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

    pub fn iterate(&mut self, world: &World, joints: &mut [Joint], stage: Stage) {
        let ideal_length = self.ideal_length_now(stage);
        let real_length = self.length(joints);
        self.strain = match self.role {
            Push if self.strain > 0.0 => 0.0,
            Pull if self.strain < 0.0 => 0.0,
            _ => (real_length - ideal_length) / ideal_length
        };
        let stiffness_factor = match stage {
            Pretensing { .. } | Pretenst => world.pretenst_physics.stiffness,
            _ => world.safe_physics.stiffness,
        };
        let force = self.strain * self.material.stiffness * stiffness_factor;
        let force_vector: Vector3<f32> = self.unit * force / 2.0;
        joints[self.alpha_index].force += force_vector;
        joints[self.omega_index].force -= force_vector;
        let half_mass = self.material.mass * real_length / 2.0;
        joints[self.alpha_index].interval_mass += half_mass;
        joints[self.omega_index].interval_mass += half_mass;
    }

    pub fn ideal_length_now(&self, stage: Stage) -> f32 {
        let progress_ideal = |progress: Progress| match self.span {
            Span::Fixed { length } => { length }
            Span::Approaching { initial_length, length, .. } => {
                let nuance = progress.nuance();
                initial_length * (1.0 - nuance) + length * nuance
            }
        };
        let ideal = match self.span {
            Span::Fixed { length } => length,
            Span::Approaching { length, .. } => length,
        };
        match self.role {
            Push => {
                match stage {
                    Adjusting { progress } | Shaping { progress } | Pretensing { progress } =>
                        progress_ideal(progress),
                    Empty | Growing | Calming { .. } | Pretenst => ideal,
                }
            }
            Pull => {
                match stage {
                    Adjusting { progress } | Shaping { progress } => progress_ideal(progress),
                    _ => ideal,
                }
            }
        }
    }
}

#[derive(Clone, Debug, Copy)]
pub struct StrainLimits {
    push_lo: f32,
    push_hi: f32,
    pull_lo: f32,
    pull_hi: f32,
}

impl Default for StrainLimits {
    fn default() -> Self {
        Self {
            push_lo: f32::MAX,
            push_hi: 0.0,
            pull_lo: f32::MAX,
            pull_hi: 0.0,
        }
    }
}

impl StrainLimits {
    pub fn expand_for(&mut self, Interval { role, strain, .. }: &Interval) {
        let margin = 1e-3;
        let value = if *role == Push { -*strain } else { *strain };
        let (lo, hi) = ((value - margin).clamp(0.0, f32::MAX), value + margin);
        match role {
            Push if lo < self.push_lo => { self.push_lo = lo }
            Push if hi > self.push_hi => { self.push_hi = hi }
            Pull if lo < self.pull_lo => { self.pull_lo = lo }
            Pull if hi > self.pull_hi => { self.pull_hi = hi }
            _ => {}
        };
    }

    pub fn nuance(&self, Interval { role, strain, .. }: &Interval) -> f32 {
        let value = if *role == Push { -*strain } else { *strain };
        let (lo, hi) = match role {
            Push => (self.push_lo, self.push_hi),
            Pull => (self.pull_lo, self.pull_hi)
        };
        (value - lo) / (hi - lo)
    }
}
