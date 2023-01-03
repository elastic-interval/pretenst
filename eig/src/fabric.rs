/*
 * Copyright (c) 2020. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

use std::cmp::Ordering;

use cgmath::{EuclideanSpace, Matrix4, MetricSpace, Point3, Transform, Vector3};
use cgmath::num_traits::{abs, zero};

use crate::face::Face;
use crate::interval::{Interval, Role, Material};
use crate::interval::Span;
use crate::joint::Joint;
use crate::world::World;

const DEFAULT_STRAIN_LIMITS: [f32; 4] = [0.0, -1e9_f32, 1e9_f32, 0.0];

#[derive(Clone, Debug, Copy, PartialEq)]
pub enum Stage {
    Growing,
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

#[derive(Clone, Debug, Copy, PartialEq)]
pub enum IterateResult {
    Busy,
    NotBusy,
}

#[derive(Clone, Debug, Copy, Default)]
pub struct Iterations {
    per_frame: f32,
    length_resolution: f32,
    busy_extension: f32,
}

pub struct Fabric {
    pub age: u32,
    pub stage: Stage,
    pub joints: Vec<Joint>,
    pub push_material: Material,
    pub pull_material: Material,
    pub intervals: Vec<Interval>,
    pub faces: Vec<Face>,
    pub default_iterations: Iterations,
    pub iterations: Iterations,
    pub strain_limits: [f32; 4],
    unique_id: usize,
}

impl Default for Fabric {
    fn default() -> Fabric {
        Fabric {
            age: 0,
            stage: Stage::Growing,
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
            default_iterations: Iterations {
                per_frame: 100.0,
                length_resolution: 1000.0,
                busy_extension: 5000.0,
            },
            iterations: Iterations::default(),
            strain_limits: DEFAULT_STRAIN_LIMITS,
            unique_id: 0,
        }
    }
}

impl Fabric {
    pub fn clear(&mut self) {
        self.age = 0;
        self.stage = Stage::Growing;
        self.joints.clear();
        self.intervals.clear();
        self.faces.clear();
    }

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
        let countdown = self.iterations.length_resolution * abs(length - initial_length);
        let span = Span::Approaching { initial_length, length, attack: 1f32 / countdown, nuance: 0f32 };
        let id = self.create_id();
        let material = match role {
            Role::Push => self.push_material,
            Role::Pull => self.pull_material,
        };
        self.intervals.push(Interval::new(id, alpha_index, omega_index, role, material, span));
        self.iterations.busy_extension = self.default_iterations.busy_extension;
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

    pub fn twitch_interval(
        &mut self,
        interval_index: usize,
        attack_countdown: f32,
        decay_countdown: f32,
        delta_size_nuance: f32,
    ) {
        self.intervals[interval_index].twitch(attack_countdown, decay_countdown, delta_size_nuance)
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

    pub fn multiply_rest_length(&mut self, index: usize, factor: f32, countdown: f32) {
        self.intervals[index].multiply_rest_length(factor, countdown);
    }

    pub fn change_rest_length(&mut self, index: usize, rest_length: f32, countdown: f32) {
        self.intervals[index].change_rest_length(rest_length, countdown);
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
        self.strain_limits.copy_from_slice(&DEFAULT_STRAIN_LIMITS);
        let margin = 1e-3_f32;
        for interval in &self.intervals {
            let upper_strain = interval.strain + margin;
            let lower_strain = interval.strain - margin;
            // maybe use clamp?
            match interval.role {
                Role::Push if lower_strain < self.strain_limits[0] => { self.strain_limits[0] = lower_strain }
                Role::Push if upper_strain > self.strain_limits[1] => { self.strain_limits[1] = upper_strain }
                Role::Pull if lower_strain < self.strain_limits[2] => { self.strain_limits[2] = lower_strain }
                Role::Pull if upper_strain > self.strain_limits[3] => { self.strain_limits[3] = upper_strain }
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
        match self.stage {
            Stage::Growing | Stage::Shaping | Stage::Pretensing { .. } => {
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

    pub fn iterate(&mut self, world: &World) -> IterateResult {
        for _ in 0..(self.default_iterations.per_frame as usize) {
            self.tick(world);
        }
        self.calculate_strain_limits();
        for interval in self.intervals.iter_mut() {
            interval.calculate_strain_nuance(&self.strain_limits);
        }
        self.age += self.iterations.per_frame as u32;
        if self.intervals.iter().any(|Interval { span, .. }| !matches!(span, Span::Fixed { .. })) {
            return IterateResult::Busy;
        }
        if self.iterations.busy_extension > 0.0 {
            self.iterations.busy_extension -= self.default_iterations.per_frame;
            return IterateResult::Busy;
        }
        if let Stage::Pretensing { nuance, attack } = self.stage {
            let next_nuance = nuance + attack;
            let (stage, result) = if next_nuance > 1.0 {
                (Stage::Pretenst, IterateResult::NotBusy)
            } else {
                (Stage::Pretensing { nuance: next_nuance, attack }, IterateResult::Busy)
            };
            self.stage = stage;
            result
        } else {
            IterateResult::NotBusy
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
