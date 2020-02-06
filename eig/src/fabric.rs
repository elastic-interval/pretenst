/*
 * Copyright (c) 2020. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */
use crate::constants::REST_SHAPE;
use crate::*;
use face::Face;
use interval::Interval;
use joint::Joint;

pub struct Fabric {
    age: u32,
    stage: Stage,
    current_shape: u8,
    busy_countdown: u32,
    joints: Vec<Joint>,
    intervals: Vec<Interval>,
    faces: Vec<Face>,
}

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

    fn tick(
        &mut self,
        surface_character: SurfaceCharacter,
        push_and_pull: bool,
        realizing_nuance: f32,
        pretenst_factor: f32,
        shaping_pretenst_factor: f32,
        shaping_stiffness_factor: f32,
        face_pull_end_zone: f32,
        orientation_force: f32,
    ) {
        for interval in &mut self.intervals {
            interval.physics(
                &mut self.joints,
                &mut self.faces,
                self.stage,
                realizing_nuance,
                self.current_shape,
                push_and_pull,
                pretenst_factor,
                shaping_pretenst_factor,
                shaping_stiffness_factor,
                face_pull_end_zone,
                orientation_force,
            )
        }
        for joint in &mut self.joints {
            joint.physics(surface_character, 0.0, 0.0)
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

    fn start_realizing(&mut self, environment: &Environment) -> Stage {
        self.busy_countdown = environment.realizing_countdown;
        self.set_stage(Stage::Realizing)
    }

    fn slack_to_shaping(&mut self, environment: &Environment) -> Stage {
        let countdown = environment.get_float(FabricFeature::IntervalCountdown) as u16;
        let shaping_pretenst_factor = environment.get_float(FabricFeature::ShapingPretenstFactor);
        for interval in &mut self.intervals {
            if interval.is_push() {
                interval.multiply_rest_length(shaping_pretenst_factor, countdown, REST_SHAPE);
            }
        }
        self.set_stage(Stage::Shaping)
    }

    pub fn iterate(&mut self, requested_stage: Stage, environment: &Environment) -> Stage {
        let countdown = environment.get_float(FabricFeature::RealizingCountdown);
        let realizing_nuance = (countdown - self.busy_countdown as f32) / countdown;
        let pretenst_factor = environment.get_float(FabricFeature::PretenstFactor);
        let shaping_pretenst_factor = environment.get_float(FabricFeature::ShapingPretenstFactor);
        let shaping_stiffness_factor = environment.get_float(FabricFeature::ShapingStiffnessFactor);
        let face_pull_end_zone = environment.get_float(FabricFeature::FacePullEndZone);
        let orientation_force = environment.get_float(FabricFeature::FacePullOrientationForce);
        for _tick in 0..environment.iterations_per_frame {
            self.tick(
                environment.surface_character,
                environment.push_and_pull,
                realizing_nuance,
                pretenst_factor,
                shaping_pretenst_factor,
                shaping_stiffness_factor,
                face_pull_end_zone,
                orientation_force,
            );
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
            Stage::Slack => match requested_stage {
                Stage::Realizing => return self.start_realizing(environment),
                Stage::Shaping => return self.slack_to_shaping(environment),
                _ => {}
            },
            _ => {}
        }
        let interval_busy_countdown = self
            .intervals
            .iter()
            .map(|interval| interval.countdown)
            .max()
            .unwrap();
        if interval_busy_countdown == 0 || self.busy_countdown > 0 {
            if self.busy_countdown == 0 {
                if self.stage == Stage::Realizing {
                    return self.set_stage(Stage::Realized);
                }
                return self.stage;
            }
            let mut next_countdown: u32 =
                self.busy_countdown - environment.iterations_per_frame as u32;
            if next_countdown > self.busy_countdown {
                // rollover
                next_countdown = 0
            }
            self.busy_countdown = next_countdown;
            if next_countdown == 0 {
                return self.stage;
            }
        }
        Stage::Busy
    }

    pub fn render_to(&mut self, view: &mut FabricView, environment: &Environment) {
        view.clear();
        for joint in self.joints.iter() {
            view.midpoint += &joint.location.coords;
            view.joint_locations.push(joint.location.x);
            view.joint_locations.push(joint.location.y);
            view.joint_locations.push(joint.location.z);
        }
        view.midpoint /= view.joint_locations.len() as f32;
        let max_strain = environment.get_float(FabricFeature::MaxStrain);
        let visual_strain = environment.get_float(FabricFeature::VisualStrain);
        let slack_threshold = environment.get_float(FabricFeature::SlackThreshold);
        for interval in self.intervals.iter() {
            let extend = interval.strain / 2.0 * visual_strain;
            interval.project_line_locations(view, &self.joints, extend);
        }
        for interval in self.intervals.iter() {
            let unsafe_nuance = (interval.strain + max_strain) / (max_strain * 2.0);
            let nuance = if unsafe_nuance < 0.0 {
                0.0
            } else {
                if unsafe_nuance >= 1.0 {
                    0.9999999
                } else {
                    unsafe_nuance
                }
            };
            let slack = interval.strain.abs() < slack_threshold;
            if !environment.color_pushes && !environment.color_pulls {
                interval.project_role_color(view)
            } else if environment.color_pushes && environment.color_pulls {
                if slack {
                    Interval::project_slack_color(view)
                } else {
                    Interval::project_line_color_nuance(view, nuance)
                }
            } else if interval.is_push() {
                if environment.color_pulls {
                    Interval::project_attenuated_color(view)
                } else if slack {
                    Interval::project_slack_color(view)
                } else {
                    Interval::project_line_color_nuance(view, nuance)
                }
            } else {
                // pull
                if environment.color_pushes {
                    Interval::project_attenuated_color(view)
                } else if slack {
                    Interval::project_slack_color(view)
                } else {
                    Interval::project_line_color_nuance(view, nuance)
                }
            }
        }
    }
}
