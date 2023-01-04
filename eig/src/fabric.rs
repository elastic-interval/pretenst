/*
 * Copyright (c) 2020. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

use std::cmp::Ordering;

use cgmath::{EuclideanSpace, Matrix4, MetricSpace, Point3, Transform, Vector3};
use cgmath::num_traits::zero;
use crate::fabric::Stage::{*};
use crate::face::Face;
use crate::interval::{Interval, Role, Material, StrainLimits};
use crate::interval::Span;
use crate::joint::Joint;
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
    unique_id: usize,
}

impl Default for Fabric {
    fn default() -> Fabric {
        Fabric {
            age: 0,
            stage: Empty,
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
        let span = Span::Approaching { initial_length, length };
        let id = self.create_id();
        let material = match role {
            Role::Push => self.push_material,
            Role::Pull => self.pull_material,
        };
        self.intervals.push(Interval::new(id, alpha_index, omega_index, role, material, span));
        id
    }

    pub fn stage_adjusting(&mut self) {
        self.stage = Adjusting { progress: Progress::new(1000) };
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

    fn tick(&mut self, world: &World) {
        for joint in &mut self.joints {
            joint.reset();
        }
        for interval in &mut self.intervals {
            interval.physics(world, &mut self.joints, self.stage);
        }
        self.stage = match self.stage {
            Adjusting { progress } => {
                match progress.next() {
                    None => {
                        for interval in &mut self.intervals {
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
                    },
                    Some(progress) => Shaping { progress }
                }
            }
            stage => stage,
        };
        match self.stage {
            Pretensing { .. } | Pretenst => {
                for joint in &mut self.joints {
                    joint.velocity_physics(world, world.gravity, world.physics.viscosity)
                }
            }
            _ => {
                for joint in &mut self.joints {
                    joint.velocity_physics(world, 0.0, world.safe_physics.viscosity);
                }
                self.set_altitude(1.0)
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
        self.age += self.iterations_per_frame as u64;
        self.stage = match self.stage {
            Pretensing { progress } => {
                match progress.next() {
                    None => Pretenst,
                    Some(progress) => Pretensing { progress }
                }
            }
            stage => stage,
        };
    }

    pub fn strain_limits(&self) -> StrainLimits {
        let mut limits = StrainLimits::default();
        for interval in &self.intervals {
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

    pub fn get_stage(&self) -> Stage {
        self.stage
    }

    fn create_id(&mut self) -> UniqueId {
        let id = UniqueId { id: self.unique_id };
        self.unique_id += 1;
        id
    }
}
