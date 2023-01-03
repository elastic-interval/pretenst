/*
 * Copyright (c) 2020. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

use std::cmp::Ordering;

use cgmath::{EuclideanSpace, Matrix4, MetricSpace, Point3, Transform, Vector3};
use cgmath::num_traits::zero;

use crate::face::Face;
use crate::interval::{Interval, Role, Material};
use crate::interval::Span;
use crate::joint::Joint;
use crate::world::World;

pub struct StrainLimits {
    push_lo: f32,
    push_hi: f32,
    pull_lo: f32,
    pull_hi: f32,
}

impl Default for StrainLimits {
    fn default() -> Self {
        Self {
            push_lo: -f32::MAX,
            push_hi: 0.0,
            pull_lo: 0.0,
            pull_hi: f32::MAX,
        }
    }
}

// const DEFAULT_STRAIN_LIMITS: [f32; 4] = [0.0, -1e9, 1e9, 0.0];

#[derive(Clone, Debug, Copy, PartialEq)]
pub enum Stage {
    Dormant,
    Adjusting { nuance: f32, attack: f32 },
    Calming { nuance: f32, attack: f32 },
    Shaping,
    Slack,
    Pretensing { nuance: f32, attack: f32 },
    Pretenst,
}

impl Stage {
    pub fn pretensing(countdown: f32) -> Stage {
        Stage::Pretensing { nuance: 0.0, attack: 1.0 / countdown }
    }
}

#[derive(Clone, Debug, Copy, PartialEq, Default)]
pub struct UniqueId {
    pub id: usize,
}

pub struct Fabric {
    pub age: u64,
    pub stage: Stage,
    pub joints: Vec<Joint>,
    pub push_material: Material,
    pub pull_material: Material,
    pub intervals: Vec<Interval>,
    pub faces: Vec<Face>,
    pub iterations_per_frame: u32,
    pub strain_limits: StrainLimits,
    unique_id: usize,
}

impl Default for Fabric {
    fn default() -> Fabric {
        Fabric {
            age: 0,
            stage: Stage::Dormant,
            joints: Vec::new(),
            intervals: Vec::new(),
            faces: Vec::new(),
            push_material: Material {
                stiffness: 3.0,
                mass: 1.0,
            },
            pull_material: Material {
                stiffness: 1.0,
                mass: 0.1,
            },
            iterations_per_frame: 100,
            strain_limits: StrainLimits::default(),
            unique_id: 0,
        }
    }
}

impl Fabric {
    pub fn joint_intervals(&self) -> Vec<(&Joint, Vec<&Interval>)> {
        let mut maps: Vec<(&Joint, Vec<&Interval>)> = self.joints
            .iter()
            .map(|joint| (joint, vec![]))
            .collect();
        self.intervals
            .iter()
            .for_each(|interval| {
                let Interval { alpha_index, omega_index, .. } = interval;
                maps[*alpha_index].1.push(interval);
                maps[*omega_index].1.push(interval);
            });
        maps
    }

    pub fn get_joint_count(&self) -> u16 {
        self.joints.len() as u16
    }

    pub fn get_interval_count(&self) -> u16 {
        self.intervals.len() as u16
    }

    pub fn get_face_count(&self) -> u16 {
        self.faces.len() as u16
    }

    pub fn create_joint(&mut self, point: Point3<f32>) -> usize {
        let index = self.joints.len();
        self.joints.push(Joint::new(point));
        index
    }

    pub fn remove_joint(&mut self, index: usize) {
        self.joints.remove(index);
        self.intervals.iter_mut().for_each(|interval| interval.joint_removed(index));
    }

    pub fn create_interval(&mut self, alpha_index: usize, omega_index: usize, role: Role, length: f32) -> UniqueId {
        let initial_length = self.joints[alpha_index].location.distance(self.joints[omega_index].location);
        self.stage = Stage::Adjusting { nuance: 0.0, attack: 1.0 / 1000.0 };
        let span = Span::Approaching { initial_length, length };
        let id = self.create_id();
        let material = match role {
            Role::Push => self.push_material,
            Role::Pull => self.pull_material,
        };
        self.intervals.push(Interval::new(id, alpha_index, omega_index, role, material, span));
        id
    }

    pub fn find_interval(&self, id: UniqueId) -> &Interval {
        self.intervals.iter().find(|interval| interval.id == id).unwrap()
    }

    pub fn remove_interval(&mut self, id: UniqueId) {
        self.intervals = self.intervals.clone().into_iter().filter(|interval| interval.id != id).collect();
    }

    pub fn add_face(&mut self, mut face: Face) -> UniqueId {
        let id = self.create_id();
        face.id = id;
        self.faces.push(face);
        id
    }

    pub fn find_face(&self, id: UniqueId) -> &Face {
        self.faces.iter().find(|face| face.id == id).unwrap()
    }

    pub fn remove_face(&mut self, id: UniqueId) {
        let face = self.faces.iter().find(|face| face.id == id).unwrap();
        let middle_joint = face.middle_joint(self);
        for interval_id in face.radial_intervals {
            self.remove_interval(interval_id);
        }
        self.remove_joint(middle_joint);
        self.faces = self.faces.clone().into_iter().filter(|face| face.id != id).collect();
    }

    pub fn centralize(&mut self) {
        let mut midpoint: Vector3<f32> = zero();
        for joint in self.joints.iter() {
            midpoint += joint.location.to_vec();
        }
        midpoint /= self.joints.len() as f32;
        midpoint.y = 0.0;
        for joint in self.joints.iter_mut() {
            joint.location -= midpoint;
        }
    }

    pub fn set_altitude(&mut self, altitude: f32) {
        let bottom = self.joints.iter()
            .filter(|joint| joint.is_connected())
            .map(|joint| joint.location.y)
            .min_by(|a, b| a.partial_cmp(b).unwrap_or(Ordering::Equal));
        if let Some(low_y) = bottom {
            let up = altitude - low_y;
            if up > 0.0 {
                for joint in &mut self.joints {
                    joint.location.y += up;
                }
            }
        }
    }

    pub fn apply_matrix4(&mut self, matrix: Matrix4<f32>) {
        for joint in &mut self.joints {
            joint.location = matrix.transform_point(joint.location);
            joint.velocity = matrix.transform_vector(joint.velocity);
        }
    }

    pub fn slacken(&mut self) {
        for interval in self.intervals.iter_mut() {
            interval.span = Span::Fixed { length: interval.length(&self.joints) };
        }
        for joint in self.joints.iter_mut() {
            joint.force = zero();
            joint.velocity = zero();
        }
    }

    fn calculate_strain_limits(&mut self) {
        self.strain_limits = StrainLimits::default();
        // let margin = 1e-3;
        for interval in &self.intervals {
            // let upper_strain = interval.strain + margin;
            // let lower_strain = interval.strain - margin;
            // maybe use clamp?
            match interval.role {
                // Role::Push if lower_strain < self.strain_limits[0] => { self.strain_limits[0] = lower_strain }
                // Role::Push if upper_strain > self.strain_limits[1] => { self.strain_limits[1] = upper_strain }
                // Role::Pull if lower_strain < self.strain_limits[2] => { self.strain_limits[2] = lower_strain }
                // Role::Pull if upper_strain > self.strain_limits[3] => { self.strain_limits[3] = upper_strain }
                _ => {}
            };
        }
    }

    fn tick(&mut self, world: &World) {
        for joint in &mut self.joints {
            joint.reset();
        }
        for interval in &mut self.intervals {
            interval.physics(world, &mut self.joints, self.stage);
        }
        self.stage = match self.stage {
            Stage::Adjusting { nuance, attack } => {
                let next_nuance = (nuance + attack).clamp(0.0, 1.0);
                if next_nuance < 1.0 {
                    Stage::Adjusting { nuance: next_nuance, attack }
                } else {
                    for interval in &mut self.intervals {
                        if let Span::Approaching { length, .. } = interval.span {
                            interval.span = Span::Fixed { length }
                        }
                    }
                    Stage::Calming { nuance: 0.0, attack: 1.0 / 5000.0 }
                }
            }
            Stage::Calming { nuance, attack } => {
                let next_nuance = (nuance + attack).clamp(0.0, 1.0);
                if next_nuance < 1.0 {
                    Stage::Calming { nuance: next_nuance, attack }
                } else {
                    Stage::Dormant
                }
            }
            stage => stage,
        };
        match self.stage {
            Stage::Dormant | Stage::Adjusting { .. } | Stage::Calming { .. } | Stage::Shaping | Stage::Pretensing { .. } => {
                for joint in &mut self.joints {
                    joint.velocity_physics(world, 0.0, world.safe_physics.viscosity);
                }
                self.set_altitude(1.0)
            }
            Stage::Slack => {
                if world.gravity != 0.0 {
                    self.set_altitude(1.0)
                }
            }
            Stage::Pretenst => {
                for joint in &mut self.joints {
                    joint.velocity_physics(world, world.gravity, world.physics.viscosity)
                }
            }
        }
        for joint in &mut self.joints {
            joint.location_physics();
        }
    }

    pub fn iterate(&mut self, world: &World) {
        for _ in 0..self.iterations_per_frame {
            self.tick(world);
        }
        self.calculate_strain_limits();
        for interval in self.intervals.iter_mut() {
            interval.calculate_strain_nuance(&self.strain_limits);
        }
        self.age += self.iterations_per_frame as u64;
        if let Stage::Pretensing { nuance, attack } = self.stage {
            let next_nuance = nuance + attack;
            self.stage = if next_nuance > 1.0 {
                Stage::Pretenst
            } else {
                Stage::Pretensing { nuance: next_nuance, attack }
            };
        }
    }

    pub fn midpoint(&self) -> Point3<f32> {
        let mut midpoint: Point3<f32> = Point3::origin();
        for joint in &self.joints {
            midpoint += joint.location.to_vec();
        }
        let denominator = if self.joints.is_empty() { 1 } else { self.joints.len() } as f32;
        midpoint / denominator
    }

    pub fn get_stage(&self) -> Stage {
        self.stage
    }

    fn create_id(&mut self) -> UniqueId {
        let id = UniqueId { id: self.unique_id };
        self.unique_id += 1;
        id
    }
}
