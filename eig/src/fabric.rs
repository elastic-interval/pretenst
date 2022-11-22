/*
 * Copyright (c) 2020. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

use std::cmp::Ordering;
use std::ops::{AddAssign, Mul};

use cgmath::{EuclideanSpace, Matrix4, MetricSpace, Transform, Vector3};
use cgmath::num_traits::{abs, zero};

use crate::constants::*;
use crate::face::Face;
use crate::interval::Interval;
use crate::interval::Span::{Approaching, Fixed};
use crate::joint::Joint;
use crate::role::Role;
use crate::world::World;

pub const DEFAULT_STRAIN_LIMITS: [f32; 4] = [0_f32, -1e9_f32, 1e9_f32, 0_f32];

pub const COUNTDOWN: f32 = 5000.0;

pub struct Fabric {
    pub age: u32,
    pub(crate) stage: Stage,
    pub(crate) joints: Vec<Joint>,
    pub(crate) intervals: Vec<Interval>,
    pub(crate) faces: Vec<Face>,
    pub(crate) pretensing_countdown: f32,
    pub(crate) strain_limits: [f32; 4],
}

impl Default for Fabric {
    fn default() -> Fabric {
        Fabric {
            age: 0,
            stage: Stage::Growing,
            pretensing_countdown: 0_f32,
            joints: Vec::new(),
            intervals: Vec::new(),
            faces: Vec::new(),
            strain_limits: DEFAULT_STRAIN_LIMITS,
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
        self.intervals
            .iter_mut()
            .for_each(|interval| interval.joint_removed(index));
    }

    pub fn create_interval(
        &mut self,
        alpha_index: usize,
        omega_index: usize,
        role: &'static Role,
        scale: f32,
    ) -> usize {
        let initial_length = self.joints[alpha_index].location.distance(self.joints[omega_index].location);
        let final_length = role.reference_length * scale;
        let countdown = COUNTDOWN * abs(final_length - initial_length);
        let span = Approaching { initial_length, final_length, attack: 1f32 / countdown, nuance: 0f32 };
        let index = self.intervals.len();
        self.intervals.push(Interval::new(alpha_index, omega_index, role, span));
        index
    }

    pub fn remove_interval(&mut self, index: usize) {
        self.intervals.remove(index);
        self.faces.iter_mut().for_each(|face| face.interval_removed(index))
    }

    pub fn create_face(&mut self, face: Face) -> usize {
        let index = self.faces.len();
        if face.index != index {
            panic!("Bad face index");
        }
        self.faces.push(face);
        index
    }

    pub fn remove_face(&mut self, index: usize) {
        let face = &self.faces[index];
        let middle_joint = face.middle_joint(&self.intervals);
        let mut rad = face.radial_intervals;
        if rad[1] > rad[0] {
            rad[1] -= 1;
            if rad[2] > rad[0] {
                rad[2] -= 1;
            }
        }
        if rad[2] > rad[1] {
            rad[2] -= 1;
        }
        for radial in rad {
            self.remove_interval(radial);
        }
        self.remove_joint(middle_joint);
        self.faces.remove(index);
        self.faces.iter_mut().for_each(|face| if face.index > index { face.index -= 1 });
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
        if let Some(low_y) = self.joints.iter().filter(|joint| joint.is_connected())
            .map(|joint| joint.location.y)
            .min_by(|a, b| a.partial_cmp(b).unwrap_or(Ordering::Equal)) {
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
            midpoint.add_assign(joint.location.to_vec())
        }
        let denominator = if self.joints.is_empty() { 1 } else { self.joints.len() } as f32;
        midpoint.mul(1f32 / denominator)
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
}
