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

#[wasm_bindgen]
#[derive(Clone)]
pub struct Fabric {
    pub age: u32,
    pub(crate) stage: Stage,
    pub(crate) joints: Vec<Joint>,
    pub(crate) intervals: Vec<Interval>,
    pub(crate) faces: Vec<Face>,
    pub(crate) realizing_countdown: f32,
    joint_middle_index: u16,
    joint_left_index: u16,
    joint_right_index: u16,
}

#[wasm_bindgen]
impl Fabric {
    pub fn new(joint_count: usize) -> Fabric {
        Fabric {
            age: 0,
            stage: Stage::Busy,
            realizing_countdown: 0_f32,
            joints: Vec::with_capacity(joint_count),
            intervals: Vec::with_capacity(joint_count * 3),
            faces: Vec::with_capacity(joint_count),
            joint_middle_index: 0,
            joint_left_index: 0,
            joint_right_index: 0,
        }
    }

    pub fn clear(&mut self) {
        self.age = 0;
        self.stage = Stage::Busy;
        self.joints.clear();
        self.intervals.clear();
        self.faces.clear();
    }

    pub fn clone(&self) -> Fabric {
        Fabric {
            age: 0,
            stage: Stage::Busy,
            realizing_countdown: 0_f32,
            joints: self.joints.clone(),
            intervals: self.intervals.clone(),
            faces: self.faces.clone(),
            joint_middle_index: 0,
            joint_left_index: 0,
            joint_right_index: 0,
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
    }

    pub fn create_interval(
        &mut self,
        alpha_index: usize,
        omega_index: usize,
        interval_role: IntervalRole,
        ideal_length: f32,
        rest_length: f32,
        stiffness: f32,
        countdown: f32,
    ) -> usize {
        let index = self.intervals.len();
        self.intervals.push(Interval::new(
            alpha_index,
            omega_index,
            interval_role,
            ideal_length,
            rest_length,
            stiffness,
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
        for interval in self.intervals.iter_mut() {
            if interval.interval_role == IntervalRole::FaceConnector
                || interval.interval_role == IntervalRole::FaceDistancer
            {
                if interval.alpha_index > index {
                    interval.alpha_index -= 1;
                }
                if interval.omega_index > index {
                    interval.omega_index -= 1;
                }
            }
        }
    }

    pub fn twitch_face(
        &mut self,
        face_index: usize,
        delta_size_nuance: f32,
        attack_countdown: f32,
        decay_countdown: f32,
    ) {
        self.faces[face_index].twitch(
            &mut self.intervals,
            delta_size_nuance,
            attack_countdown,
            decay_countdown,
        )
    }

    pub fn grasp_face(&mut self, face_index: usize, countdown: u16) {
        self.faces[face_index].grasp(&mut self.joints, countdown);
    }

    pub fn iterate(&mut self, requested_stage: Stage, world: &World) -> Stage {
        let realizing_nuance =
            (world.realizing_countdown - self.realizing_countdown) / world.realizing_countdown;
        self.ticks(world, realizing_nuance);
        self.set_strain_nuances(world);
        self.age += world.iterations_per_frame as u32;
        let response_stage = self.request_stage(requested_stage, world);
        if response_stage != Stage::Busy {
            return response_stage;
        }
        self.on_iterations(world)
    }

    pub fn centralize(&mut self) {
        let mut midpoint: Vector3<f32> = zero();
        for joint in self.joints.iter() {
            midpoint += &joint.location.coords;
        }
        midpoint /= self.joints.len() as f32;
        for joint in self.joints.iter_mut() {
            joint.location -= &midpoint;
        }
    }

    pub fn set_altitude(&mut self, altitude: f32) {
        match self
            .joints
            .iter()
            .map(|joint| joint.location.y)
            .min_by(|a, b| a.partial_cmp(b).unwrap())
        {
            Some(low_y) => {
                for joint in &mut self.joints {
                    joint.location.y += altitude - low_y;
                }
                for joint in &mut self.joints {
                    joint.velocity.fill(0.0);
                }
            }
            None => {}
        }
    }

    pub fn adopt_lengths(&mut self) -> Stage {
        for interval in self.intervals.iter_mut() {
            interval.length_0 = interval.calculate_current_length(&self.joints, &self.faces);
            interval.length_1 = interval.length_0;
        }
        for joint in self.joints.iter_mut() {
            joint.force.fill(0_f32);
            joint.velocity.fill(0_f32);
        }
        self.set_altitude(0_f32);
        self.set_stage(Stage::Slack)
    }

    pub fn finish_growing(&mut self) -> Stage {
        self.set_stage(Stage::Shaping)
    }

    pub fn multiply_rest_length(&mut self, index: usize, factor: f32, countdown: f32) {
        self.intervals[index].multiply_rest_length(factor, countdown);
    }

    pub fn change_rest_length(&mut self, index: usize, rest_length: f32, countdown: f32) {
        self.intervals[index].change_rest_length(rest_length, countdown);
    }

    pub fn set_interval_role(&mut self, index: usize, interval_role: IntervalRole) {
        self.intervals[index].set_interval_role(interval_role);
    }

    pub fn apply_matrix4(&mut self, m: &[f32]) {
        let matrix: Matrix4<f32> = Matrix4::from_vec(m.to_vec());
        for joint in &mut self.joints {
            *joint.location = *matrix.transform_point(&joint.location);
        }
    }

    pub fn copy_stiffnesses(&mut self, new_stiffnesses: &mut [f32]) {
        for (index, interval) in &mut self.intervals.iter_mut().enumerate() {
            interval.stiffness = new_stiffnesses[index];
            interval.linear_density = interval.stiffness.sqrt();
        }
    }

    fn request_stage(&mut self, requested_stage: Stage, world: &World) -> Stage {
        match self.stage {
            Stage::Busy => match requested_stage {
                Stage::Growing => self.set_stage(requested_stage),
                Stage::Realizing => self.start_realizing(world),
                _ => Stage::Busy,
            },
            Stage::Growing => {
                self.set_altitude(0_f32);
                Stage::Busy
            }
            Stage::Shaping => {
                self.set_altitude(0_f32);
                match requested_stage {
                    Stage::Realizing => self.start_realizing(world),
                    Stage::Slack => self.set_stage(Stage::Slack),
                    _ => Stage::Busy,
                }
            }
            Stage::Slack => match requested_stage {
                Stage::Realizing => self.start_realizing(world),
                Stage::Shaping => self.slack_to_shaping(world),
                _ => Stage::Busy,
            },
            _ => Stage::Busy,
        }
    }

    fn set_strain_nuances(&mut self, world: &World) {
        for interval in self.intervals.iter_mut() {
            interval.strain_nuance = interval.strain_nuance_in(world);
        }
    }

    fn on_iterations(&mut self, world: &World) -> Stage {
        if self.interval_busy_max() > 0_f32 {
            return Stage::Busy;
        }
        if self.realizing_countdown == 0_f32 {
            return self.stage;
        }
        let after_iterations: f32 = self.realizing_countdown - world.iterations_per_frame;
        if after_iterations > 0_f32 {
            self.realizing_countdown = after_iterations;
            self.stage
        } else {
            self.realizing_countdown = 0_f32;
            if self.stage == Stage::Realizing {
                self.set_stage(Stage::Realized)
            } else {
                self.stage
            }
        }
    }

    fn ticks(&mut self, world: &World, realizing_nuance: f32) {
        for _tick in 0..(world.iterations_per_frame as usize) {
            self.tick(&world, realizing_nuance);
        }
    }

    fn tick(&mut self, world: &World, realizing_nuance: f32) {
        for joint in &mut self.joints {
            joint.force.fill(0_f32);
            joint.interval_mass = 0_f32;
        }
        for interval in &mut self.intervals {
            interval.physics(
                world,
                &mut self.joints,
                &mut self.faces,
                self.stage,
                realizing_nuance,
            );
        }
        match self.stage {
            Stage::Growing | Stage::Shaping => {
                for joint in &mut self.joints {
                    joint.velocity_physics(
                        world,
                        0_f32,
                        world.shaping_drag,
                        world.antigravity,
                        false,
                    )
                }
            }
            Stage::Realizing => {
                let nuanced_gravity = world.gravity * realizing_nuance;
                for joint in &mut self.joints {
                    joint.velocity_physics(
                        world,
                        nuanced_gravity,
                        world.drag,
                        world.antigravity,
                        true,
                    )
                }
            }
            Stage::Realized => {
                for joint in &mut self.joints {
                    joint.velocity_physics(
                        world,
                        world.gravity,
                        world.drag,
                        world.antigravity,
                        true,
                    )
                }
            }
            _ => {}
        }
        for joint in &mut self.joints {
            joint.location_physics();
        }
    }

    fn interval_busy_max(&self) -> f32 {
        self.intervals
            .iter()
            .cloned()
            .map(|i| i.length_nuance)
            .fold(0_f32, f32::max)
    }

    fn set_stage(&mut self, stage: Stage) -> Stage {
        self.stage = stage;
        stage
    }

    fn start_realizing(&mut self, world: &World) -> Stage {
        self.realizing_countdown = world.realizing_countdown;
        self.set_stage(Stage::Realizing)
    }

    fn slack_to_shaping(&mut self, world: &World) -> Stage {
        for interval in &mut self.intervals {
            if interval.is_push() {
                interval
                    .multiply_rest_length(world.shaping_pretenst_factor, world.interval_countdown);
            }
        }
        self.set_stage(Stage::Shaping)
    }
}
