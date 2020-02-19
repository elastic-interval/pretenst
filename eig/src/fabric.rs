/*
 * Copyright (c) 2020. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

use wasm_bindgen::prelude::*;

use crate::constants::*;
use crate::face::Face;
use crate::interval::Interval;
use crate::joint::Joint;
use crate::view::View;
use crate::world::World;
use nalgebra::*;

#[wasm_bindgen]
#[derive(Clone)]
pub struct Fabric {
    pub age: u32,
    pub(crate) stage: Stage,
    pub(crate) current_shape: u8,
    pub(crate) joints: Vec<Joint>,
    pub(crate) intervals: Vec<Interval>,
    pub(crate) faces: Vec<Face>,
    pub(crate) realizing_countdown: f32,
}

#[wasm_bindgen]
impl Fabric {
    pub fn new(joint_count: usize) -> Fabric {
        Fabric {
            age: 0,
            stage: Stage::Busy,
            realizing_countdown: 0_f32,
            current_shape: REST_SHAPE,
            joints: Vec::with_capacity(joint_count),
            intervals: Vec::with_capacity(joint_count * 3),
            faces: Vec::with_capacity(joint_count),
        }
    }

    pub fn clear(&mut self) {
        self.age = 0;
        self.stage = Stage::Busy;
        self.current_shape = REST_SHAPE;
        self.joints.clear();
        self.intervals.clear();
        self.faces.clear();
    }

    pub fn copy(&self) -> Fabric {
        self.clone()
    }

    pub fn restore(&mut self, fabric: &Fabric) {
        self.age = fabric.age;
        self.stage = fabric.stage;
        self.realizing_countdown = fabric.realizing_countdown;
        self.joints.copy_from_slice(&fabric.joints);
        self.intervals.copy_from_slice(&fabric.intervals);
        self.faces.copy_from_slice(&fabric.faces);
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
        linear_density: f32,
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
            linear_density,
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
            if interval.interval_role == IntervalRole::FacePull {
                if interval.alpha_index > index {
                    interval.alpha_index -= 1;
                }
                if interval.omega_index > index {
                    interval.omega_index -= 1;
                }
            }
        }
    }

    pub fn iterate(&mut self, requested_stage: Stage, world: &World) -> Stage {
        let realizing_nuance =
            (world.realizing_countdown - self.realizing_countdown) / world.realizing_countdown;
        for _tick in 0..(world.iterations_per_frame as usize) {
            self.tick(&world, realizing_nuance);
        }
        self.age += world.iterations_per_frame as u32;
        match self.stage {
            Stage::Busy => {
                if requested_stage == Stage::Growing {
                    return self.set_stage(requested_stage);
                }
            }
            Stage::Growing => {
                //                self.set_altitude(0.0);
            }
            Stage::Shaping => {
                self.set_altitude(0.0);
                match requested_stage {
                    Stage::Realizing => return self.start_realizing(world),
                    Stage::Slack => return self.set_stage(Stage::Slack),
                    _ => {}
                }
            }
            Stage::Slack => match requested_stage {
                Stage::Realizing => return self.start_realizing(world),
                Stage::Shaping => return self.slack_to_shaping(world),
                _ => {}
            },
            _ => {}
        }
        if self.interval_busy_max() > 0_f32 {
            return Stage::Busy;
        }
        if self.realizing_countdown == 0_f32 {
            return self.stage;
        }
        let after_iterations: f32 = self.realizing_countdown - world.iterations_per_frame;
        if after_iterations > 0_f32 {
            self.realizing_countdown = after_iterations;
            Stage::Busy
        } else {
            self.realizing_countdown = 0_f32;
            if self.stage == Stage::Realizing {
                self.set_stage(Stage::Realized)
            } else {
                self.stage
            }
        }
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

    pub fn set_altitude(&mut self, altitude: f32) -> f32 {
        let low_y = self
            .joints
            .iter()
            .map(|joint| joint.location.y)
            .min_by(|a, b| a.partial_cmp(b).unwrap())
            .unwrap();
        for joint in &mut self.joints {
            joint.location.y += altitude - low_y;
        }
        for joint in &mut self.joints {
            joint.velocity.fill(0.0);
        }
        return altitude - low_y;
    }

    pub fn adopt_lengths(&mut self) -> Stage {
        for interval in self.intervals.iter_mut() {
            interval.ideal_length = interval.calculate_current_length(&self.joints, &self.faces);
            interval.length_for_shape[self.current_shape as usize] = interval.ideal_length;
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
        self.intervals[index].multiply_rest_length(factor, countdown, self.current_shape);
    }

    pub fn change_rest_length(&mut self, index: usize, rest_length: f32, countdown: f32) {
        self.intervals[index].change_rest_length(rest_length, countdown, self.current_shape);
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

    pub fn render_to(&mut self, view: &mut View, world: &World) {
        view.clear();
        for joint in self.joints.iter() {
            joint.project(view);
        }
        view.midpoint /= self.joints.len() as f32;
        for interval in self.intervals.iter() {
            let extend = interval.strain / -2_f32 * world.visual_strain;
            interval.project_line_locations(view, &self.joints, &self.faces, extend);
            interval.project_line_features(view)
        }
        for interval in self.intervals.iter() {
            let unsafe_nuance = (interval.strain + world.max_strain) / (world.max_strain * 2_f32);
            let nuance = if unsafe_nuance < 0_f32 {
                0_f32
            } else {
                if unsafe_nuance >= 1_f32 {
                    0.9999999_f32
                } else {
                    unsafe_nuance
                }
            };
            view.strain_nuances.push(nuance);
            let slack = interval.strain.abs() < world.slack_threshold;
            if !world.color_pushes && !world.color_pulls {
                interval.project_role_color(view)
            } else if world.color_pushes && world.color_pulls {
                if slack {
                    Interval::project_slack_color(view)
                } else {
                    Interval::project_line_color_nuance(view, nuance)
                }
            } else if interval.is_push() {
                if world.color_pulls {
                    Interval::project_attenuated_color(view)
                } else if slack {
                    Interval::project_slack_color(view)
                } else {
                    Interval::project_line_color_nuance(view, nuance)
                }
            } else {
                // pull
                if world.color_pushes {
                    Interval::project_attenuated_color(view)
                } else if slack {
                    Interval::project_slack_color(view)
                } else {
                    Interval::project_line_color_nuance(view, nuance)
                }
            }
        }
        for face in self.faces.iter() {
            face.project_features(&self.joints, view)
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
                self.current_shape,
            );
        }
        match self.stage {
            Stage::Growing | Stage::Shaping => {
                for joint in &mut self.joints {
                    joint.physics(world, 0_f32, world.shaping_drag, false)
                }
            }
            Stage::Realizing => {
                let nuanced_gravity = world.gravity * realizing_nuance;
                for joint in &mut self.joints {
                    joint.physics(world, nuanced_gravity, world.drag, true)
                }
            }
            Stage::Realized => {
                for joint in &mut self.joints {
                    joint.physics(world, world.gravity, world.drag, true)
                }
            }
            _ => {}
        }
        for joint in &mut self.joints {
            joint.location += &joint.velocity;
        }
    }

    fn interval_busy_max(&self) -> f32 {
        self.intervals
            .iter()
            .cloned()
            .map(|i| i.countdown)
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
                interval.multiply_rest_length(
                    world.shaping_pretenst_factor,
                    world.interval_countdown,
                    REST_SHAPE,
                );
            }
        }
        self.set_stage(Stage::Shaping)
    }
}
