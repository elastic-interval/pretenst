/*
 * Copyright (c) 2020. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

use std::cmp::Ordering;

use cgmath::{EuclideanSpace, Matrix4, MetricSpace, Transform, Vector3};
use cgmath::num_traits::{abs, zero};

use crate::constants::*;
use crate::face::Face;
use crate::interval::Interval;
use crate::interval::Span::{Approaching, Fixed};
use crate::joint::Joint;
use crate::role::Role;
use crate::tenscript::{FaceName, Mark, TenscriptNode};
use crate::world::World;

pub const DEFAULT_STRAIN_LIMITS: [f32; 4] = [0_f32, -1e9_f32, 1e9_f32, 0_f32];

pub const COUNTDOWN: f32 = 1000.0;
pub const BUSY_COUNTDOWN: u32 = 200;

#[derive(Clone, Debug, Copy, PartialEq)]
pub struct UniqueId {
    pub id: usize,
}

pub struct Fabric {
    pub age: u32,
    pub busy_countdown: u32,
    pub stage: Stage,
    pub joints: Vec<Joint>,
    pub intervals: Vec<Interval>,
    pub faces: Vec<Face>,
    pub pretensing_countdown: f32,
    pub strain_limits: [f32; 4],
    unique_id: usize,
}

impl Default for Fabric {
    fn default() -> Fabric {
        Fabric {
            age: 0,
            busy_countdown: BUSY_COUNTDOWN,
            stage: Stage::Growing,
            pretensing_countdown: 0_f32,
            joints: Vec::new(),
            intervals: Vec::new(),
            faces: Vec::new(),
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

    pub fn pushes_and_pulls(&self) -> Vec<(usize, usize)> {
        self.joint_intervals()
            .iter()
            .map(|(_, intervals)| {
                let pushes = intervals
                    .iter()
                    .filter(|Interval { role, .. }| role.push)
                    .count();
                let pulls = intervals
                    .iter()
                    .filter(|Interval { role, .. }| !role.push)
                    .count();
                (pushes, pulls)
            })
            .collect()
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

    pub fn create_joint(&mut self, x: f32, y: f32, z: f32) -> usize {
        let index = self.joints.len();
        self.joints.push(Joint::new(x, y, z));
        index
    }

    pub fn remove_joint(&mut self, index: usize) {
        self.joints.remove(index);
        self.intervals.iter_mut().for_each(|interval| interval.joint_removed(index));
    }

    pub fn create_interval(&mut self, alpha_index: usize, omega_index: usize, role: &'static Role, scale: f32) -> UniqueId {
        let initial_length = self.joints[alpha_index].location.distance(self.joints[omega_index].location);
        let final_length = role.reference_length * scale;
        let countdown = COUNTDOWN * abs(final_length - initial_length);
        let span = Approaching { initial_length, final_length, attack: 1f32 / countdown, nuance: 0f32 };
        let id = self.create_id();
        self.intervals.push(Interval::new(id, alpha_index, omega_index, role, span));
        self.mark_busy();
        id.clone()
    }

    pub fn find_interval(&self, id: UniqueId) -> &Interval {
        self.intervals.iter().find(|interval| interval.id == id).unwrap()
    }

    pub fn remove_interval(&mut self, id: UniqueId) {
        self.intervals = self.intervals.clone().into_iter().filter(|interval| interval.id != id).collect();
    }

    pub fn create_face(&mut self,
                       name: FaceName,
                       scale: f32,
                       left_handed: bool,
                       node: Option<TenscriptNode>,
                       marks: Vec<Mark>,
                       radial_intervals: [UniqueId; 3],
                       push_intervals: [UniqueId; 3],
    ) -> UniqueId {
        let id = self.create_id();
        let face = Face { id, name, scale, left_handed, node, marks, radial_intervals, push_intervals };
        self.faces.push(face);
        self.mark_busy();
        id.clone()
    }

    pub fn find_face(&self, id: UniqueId) -> &Face {
        self.faces.iter().find(|face| face.id == id).unwrap()
    }

    pub fn remove_face(&mut self, id: UniqueId) {
        let face = self.faces.iter().find(|face| face.id == id).unwrap();
        let middle_joint = face.middle_joint(&self);
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
        midpoint.y = 0_f32;
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
            if up > 0_f32 {
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

    pub fn apply_matrix4(&mut self, mp: &[f32]) {
        let m: [f32; 16] = mp.try_into().unwrap();
        let matrix: Matrix4<f32> = Matrix4::new( // todo: better way?
                                                 m[0], m[1], m[2], m[3],
                                                 m[4], m[5], m[6], m[7],
                                                 m[8], m[9], m[10], m[11],
                                                 m[12], m[13], m[14], m[15]);
        for joint in &mut self.joints {
            joint.location = matrix.transform_point(joint.location);
            joint.velocity = matrix.transform_vector(joint.velocity);
        }
    }

    fn set_stage(&mut self, stage: Stage) -> Stage {
        self.stage = stage;
        stage
    }

    fn start_slack(&mut self) -> Stage {
        for interval in self.intervals.iter_mut() {
            interval.span = Fixed { length: interval.calculate_current_length(&self.joints) };
        }
        for joint in self.joints.iter_mut() {
            joint.force = zero();
            joint.velocity = zero();
        }
        self.set_stage(Stage::Slack)
    }

    fn start_pretensing(&mut self, world: &World) -> Stage {
        self.pretensing_countdown = world.pretensing_countdown;
        self.set_stage(Stage::Pretensing)
    }

    fn slack_to_shaping(&mut self, world: &World) -> Stage {
        for interval in &mut self.intervals {
            if interval.role.push {
                interval
                    .multiply_rest_length(world.shaping_pretenst_factor, world.interval_countdown);
            }
        }
        self.set_stage(Stage::Shaping)
    }

    fn calculate_strain_limits(&mut self) {
        self.strain_limits.copy_from_slice(&DEFAULT_STRAIN_LIMITS);
        let margin = 1e-3_f32;
        for interval in &self.intervals {
            let upper_strain = interval.strain + margin;
            let lower_strain = interval.strain - margin;
            if interval.role.push {
                if lower_strain < self.strain_limits[0] {
                    self.strain_limits[0] = lower_strain
                }
                if upper_strain > self.strain_limits[1] {
                    self.strain_limits[1] = upper_strain
                }
            } else {
                if lower_strain < self.strain_limits[2] {
                    self.strain_limits[2] = lower_strain
                }
                if upper_strain > self.strain_limits[3] {
                    self.strain_limits[3] = upper_strain
                }
            }
        }
    }

    fn tick(&mut self, world: &World) {
        for joint in &mut self.joints {
            joint.reset();
        }
        let pretensing_nuance = world.pretensing_nuance(self);
        for interval in &mut self.intervals {
            interval.physics(world, &mut self.joints, self.stage, pretensing_nuance);
        }
        match self.stage {
            Stage::Growing | Stage::Shaping | Stage::Pretensing => {
                for joint in &mut self.joints {
                    joint.velocity_physics(world, 0_f32, world.shaping_drag);
                }
                self.set_altitude(1_f32)
            }
            Stage::Slack => {
                if world.gravity != 0_f32 {
                    self.set_altitude(1_f32)
                }
            }
            Stage::Pretenst => {
                for joint in &mut self.joints {
                    joint.velocity_physics(world, world.gravity, world.drag)
                }
            }
        }
        for joint in &mut self.joints {
            joint.location_physics();
        }
    }

    pub fn iterate(&mut self, world: &World) -> bool {
        for _tick in 0..(world.iterations_per_frame as usize) {
            self.tick(world);
        }
        self.calculate_strain_limits();
        for interval in self.intervals.iter_mut() {
            interval.strain_nuance = interval.calculate_strain_nuance(&self.strain_limits);
        }
        self.age += world.iterations_per_frame as u32;
        if self.intervals.iter().any(|Interval { span, .. }| !matches!(span, Fixed { .. })) {
            return true;
        }
        if self.busy_countdown > 0 {
            self.busy_countdown -= 1;
            return true;
        }
        let pretensing_countdown: f32 = self.pretensing_countdown - world.iterations_per_frame;
        self.pretensing_countdown = if pretensing_countdown < 0_f32 {
            0_f32
        } else {
            pretensing_countdown
        };
        self.pretensing_countdown > 0_f32
    }

    pub fn midpoint(&self) -> Vector3<f32> {
        let mut midpoint: Vector3<f32> = zero();
        for joint in &self.joints {
            midpoint += joint.location.to_vec();
        }
        let denominator = if self.joints.is_empty() { 1 } else { self.joints.len() } as f32;
        midpoint / denominator
    }

    pub fn get_stage(&self) -> Stage {
        self.stage
    }

    pub fn request_stage(&mut self, requested_stage: Stage, world: &World) -> Option<Stage> {
        match self.stage {
            Stage::Growing => match requested_stage {
                Stage::Shaping => Some(self.set_stage(requested_stage)),
                _ => None,
            },
            Stage::Shaping => match requested_stage {
                Stage::Pretenst => Some(self.set_stage(requested_stage)),
                Stage::Slack => Some(self.start_slack()),
                _ => None,
            },
            Stage::Slack => match requested_stage {
                Stage::Pretensing => Some(self.start_pretensing(world)),
                Stage::Shaping => Some(self.slack_to_shaping(world)),
                _ => None,
            },
            Stage::Pretensing => match requested_stage {
                Stage::Pretenst => Some(self.set_stage(requested_stage)),
                _ => None,
            },
            Stage::Pretenst => match requested_stage {
                Stage::Slack => Some(self.start_slack()),
                _ => None,
            },
        }
    }

    fn create_id(&mut self) -> UniqueId {
        let id = UniqueId { id: self.unique_id };
        self.unique_id += 1;
        id
    }

    fn mark_busy(&mut self) {
        self.busy_countdown = BUSY_COUNTDOWN;
    }
}
