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

#[wasm_bindgen]
pub struct Fabric {
    pub(crate) age: u32,
    pub(crate) stage: Stage,
    pub(crate) current_shape: u8,
    pub(crate) busy_countdown: u32,
    pub(crate) joints: Vec<Joint>,
    pub(crate) intervals: Vec<Interval>,
    pub(crate) faces: Vec<Face>,
}

#[wasm_bindgen]
impl Fabric {
    pub fn new(joint_count: usize, interval_count: usize) -> Fabric {
        Fabric {
            age: 0,
            stage: Stage::Busy,
            busy_countdown: 0,
            current_shape: REST_SHAPE,
            joints: Vec::with_capacity(joint_count),
            intervals: Vec::with_capacity(interval_count),
            faces: Vec::with_capacity(interval_count / 3), // todo
        }
    }

    pub fn get_interval_count(&self) -> u16 {
        self.intervals.len() as u16
    }

    pub fn get_joint_count(&self) -> u16 {
        self.joints.len() as u16
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
        rest_length: f32,
        stiffness: f32,
        linear_density: f32,
        countdown: u16,
    ) -> usize {
        let index = self.intervals.len();
        self.intervals.push(Interval::new(
            alpha_index,
            omega_index,
            interval_role,
            rest_length,
            stiffness,
            linear_density,
            countdown,
        ));
        index
    }

    pub fn create_face(&mut self, joint0: u16, joint1: u16, joint2: u16) -> usize {
        let index = self.faces.len();
        self.faces.push(Face::new(joint0, joint1, joint2));
        index
    }

    pub fn iterate(&mut self, requested_stage: Stage, world: &World) -> Stage {
        let countdown = world.realizing_countdown;
        let realizing_nuance = (countdown - self.busy_countdown as f32) / countdown;
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
                self.set_altitude(0.0);
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
        let interval_busy = self.intervals.iter().map(|i| i.countdown).max().unwrap();
        if interval_busy > 0 {
            return Stage::Busy;
        }
        if self.busy_countdown > 0 {
            if self.busy_countdown == 0 {
                if self.stage == Stage::Realizing {
                    return self.set_stage(Stage::Realized);
                }
                return self.stage;
            }
            let mut next: u32 = self.busy_countdown - world.iterations_per_frame as u32;
            if next > self.busy_countdown {
                // rollover
                next = 0
            }
            self.busy_countdown = next;
            if next == 0 {
                return self.stage;
            }
        }
        Stage::Busy
    }

    pub fn finish_growing(&mut self) -> Stage {
        self.set_stage(Stage::Shaping)
    }

    pub fn render_to(&mut self, view: &mut View, world: &World) {
        view.clear();
        for joint in self.joints.iter() {
            view.midpoint += &joint.location.coords;
            view.joint_locations.push(joint.location.x);
            view.joint_locations.push(joint.location.y);
            view.joint_locations.push(joint.location.z);
        }
        view.midpoint /= view.joint_locations.len() as f32;
        for interval in self.intervals.iter() {
            let extend = interval.strain / 2.0 * world.visual_strain;
            interval.project_line_locations(view, &self.joints, extend);
        }
        for interval in self.intervals.iter() {
            let unsafe_nuance = (interval.strain + world.max_strain) / (world.max_strain * 2.0);
            let nuance = if unsafe_nuance < 0.0 {
                0.0
            } else {
                if unsafe_nuance >= 1.0 {
                    0.9999999
                } else {
                    unsafe_nuance
                }
            };
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
    }

    fn tick(&mut self, world: &World, realizing_nuance: f32) {
        for interval in &mut self.intervals {
            interval.physics(
                world,
                &mut self.joints,
                &mut self.faces,
                self.stage,
                realizing_nuance,
                self.current_shape,
            )
        }
        for joint in &mut self.joints {
            joint.physics(world)
        }
    }

    fn set_stage(&mut self, stage: Stage) -> Stage {
        self.stage = stage;
        stage
    }

    fn set_altitude(&mut self, altitude: f32) -> f32 {
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

    fn start_realizing(&mut self, world: &World) -> Stage {
        self.busy_countdown = world.realizing_countdown as u32;
        self.set_stage(Stage::Realizing)
    }

    fn slack_to_shaping(&mut self, world: &World) -> Stage {
        let countdown = world.interval_countdown as u16;
        for interval in &mut self.intervals {
            if interval.is_push() {
                interval.multiply_rest_length(world.shaping_pretenst_factor, countdown, REST_SHAPE);
            }
        }
        self.set_stage(Stage::Shaping)
    }
}
