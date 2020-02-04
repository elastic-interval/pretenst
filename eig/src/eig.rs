/*
 * Copyright (c) 2020. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */
use nalgebra::*;
use crate::*;

const ATTENUATED_COLOR: [f32; 3] = [
    0.0, 0.0, 0.0,
];

const SLACK_COLOR: [f32; 3] = [
    0.0, 1.0, 0.0,
];

const ROLE_COLORS: [[f32; 3]; 9] = [
    [0.799, 0.519, 0.304],
    [0.879, 0.295, 0.374],
    [0.215, 0.629, 0.747],
    [0.618, 0.126, 0.776],
    [0.670, 0.627, 0.398],
    [0.242, 0.879, 0.410],
    [0.613, 0.692, 0.382],
    [0.705, 0.709, 0.019],
    [0.577, 0.577, 0.577],
];

const RAINBOW: [[f32; 3]; 12] = [
    [0.1373, 0.1608, 0.9686],
    [0.0000, 0.4824, 1.0000],
    [0.0000, 0.6471, 1.0000],
    [0.0000, 0.7686, 0.8431],
    [0.0000, 0.8667, 0.6784],
    [0.3059, 0.8667, 0.5137],
    [0.5020, 0.8549, 0.3216],
    [0.6863, 0.8235, 0.0000],
    [0.8314, 0.7098, 0.0000],
    [0.9294, 0.5804, 0.0000],
    [0.9843, 0.4431, 0.1647],
    [0.9882, 0.3020, 0.3020],
];

const RESURFACE: f32 = 0.01;
const ANTIGRAVITY: f32 = -0.001;

struct Joint {
    location: Vector3<f32>,
    force: Vector3<f32>,
    velocity: Vector3<f32>,
    interval_mass: f32,
}

impl Joint {
    pub fn physics(&mut self, gravity_above: f32, drag_above: f32, environment: &Environment) {
        let altitude = self.location.y;
        if altitude > 0.0 {
            self.velocity.y -= gravity_above;
            self.velocity *= 1.0 - drag_above;
            self.velocity += &self.force / self.interval_mass;
        } else {
            self.velocity += &self.force / self.interval_mass;
            let degree_submerged: f32 = if -altitude < 1.0 { -altitude } else { 0.0 };
            let degree_cushioned: f32 = 1.0 - degree_submerged;
            match environment.surface_character {
                SurfaceCharacter::Frozen => {
                    self.velocity.fill(0.0);
                    self.location.y = -RESURFACE;
                }
                SurfaceCharacter::Sticky => {
                    self.velocity *= degree_cushioned;
                    self.velocity.y = degree_submerged * RESURFACE;
                }
                SurfaceCharacter::Slippery => {
                    self.location.fill(0.0);
                    self.velocity.fill(0.0);
                }
                SurfaceCharacter::Bouncy => {
                    self.velocity *= degree_cushioned;
                    self.velocity.y -= ANTIGRAVITY * degree_submerged;
                }
            }
        }
    }
}

struct Interval {
    alpha_index: usize,
    omega_index: usize,
    interval_role: IntervalRole,
    rest_length: f32,
    state_length: [f32; 2],
    stiffness: f32,
    linear_density: f32,
    countdown: u16,
    max_countdown: u16,
    unit: Vector3<f32>,
    strain: f32,
}

impl Interval {
    pub fn physics(&mut self, joints: &mut Vec<Joint>, stage: Stage, environment: &Environment, realizing_nuance: f32) {
        let mut ideal_length = self.ideal_length_now();
        let omega_location = &joints[self.omega_index].location;
        let alpha_location = &joints[self.alpha_index].location;
        self.unit = omega_location - alpha_location;
        let real_length = self.unit.norm();
        let push = self.is_push();
        if push {
            match stage {
                Stage::Busy | Stage::Slack => {}
                Stage::Growing | Stage::Shaping => {
                    ideal_length *= 1.0 + environment.get_float_feature(FabricFeature::ShapingPretenstFactor);
                }
                Stage::Realizing => {
                    ideal_length *= 1.0 + environment.get_float_feature(FabricFeature::PretenstFactor) * realizing_nuance
                }
                Stage::Realized => {
                    ideal_length *= 1.0 + environment.get_float_feature(FabricFeature::PretenstFactor)
                }
            }
        }
        self.strain = (real_length - ideal_length) / ideal_length;
        if !environment.push_and_pull && (push && self.strain > 0.0 || !push && self.strain < 0.0) {
            self.strain = 0.0;
        }
        let mut force = self.strain * self.stiffness;
        if stage <= Stage::Slack {
            force *= environment.get_float_feature(FabricFeature::ShapingStiffnessFactor)
        }
        let mut push: Vector3<f32> = zero();
        push += &self.unit;
        if self.interval_role == IntervalRole::FacePull {
            push *= force / 6.0;
            // TODO
            joints[self.alpha_index].force += &push;
            joints[self.omega_index].force -= &push;
        } else {
            push *= force / 2.0;
            joints[self.alpha_index].force += &push;
            joints[self.omega_index].force -= &push;
            let half_mass = ideal_length * self.linear_density / 2.0;
            joints[self.alpha_index].interval_mass += half_mass;
            joints[self.omega_index].interval_mass += half_mass;
        }
    }

    fn is_push(&self) -> bool {
        self.interval_role == IntervalRole::NexusPush || self.interval_role == IntervalRole::ColumnPush
    }

    fn ideal_length_now(&mut self) -> f32 {
        if self.countdown == 0 {
            self.rest_length
        } else {
            let max = self.max_countdown as f32;
            let progress: f32 = (max - self.countdown as f32) / max;
            let state_length = self.state_length[0];
            self.rest_length * (1.0 - progress) + state_length * progress
        }
    }

    fn change_rest_length(&mut self, rest_length: f32, countdown: u16) {
        self.rest_length = self.state_length[0];
        self.state_length[0] = rest_length;
        self.max_countdown = countdown;
        self.countdown = countdown;
    }

    fn multiply_rest_length(&mut self, factor: f32, countdown: u16) {
        let rest_length = self.state_length[0];
        self.change_rest_length(rest_length * factor, countdown)
    }
}

struct Face {
    joints: [u16; 3],
    midpoint: Vector3<f32>,
    normal: Vector3<f32>,
}

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
        self.joints.push(Joint {
            location: Vector3::new(x, y, z),
            force: zero(),
            velocity: zero(),
            interval_mass: 0.0,
        });
        index
    }

    pub fn create_interval(&mut self, alpha_index: usize, omega_index: usize, interval_role: IntervalRole,
                           rest_length: f32, stiffness: f32, linear_density: f32, countdown: u16) -> usize {
        let index = self.intervals.len();
        self.intervals.push(Interval {
            alpha_index,
            omega_index,
            interval_role,
            rest_length,
            state_length: [1.0; 2],
            stiffness,
            linear_density,
            countdown,
            max_countdown: countdown,
            unit: zero(),
            strain: 0.0,
        });
        index
    }

    pub fn create_face(&mut self, joint0: u16, joint1: u16, joint2: u16) -> usize {
        let index = self.faces.len();
        self.faces.push(Face {
            joints: [joint0, joint1, joint2],
            midpoint: zero(),
            normal: zero(),
        });
        index
    }

    fn set_face_midpoints(&mut self) {
        for face in &mut self.faces {
            let mut sum: Vector3<f32> = zero();
            for index in 0..3 {
                sum += &self.joints[face.joints[index] as usize].location
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

    fn set_line_color(line_colors: &mut Vec<f32>, offset: usize, color: [f32; 3]) {
        line_colors[offset] = color[0];
        line_colors[offset + 1] = color[1];
        line_colors[offset + 2] = color[2];
        line_colors[offset + 3] = color[0];
        line_colors[offset + 4] = color[1];
        line_colors[offset + 5] = color[2];
    }

    fn set_line_color_nuance(line_colors: &mut Vec<f32>, offset: usize, nuance: f32) {
        let rainbow_index = (nuance * RAINBOW.len() as f32 / 3.01).floor() as usize;
        EIG::set_line_color(line_colors, offset, RAINBOW[rainbow_index])
    }

    fn set_line_locations(line_locations: &mut Vec<f32>, offset: usize, alpha: &Vector3<f32>, omega: &Vector3<f32>, extend: f32, unit: &Vector3<f32>) {
        line_locations[offset] = alpha.x - unit.x * extend;
        line_locations[offset + 1] = alpha.y - unit.y * extend;
        line_locations[offset + 2] = alpha.z - unit.z * extend;
        line_locations[offset + 3] = omega.x + unit.x * extend;
        line_locations[offset + 4] = omega.y + unit.y * extend;
        line_locations[offset + 5] = omega.z + unit.z * extend;
    }

    pub fn render_to(&mut self, fabric: &mut Fabric, environment: &Environment) {
        self.set_face_midpoints();
        let max_strain = environment.get_float_feature(FabricFeature::MaxStrain);
        let visual_strain = environment.get_float_feature(FabricFeature::VisualStrain);
        let slack_threshold = environment.get_float_feature(FabricFeature::SlackThreshold);
        for (index, interval) in self.intervals.iter().enumerate() {
            let extend = interval.strain / 2.0 * visual_strain;
            let offset = index * 6;
            EIG::set_line_locations(
                &mut fabric.line_locations, offset,
                &self.joints[interval.alpha_index].location,
                &self.joints[interval.omega_index].location,
                extend, &interval.unit);
            let unsafe_nuance = (interval.strain + max_strain) / (max_strain * 2.0);
            let nuance = if unsafe_nuance < 0.0 { 0.0 } else { if unsafe_nuance >= 1.0 { 0.9999999 } else { unsafe_nuance } };
            let slack = interval.strain.abs() < slack_threshold;
            if !environment.color_pushes && !environment.color_pulls {
                EIG::set_line_color(&mut fabric.line_colors, offset, ROLE_COLORS[interval.interval_role as usize])
            } else if environment.color_pushes && environment.color_pulls {
                if slack {
                    EIG::set_line_color(&mut fabric.line_colors, offset, SLACK_COLOR)
                } else {
                    EIG::set_line_color_nuance(&mut fabric.line_colors, offset, nuance)
                }
            } else if interval.is_push() {
                if environment.color_pulls {
                    EIG::set_line_color(&mut fabric.line_colors, offset, ATTENUATED_COLOR)
                } else if slack {
                    EIG::set_line_color(&mut fabric.line_colors, offset, SLACK_COLOR)
                } else {
                    EIG::set_line_color_nuance(&mut fabric.line_colors, offset, nuance)
                }
            } else { // pull
                if environment.color_pushes {
                    EIG::set_line_color(&mut fabric.line_colors, offset, ATTENUATED_COLOR)
                } else if slack {
                    EIG::set_line_color(&mut fabric.line_colors, offset, SLACK_COLOR)
                } else {
                    EIG::set_line_color_nuance(&mut fabric.line_colors, offset, nuance)
                }
            }
        }
    }
}

