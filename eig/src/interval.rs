/*
 * Copyright (c) 2020. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */
use nalgebra::*;

use crate::constants::*;
use crate::face::Face;
use crate::joint::Joint;
use crate::view::View;
use crate::world::World;

#[derive(Clone, Copy)]
pub(crate) struct Interval {
    pub(crate) alpha_index: usize,
    pub(crate) omega_index: usize,
    pub(crate) interval_role: IntervalRole,
    pub(crate) ideal_length: f32,
    pub(crate) length_for_shape: [f32; SHAPE_COUNT],
    pub(crate) stiffness: f32,
    pub(crate) linear_density: f32,
    pub(crate) countdown: f32,
    pub(crate) max_countdown: f32,
    pub(crate) unit: Vector3<f32>,
    pub(crate) strain: f32,
    pub(crate) strain_nuance: f32,
}

impl Interval {
    pub fn new(
        alpha_index: usize,
        omega_index: usize,
        interval_role: IntervalRole,
        ideal_length: f32,
        rest_length: f32,
        stiffness: f32,
        countdown: f32,
    ) -> Interval {
        Interval {
            alpha_index,
            omega_index,
            interval_role,
            ideal_length,
            length_for_shape: [rest_length; SHAPE_COUNT],
            stiffness,
            linear_density: stiffness.sqrt(),
            countdown,
            max_countdown: countdown,
            unit: zero(),
            strain: 0_f32,
            strain_nuance: 0_f32,
        }
    }

    pub fn alpha<'a>(&self, joints: &'a Vec<Joint>) -> &'a Joint {
        &joints[self.alpha_index]
    }

    pub fn omega<'a>(&self, joints: &'a Vec<Joint>) -> &'a Joint {
        &joints[self.omega_index]
    }

    pub fn calculate_current_length(&mut self, joints: &Vec<Joint>, faces: &Vec<Face>) -> f32 {
        if self.interval_role == IntervalRole::FacePull {
            let mut alpha_midpoint: Point3<f32> = Point3::origin();
            let mut omega_midpoint: Point3<f32> = Point3::origin();
            &faces[self.alpha_index].project_midpoint(joints, &mut alpha_midpoint);
            &faces[self.omega_index].project_midpoint(joints, &mut omega_midpoint);
            self.unit = omega_midpoint - alpha_midpoint;
        } else {
            let alpha_location = &joints[self.alpha_index].location;
            let omega_location = &joints[self.omega_index].location;
            self.unit = omega_location - alpha_location;
        }
        let magnitude = self.unit.magnitude();
        if magnitude < 0.001_f32 {
            return 0.001_f32;
        }
        self.unit /= magnitude;
        magnitude
    }

    pub fn physics(
        &mut self,
        world: &World,
        joints: &mut Vec<Joint>,
        faces: &mut Vec<Face>,
        stage: Stage,
        realizing_nuance: f32,
        shape: u8,
    ) {
        let mut ideal_length = self.ideal_length_now(shape);
        let real_length = self.calculate_current_length(joints, faces);
        let is_push = self.is_push();
        if is_push {
            match stage {
                Stage::Busy | Stage::Slack => {}
                Stage::Growing | Stage::Shaping => {
                    ideal_length *= 1_f32 + world.shaping_pretenst_factor;
                }
                Stage::Realizing => {
                    ideal_length *= 1_f32 + world.pretenst_factor * realizing_nuance
                }
                Stage::Realized => ideal_length *= 1_f32 + world.pretenst_factor,
            }
        }
        self.strain = (real_length - ideal_length) / ideal_length;
        if !world.push_and_pull
            && (is_push && self.strain > 0_f32 || !is_push && self.strain < 0_f32)
        {
            self.strain = 0_f32;
        }
        let mut force = self.strain * self.stiffness;
        if stage <= Stage::Slack {
            force *= world.shaping_stiffness_factor;
        }
        if self.interval_role == IntervalRole::FacePull {
            let force_vector: Vector3<f32> = self.unit.clone() * force;
            let mut alpha_midpoint: Point3<f32> = Point3::origin();
            let mut omega_midpoint: Point3<f32> = Point3::origin();
            faces[self.alpha_index].project_midpoint(joints, &mut alpha_midpoint);
            faces[self.omega_index].project_midpoint(joints, &mut omega_midpoint);
            for face_joint in 0..3 {
                faces[self.alpha_index].joint_mut(joints, face_joint).force += &force_vector;
                faces[self.omega_index].joint_mut(joints, face_joint).force -= &force_vector;
            }
            let mut total_distance = 0_f32;
            for alpha in 0..3 {
                for omega in 0..3 {
                    total_distance += (&faces[self.alpha_index].joint(joints, alpha).location
                        - &faces[self.omega_index].joint(joints, omega).location)
                        .magnitude();
                }
            }
            let average_distance = total_distance / 9_f32;
            for alpha in 0..3 {
                for omega in 0..3 {
                    let parallel_vector: Vector3<f32> =
                        &faces[self.alpha_index].joint(joints, alpha).location
                            - &faces[self.omega_index].joint(joints, omega).location;
                    let distance = parallel_vector.magnitude();
                    let parallel_force = force * 3_f32 * (average_distance - distance);
                    faces[self.alpha_index].joint_mut(joints, alpha).force +=
                        &parallel_vector * parallel_force / distance;
                    faces[self.omega_index].joint_mut(joints, omega).force -=
                        &parallel_vector * parallel_force / distance;
                }
            }
        } else {
            let force_vector: Vector3<f32> = self.unit.clone() * force / 2_f32;
            joints[self.alpha_index].force += &force_vector;
            joints[self.omega_index].force -= &force_vector;
            let half_mass = ideal_length * self.linear_density / 2_f32;
            joints[self.alpha_index].interval_mass += half_mass;
            joints[self.omega_index].interval_mass += half_mass;
        }
        if self.countdown > 0_f32 {
            self.countdown -= 1_f32;
            if self.countdown <= 0_f32 {
                self.ideal_length = self.length_for_shape[shape as usize];
                self.countdown = 0_f32;
            }
        }
    }

    pub fn is_push(&self) -> bool {
        self.interval_role == IntervalRole::NexusPush
            || self.interval_role == IntervalRole::ColumnPush
    }

    pub fn strain_nuance_in(&self, world: &World) -> f32 {
        let unsafe_nuance = (self.strain + world.max_strain) / (world.max_strain * 2_f32);
        if unsafe_nuance < 0_f32 {
            0_f32
        } else if unsafe_nuance >= 1_f32 {
            0.9999999_f32
        } else {
            unsafe_nuance
        }
    }

    fn ideal_length_now(&mut self, shape: u8) -> f32 {
        if self.countdown == 0_f32 {
            self.ideal_length
        } else {
            let progress: f32 = (self.max_countdown - self.countdown) / self.max_countdown;
            let shape_length = self.length_for_shape[shape as usize];
            self.ideal_length * (1_f32 - progress) + shape_length * progress
        }
    }

    pub fn change_rest_length(&mut self, rest_length: f32, countdown: f32, shape: u8) {
        self.ideal_length = self.length_for_shape[shape as usize];
        self.length_for_shape[shape as usize] = rest_length;
        self.max_countdown = countdown;
        self.countdown = countdown;
    }

    pub fn set_interval_role(&mut self, interval_role: IntervalRole) {
        self.interval_role = interval_role;
    }

    pub fn multiply_rest_length(&mut self, factor: f32, countdown: f32, shape: u8) {
        let rest_length = self.length_for_shape[shape as usize];
        self.change_rest_length(rest_length * factor, countdown, shape)
    }

    pub fn project_line_locations<'a>(
        &self,
        view: &mut View,
        joints: &'a Vec<Joint>,
        faces: &'a Vec<Face>,
        extend: f32,
    ) {
        if self.interval_role == IntervalRole::FacePull {
            let mut alpha_midpoint: Point3<f32> = Point3::origin();
            let mut omega_midpoint: Point3<f32> = Point3::origin();
            faces[self.alpha_index].project_midpoint(joints, &mut alpha_midpoint);
            faces[self.omega_index].project_midpoint(joints, &mut omega_midpoint);
            view.line_locations.push(alpha_midpoint.x);
            view.line_locations.push(alpha_midpoint.y);
            view.line_locations.push(alpha_midpoint.z);
            view.line_locations.push(omega_midpoint.x);
            view.line_locations.push(omega_midpoint.y);
            view.line_locations.push(omega_midpoint.z);
        } else {
            let alpha = &self.alpha(joints).location;
            let omega = &self.omega(joints).location;
            view.line_locations.push(alpha.x - self.unit.x * extend);
            view.line_locations.push(alpha.y - self.unit.y * extend);
            view.line_locations.push(alpha.z - self.unit.z * extend);
            view.line_locations.push(omega.x + self.unit.x * extend);
            view.line_locations.push(omega.y + self.unit.y * extend);
            view.line_locations.push(omega.z + self.unit.z * extend);
        }
    }

    pub fn project_line_features<'a>(&self, view: &mut View) {
        view.unit_vectors.push(self.unit.x);
        view.unit_vectors.push(self.unit.y);
        view.unit_vectors.push(self.unit.z);
        view.ideal_lengths.push(self.ideal_length);
        view.strains.push(self.strain);
        view.strain_nuances.push(self.strain_nuance);
        view.stiffnesses.push(self.stiffness);
        view.linear_densities.push(self.linear_density);
    }

    pub fn project_role_color(&self, view: &mut View) {
        Interval::project_line_color(view, ROLE_COLORS[self.interval_role as usize])
    }

    pub fn project_line_color(view: &mut View, color: [f32; 3]) {
        view.line_colors.push(color[0]);
        view.line_colors.push(color[1]);
        view.line_colors.push(color[2]);
        view.line_colors.push(color[0]);
        view.line_colors.push(color[1]);
        view.line_colors.push(color[2]);
    }

    pub fn project_line_color_nuance(view: &mut View, nuance: f32) {
        let rainbow_index = (nuance * RAINBOW.len() as f32).floor() as usize;
        Interval::project_line_color(view, RAINBOW[rainbow_index])
    }

    pub fn project_slack_color(view: &mut View) {
        Interval::project_line_color(view, SLACK_COLOR)
    }

    pub fn project_attenuated_color(view: &mut View) {
        Interval::project_line_color(view, ATTENUATED_COLOR)
    }
}

#[cfg(test)]
#[test]
fn interval_physics() {
    const ACTUAL_LENGTH: f32 = 2_f32;
    const REST_LENGTH: f32 = 2.1_f32;
    const INTERVAL_MASS: f32 = 2.1_f32;
    let world = World::new();
    let mut joints: Vec<Joint> = Vec::new();
    joints.push(Joint::new(-1_f32, 1_f32, 0_f32));
    joints.push(Joint::new(1_f32, 1_f32, 0_f32));
    let mut faces: Vec<Face> = Vec::new();
    let mut interval = Interval::new(
        0,
        1,
        IntervalRole::NexusPush,
        ACTUAL_LENGTH,
        REST_LENGTH,
        1_f32,
        100_f32,
    );
    assert_eq!(interval.calculate_current_length(&joints, &faces), 2_f32);
    assert_eq!(interval.ideal_length_now(0), ACTUAL_LENGTH);
    interval.countdown = 50_f32;
    assert_eq!(
        interval.ideal_length_now(0),
        (REST_LENGTH + ACTUAL_LENGTH) / 2_f32
    );
    interval.countdown = 25_f32;
    assert_eq!(
        interval.ideal_length_now(0),
        (REST_LENGTH * 3_f32 + ACTUAL_LENGTH) / 4_f32
    );
    interval.countdown = 100_f32;
    interval.physics(&world, &mut joints, &mut faces, Stage::Growing, 0_f32, 0);
    assert_eq!(interval.unit, Vector3::new(1_f32, 0_f32, 0_f32));
    assert_eq!(interval.ideal_length, ACTUAL_LENGTH);
    let ideal_length = interval.ideal_length * (1_f32 + world.shaping_pretenst_factor);
    let real_length = interval.calculate_current_length(&joints, &faces);
    assert_eq!(real_length, 2_f32);
    assert_eq!(interval.strain, (real_length - ideal_length) / ideal_length);
    let force = interval.strain * interval.stiffness * world.shaping_stiffness_factor;
    assert_eq!(force, -0.9090911_f32);
    let push: Vector3<f32> = &interval.unit * force;
    assert_eq!(push, Vector3::new(force, 0_f32, 0_f32));
    assert_eq!(joints[0].force, &push / 2_f32);
    assert_eq!(joints[1].interval_mass, INTERVAL_MASS);
    assert_eq!(joints[1].force, &push / -2_f32);
    assert_eq!(joints[1].velocity, Vector3::new(0_f32, 0_f32, 0_f32));
    joints[0].velocity_physics(&world, 0_f32, world.shaping_drag, false);
    joints[1].velocity_physics(&world, 0_f32, world.shaping_drag, false);
    assert_eq!(
        joints[1].velocity,
        -&push / 2_f32 / INTERVAL_MASS * (1_f32 - world.shaping_drag)
    );
    joints[0].location_physics();
    joints[1].location_physics();
    assert_eq!(
        joints[1].location,
        Point3::new(
            1_f32 - &push.x / 2_f32 / INTERVAL_MASS * (1_f32 - world.shaping_drag),
            1_f32,
            0_f32,
        )
    );
    assert_eq!(
        interval.calculate_current_length(&joints, &faces),
        2_f32 - force / INTERVAL_MASS * (1_f32 - world.shaping_drag)
    );
    interval.countdown = 0.001_f32; // next step under zero
    interval.physics(&world, &mut joints, &mut faces, Stage::Growing, 0_f32, 0);
    assert_eq!(interval.ideal_length, REST_LENGTH);
}
