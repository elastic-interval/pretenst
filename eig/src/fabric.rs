/*
 * Copyright (c) 2020. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

use nalgebra::*;
use wasm_bindgen::prelude::*;

use crate::constants::*;
use crate::face::Face;
use crate::interval::Interval;
use crate::joint::Joint;
use crate::world::World;

pub const DEFAULT_STRAIN_LIMITS: [f32; 4] = [0_f32, -1e9_f32, 1e9_f32, 0_f32];

#[wasm_bindgen]
pub struct Fabric {
    pub age: u32,
    pub(crate) stage: Stage,
    pub(crate) joints: Vec<Joint>,
    pub(crate) intervals: Vec<Interval>,
    pub(crate) faces: Vec<Face>,
    pub(crate) pretensing_countdown: f32,
    pub(crate) strain_limits: [f32; 4],
}

#[wasm_bindgen]
impl Fabric {
    pub fn new(joint_count: usize) -> Fabric {
        Fabric {
            age: 0,
            stage: Stage::Growing,
            pretensing_countdown: 0_f32,
            joints: Vec::with_capacity(joint_count),
            intervals: Vec::with_capacity(joint_count * 10),
            faces: Vec::with_capacity(joint_count),
            strain_limits: DEFAULT_STRAIN_LIMITS,
        }
    }

    pub fn clear(&mut self) {
        self.age = 0;
        self.stage = Stage::Growing;
        self.joints.clear();
        self.intervals.clear();
        self.faces.clear();
    }

    pub fn clone(&self) -> Fabric {
        Fabric {
            age: self.age,
            stage: self.stage,
            pretensing_countdown: self.pretensing_countdown,
            joints: self.joints.clone(),
            intervals: self.intervals.clone(),
            faces: self.faces.clone(),
            strain_limits: DEFAULT_STRAIN_LIMITS,
        }
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
        // todo: why does this not work?
        // match self.joints.iter().position(|joint| joint.removed) {
        //     Some(index) => {
        //         self.joints[index] = Joint::new(x, y, z);
        //         index
        //     }
        //     None => {
        //         let index = self.joints.len();
        //         self.joints.push(Joint::new(x, y, z));
        //         index
        //     }
        // }
    }

    pub fn remove_joint(&mut self, index: usize) {
        self.joints[index].removed = true
    }

    pub fn create_interval(
        &mut self,
        alpha_index: usize,
        omega_index: usize,
        push: bool,
        ideal_length: f32,
        rest_length: f32,
        countdown: f32,
    ) -> usize {
        let index = self.intervals.len();
        self.intervals.push(Interval::new(
            alpha_index,
            omega_index,
            push,
            ideal_length,
            rest_length,
            countdown,
        ));
        index
    }

    pub fn remove_interval(&mut self, index: usize) {
        self.intervals.remove(index);
    }

    pub fn create_face(&mut self, joint0: u16, joint1: u16, joint2: u16) -> usize {
        let index = self.faces.len();
        self.faces.push(Face::new(joint0, joint1, joint2));
        index
    }

    pub fn remove_face(&mut self, index: usize) {
        self.faces.remove(index);
    }

    pub fn twitch_face(
        &mut self,
        face_index: usize,
        attack_countdown: f32,
        decay_countdown: f32,
        delta_size_nuance: f32,
    ) {
        self.faces[face_index].twitch(
            &mut self.intervals,
            attack_countdown,
            decay_countdown,
            delta_size_nuance,
        )
    }

    pub fn centralize(&mut self) {
        let mut midpoint: Vector3<f32> = zero();
        for joint in self.joints.iter() {
            midpoint += &joint.location.coords;
        }
        midpoint /= self.joints.len() as f32;
        midpoint.y = 0_f32;
        for joint in self.joints.iter_mut() {
            joint.location -= &midpoint;
        }
    }

    pub fn set_altitude(&mut self, altitude: f32) {
        match self
            .joints
            .iter()
            .filter(|joint| joint.is_connected())
            .map(|joint| joint.location.y)
            .min_by(|a, b| a.partial_cmp(b).unwrap())
        {
            Some(low_y) => {
                let up = altitude - low_y;
                if up > 0_f32 {
                    for joint in &mut self.joints {
                        joint.location.y += up;
                    }
                }
            }
            None => {}
        }
    }

    pub fn multiply_rest_length(&mut self, index: usize, factor: f32, countdown: f32) {
        self.intervals[index].multiply_rest_length(factor, countdown);
    }

    pub fn change_rest_length(&mut self, index: usize, rest_length: f32, countdown: f32) {
        self.intervals[index].change_rest_length(rest_length, countdown);
    }

    pub fn apply_matrix4(&mut self, m: &[f32]) {
        let matrix: Matrix4<f32> = Matrix4::from_vec(m.to_vec());
        for joint in &mut self.joints {
            *joint.location = *matrix.transform_point(&joint.location);
            *joint.velocity = *matrix.transform_vector(&joint.velocity);
        }
    }

    pub fn copy_stiffnesses(&mut self, new_stiffnesses: &mut [f32]) {
        for (index, interval) in &mut self.intervals.iter_mut().enumerate() {
            interval.stiffness = new_stiffnesses[index];
        }
    }

    fn set_stage(&mut self, stage: Stage) -> Stage {
        self.stage = stage;
        stage
    }

    fn start_slack(&mut self) -> Stage {
        for interval in self.intervals.iter_mut() {
            interval.length_0 = interval.calculate_current_length(&self.joints);
            interval.length_1 = interval.length_0;
        }
        for joint in self.joints.iter_mut() {
            joint.force.fill(0_f32);
            joint.velocity.fill(0_f32);
        }
        self.set_stage(Stage::Slack)
    }

    fn start_pretensing(&mut self, world: &World) -> Stage {
        self.pretensing_countdown = world.pretensing_countdown;
        self.set_stage(Stage::Pretensing)
    }

    fn slack_to_shaping(&mut self, world: &World) -> Stage {
        for interval in &mut self.intervals {
            if interval.push {
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
            if interval.push {
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
            if !interval.slack {
                interval.physics(world, &mut self.joints, self.stage, pretensing_nuance);
            }
        }
        if pretensing_nuance == 0_f32 {
            self.set_altitude(1e-5_f32)
        }
        match self.stage {
            Stage::Growing | Stage::Shaping => {
                for joint in &mut self.joints {
                    if !joint.removed {
                        joint.velocity_physics(world, 0_f32, world.shaping_drag, 0_f32);
                    }
                }
            }
            Stage::Slack => {}
            Stage::Pretensing => {
                let gravity = world.gravity * pretensing_nuance;
                for joint in &mut self.joints {
                    if !joint.removed {
                        joint.velocity_physics(world, gravity, world.drag, pretensing_nuance)
                    }
                }
            }
            Stage::Pretenst => {
                for joint in &mut self.joints {
                    if !joint.removed {
                        joint.velocity_physics(world, world.gravity, world.drag, 1_f32)
                    }
                }
            }
        }
        for joint in &mut self.joints {
            if !joint.removed {
                joint.location_physics();
            }
        }
        if pretensing_nuance == 0_f32 {
            self.set_altitude(1e-5_f32)
        }
    }

    pub fn iterate(&mut self, world: &World) -> bool {
        for _tick in 0..(world.iterations_per_frame as usize) {
            self.tick(&world);
        }
        self.calculate_strain_limits();
        for interval in self.intervals.iter_mut() {
            interval.strain_nuance = interval.calculate_strain_nuance(&self.strain_limits);
        }
        self.age += world.iterations_per_frame as u32;
        let interval_busy_max = self
            .intervals
            .iter()
            .map(|i| i.length_nuance)
            .fold(0_f32, f32::max);
        if interval_busy_max > 0_f32 {
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
