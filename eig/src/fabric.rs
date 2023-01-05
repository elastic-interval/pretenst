/*
 * Copyright (c) 2020. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

use std::cmp::Ordering;
use std::collections::hash_map::Values;
use std::collections::HashMap;

use cgmath::{EuclideanSpace, Matrix4, MetricSpace, Point3, Transform, Vector3};
use cgmath::num_traits::zero;
use crate::fabric::Stage::{*};
use crate::face::Face;
use crate::interval::{Interval, Role, Material, StrainLimits};
use crate::interval::Span;
use crate::joint::Joint;
use crate::tenscript::Spin;
use crate::world::World;

#[derive(Clone, Debug, Copy, PartialEq)]
pub struct Progress {
    limit: usize,
    count: usize,
}

impl Progress {
    pub fn new(countdown: usize) -> Self {
        Self { count: 0, limit: countdown }
    }

    pub fn next(&self) -> Option<Progress> {
        let count = self.count + 1;
        if count > self.limit { None } else { Some(Progress { count, limit: self.limit }) }
    }

    pub fn nuance(&self) -> f32 {
        (self.count as f32) / (self.limit as f32)
    }
}

#[derive(Clone, Debug, Copy, PartialEq)]
pub enum Stage {
    Empty,
    Growing,
    Adjusting { progress: Progress },
    Calming { progress: Progress },
    Shaping { progress: Progress },
    Slack,
    Pretensing { progress: Progress },
    Pretenst,
}

#[derive(Clone, Debug, Copy, PartialEq, Default, Hash, Eq)]
pub struct UniqueId {
    pub id: usize,
}

pub struct Fabric {
    pub age: u64,
    pub stage: Stage,
    pub joints: Vec<Joint>,
    pub intervals: HashMap<UniqueId, Interval>,
    pub faces: HashMap<UniqueId, Face>,
    pub push_material: Material,
    pub pull_material: Material,
    unique_id: usize,
}

impl Default for Fabric {
    fn default() -> Fabric {
        Fabric {
            age: 0,
            stage: Empty,
            joints: Vec::new(),
            intervals: HashMap::new(),
            faces: HashMap::new(),
            push_material: Material {
                stiffness: 3.0,
                mass: 1.0,
            },
            pull_material: Material {
                stiffness: 1.0,
                mass: 0.1,
            },
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
            .values()
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
        self.intervals.values_mut().for_each(|interval| interval.joint_removed(index));
    }

    pub fn create_interval(&mut self, alpha_index: usize, omega_index: usize, role: Role, length: f32) -> UniqueId {
        let initial_length = self.joints[alpha_index].location.distance(self.joints[omega_index].location);
        let span = Span::Approaching { initial_length, length };
        let id = self.create_id();
        let material = match role {
            Role::Push => self.push_material,
            Role::Pull => self.pull_material,
        };
        self.intervals.insert(id, Interval::new(alpha_index, omega_index, role, material, span));
        id
    }

    pub fn stage_adjusting(&mut self) {
        self.stage = Adjusting { progress: Progress::new(1000) };
    }

    pub fn interval(&self, id: UniqueId) -> &Interval {
        self.intervals.get(&id).unwrap()
    }

    pub fn remove_interval(&mut self, id: UniqueId) {
        self.intervals.remove(&id);
    }

    pub fn interval_values(&self) -> Values<'_, UniqueId, Interval> {
        self.intervals.values()
    }

    pub fn create_face(&mut self, scale: f32, spin: Spin, radial_intervals: [UniqueId; 3], push_intervals: [UniqueId; 3]) -> UniqueId {
        let id = self.create_id();
        self.faces.insert(id, Face { scale, spin, radial_intervals, push_intervals });
        id
    }

    pub fn face(&self, id: UniqueId) -> &Face {
        self.faces.get(&id).unwrap()
    }

    pub fn remove_face(&mut self, id: UniqueId) {
        let face = self.face(id);
        let middle_joint = face.middle_joint(self);
        for interval_id in face.radial_intervals {
            self.remove_interval(interval_id);
        }
        self.remove_joint(middle_joint);
        self.faces.remove(&id);
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
        for interval in self.intervals.values_mut() {
            interval.span = Span::Fixed { length: interval.length(&self.joints) };
        }
        for joint in self.joints.iter_mut() {
            joint.force = zero();
            joint.velocity = zero();
        }
    }

    pub fn iterate(&mut self, world: &World) {
        for joint in &mut self.joints {
            joint.reset();
        }
        for interval in self.intervals.values_mut() {
            interval.physics(world, &mut self.joints, self.stage);
        }
        for joint in &mut self.joints {
            joint.physics(world, self.stage)
        }
        self.stage = self.advance_stage();
        self.age += 1;
    }

    fn advance_stage(&mut self) -> Stage {
        match self.stage {
            Adjusting { progress } => {
                match progress.next() {
                    None => {
                        for interval in self.intervals.values_mut() {
                            if let Span::Approaching { length, .. } = interval.span {
                                interval.span = Span::Fixed { length }
                            }
                        }
                        Calming { progress: Progress::new(2000) }
                    }
                    Some(progress) => Adjusting { progress }
                }
            }
            Calming { progress } => {
                match progress.next() {
                    None => Growing,
                    Some(progress) => Calming { progress }
                }
            }
            Shaping { progress } => {
                match progress.next() {
                    None => {
                        self.slacken();
                        Slack
                    }
                    Some(progress) => Shaping { progress }
                }
            }
            Pretensing { progress } => {
                match progress.next() {
                    None => Pretenst,
                    Some(progress) => Pretensing { progress }
                }
            }
            stage => stage,
        }
    }

    pub fn strain_limits(&self) -> StrainLimits {
        let mut limits = StrainLimits::default();
        for interval in self.intervals.values() {
            limits.expand_for(interval);
        }
        limits
    }

    pub fn midpoint(&self) -> Point3<f32> {
        let mut midpoint: Point3<f32> = Point3::origin();
        for joint in &self.joints {
            midpoint += joint.location.to_vec();
        }
        let denominator = if self.joints.is_empty() { 1 } else { self.joints.len() } as f32;
        midpoint / denominator
    }

    fn create_id(&mut self) -> UniqueId {
        let id = UniqueId { id: self.unique_id };
        self.unique_id += 1;
        id
    }
}
