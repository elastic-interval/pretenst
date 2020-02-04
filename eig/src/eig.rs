/*
 * Copyright (c) 2020. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */
use nalgebra::*;
use crate::*;
use joint::Joint;
use interval::Interval;
use face::Face;
use constants::ROLE_COLORS;
use constants::SLACK_COLOR;
use constants::ATTENUATED_COLOR;

pub struct EIG {
    age: u32,
    stage: Stage,
    busy_countdown: u32,
    joints: Vec<Joint>,
    intervals: Vec<Interval>,
    faces: Vec<Face>,
}

impl EIG {
    pub fn new(joint_count: usize, interval_count: usize) -> EIG {
        EIG {
            age: 0,
            stage: Stage::Busy,
            busy_countdown: 0,
            joints: Vec::with_capacity(joint_count),
            intervals: Vec::with_capacity(interval_count),
            faces: Vec::with_capacity(interval_count / 3), // todo
        }
    }

    pub fn get_interval_count(&self) -> u16 {
        self.intervals.len() as u16
    }

    fn get_realizing_nuance(&self, environment: &Environment) -> f32 {
        let countdown = environment.get_float_feature(FabricFeature::RealizingCountdown);
        return (countdown - self.busy_countdown as f32) / countdown;
    }

    pub fn create_joint(&mut self, x: f32, y: f32, z: f32) -> usize {
        let index = self.joints.len();
        self.joints.push(Joint::new(x, y, z));
        index
    }

    pub fn create_interval(&mut self, alpha_index: usize, omega_index: usize, interval_role: IntervalRole,
                           rest_length: f32, stiffness: f32, linear_density: f32, countdown: u16) -> usize {
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

    fn set_face_midpoints(&mut self) {
        for face in &mut self.faces {
            let mut sum: Vector3<f32> = zero();
            for index in 0..3 {
                sum += &face.joint(&self.joints, index).location
            }
            face.midpoint = sum / 3.0;
        }
    }

    fn tick(&mut self, environment: &Environment) {
        let realizing_nuance = self.get_realizing_nuance(environment);
        for interval in &mut self.intervals {
            interval.physics(&mut self.joints, self.stage, environment, realizing_nuance)
        }
        for joint in &mut self.joints {
            joint.physics(0.0, 0.0, environment)
        }
    }

    fn set_stage(&mut self, stage: Stage) -> Stage {
        self.stage = stage;
        stage
    }

    fn set_altitude(&mut self, altitude: f32) -> f32 {
        let low_y = self.joints.iter()
            .map(|joint| joint.location.y)
            .min_by(|a, b| a.partial_cmp(b).unwrap()).unwrap();
        for joint in &mut self.joints {
            joint.location.y += altitude - low_y;
        };
        for joint in &mut self.joints {
            joint.velocity.fill(0.0);
        };
        return altitude - low_y;
    }

    fn start_realizing(&mut self, environment: &Environment) -> Stage {
        self.busy_countdown = environment.realizing_countdown;
        self.set_stage(Stage::Realizing)
    }

    fn slack_to_shaping(&mut self, environment: &Environment) -> Stage {
        let countdown = environment.get_float_feature(FabricFeature::IntervalCountdown) as u16;
        let shaping_pretenst_factor = environment.get_float_feature(FabricFeature::ShapingPretenstFactor);
        for interval in &mut self.intervals {
            if interval.is_push() {
                interval.multiply_rest_length(shaping_pretenst_factor, countdown);
            }
        }
        self.set_stage(Stage::Shaping)
    }

    pub fn iterate(&mut self, requested_stage: Stage, environment: &Environment) -> Stage {
        for _tick in 0..environment.iterations_per_frame {
            self.tick(environment);
        }
        self.age += environment.iterations_per_frame as u32;
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
                    Stage::Realizing => return self.start_realizing(environment),
                    Stage::Slack => return self.set_stage(Stage::Slack),
                    _ => {}
                }
            }
            Stage::Slack => {
                match requested_stage {
                    Stage::Realizing => return self.start_realizing(environment),
                    Stage::Shaping => return self.slack_to_shaping(environment),
                    _ => {}
                }
            }
            _ => {}
        }
        let interval_busy_countdown = self.intervals.iter()
            .map(|interval| interval.countdown).max().unwrap();
        if interval_busy_countdown == 0 || self.busy_countdown > 0 {
            if self.busy_countdown == 0 {
                if self.stage == Stage::Realizing {
                    return self.set_stage(Stage::Realized);
                }
                return self.stage;
            }
            let mut next_countdown: u32 = self.busy_countdown - environment.iterations_per_frame as u32;
            if next_countdown > self.busy_countdown { // rollover
                next_countdown = 0
            }
            self.busy_countdown = next_countdown;
            if next_countdown == 0 {
                return self.stage;
            }
        }
        Stage::Busy
    }

    pub fn render_to(&mut self, fabric: &mut Fabric, environment: &Environment) {
        self.set_face_midpoints();
        let max_strain = environment.get_float_feature(FabricFeature::MaxStrain);
        let visual_strain = environment.get_float_feature(FabricFeature::VisualStrain);
        let slack_threshold = environment.get_float_feature(FabricFeature::SlackThreshold);
        for (index, interval) in self.intervals.iter().enumerate() {
            let extend = interval.strain / 2.0 * visual_strain;
            let offset = index * 6;
            interval.set_line_locations(&mut fabric.line_locations, offset, &self.joints, extend);
            let unsafe_nuance = (interval.strain + max_strain) / (max_strain * 2.0);
            let nuance = if unsafe_nuance < 0.0 { 0.0 } else { if unsafe_nuance >= 1.0 { 0.9999999 } else { unsafe_nuance } };
            let slack = interval.strain.abs() < slack_threshold;
            if !environment.color_pushes && !environment.color_pulls {
                interval.set_line_color(&mut fabric.line_colors, offset, ROLE_COLORS[interval.interval_role as usize])
            } else if environment.color_pushes && environment.color_pulls {
                if slack {
                    interval.set_line_color(&mut fabric.line_colors, offset, SLACK_COLOR)
                } else {
                    interval.set_line_color_nuance(&mut fabric.line_colors, offset, nuance)
                }
            } else if interval.is_push() {
                if environment.color_pulls {
                    interval.set_line_color(&mut fabric.line_colors, offset, ATTENUATED_COLOR)
                } else if slack {
                    interval.set_line_color(&mut fabric.line_colors, offset, SLACK_COLOR)
                } else {
                    interval.set_line_color_nuance(&mut fabric.line_colors, offset, nuance)
                }
            } else { // pull
                if environment.color_pushes {
                    interval.set_line_color(&mut fabric.line_colors, offset, ATTENUATED_COLOR)
                } else if slack {
                    interval.set_line_color(&mut fabric.line_colors, offset, SLACK_COLOR)
                } else {
                    interval.set_line_color_nuance(&mut fabric.line_colors, offset, nuance)
                }
            }
        }
    }
}

