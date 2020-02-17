/*
 * Copyright (c) 2020. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */
use crate::constants::*;
use crate::face::Face;
use crate::joint::Joint;
use crate::view::View;
use crate::world::World;
use nalgebra::*;

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
}

impl Interval {
    pub fn new(
        alpha_index: usize,
        omega_index: usize,
        interval_role: IntervalRole,
        ideal_length: f32,
        rest_length: f32,
        stiffness: f32,
        linear_density: f32,
        countdown: f32,
    ) -> Interval {
        Interval {
            alpha_index,
            omega_index,
            interval_role,
            ideal_length,
            length_for_shape: [rest_length; SHAPE_COUNT],
            stiffness,
            linear_density,
            countdown,
            max_countdown: countdown,
            unit: zero(),
            strain: 0_f32,
        }
    }

    pub fn alpha<'a>(&self, joints: &'a Vec<Joint>) -> &'a Joint {
        &joints[self.alpha_index]
    }

    pub fn omega<'a>(&self, joints: &'a Vec<Joint>) -> &'a Joint {
        &joints[self.omega_index]
    }

    pub fn alpha_joint<'a>(
        &self,
        joints: &'a Vec<Joint>,
        faces: &'a Vec<Face>,
        index: usize,
    ) -> &'a Joint {
        &faces[self.alpha_index].joint(joints, index)
    }

    pub fn omega_joint<'a>(
        &self,
        joints: &'a Vec<Joint>,
        faces: &'a Vec<Face>,
        index: usize,
    ) -> &'a Joint {
        &faces[self.omega_index].joint(joints, index)
    }

    pub fn alpha_joint_mut<'a>(
        &self,
        joints: &'a mut Vec<Joint>,
        faces: &'a Vec<Face>,
        index: usize,
    ) -> &'a mut Joint {
        faces[self.alpha_index].joint_mut(joints, index)
    }

    pub fn omega_joint_mut<'a>(
        &self,
        joints: &'a mut Vec<Joint>,
        faces: &'a Vec<Face>,
        index: usize,
    ) -> &'a mut Joint {
        faces[self.omega_index].joint_mut(joints, index)
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
        self.unit /= magnitude;
        magnitude
    }

    fn end_zone_physics(
        &mut self,
        joints: &mut Vec<Joint>,
        faces: &mut Vec<Face>,
        final_nuance: f32,
        orientation_force: f32,
    ) {
        let mut alpha_distance_sum: f32 = 0_f32;
        let mut omega_distance_sum: f32 = 0_f32;
        let mut alpha_midpoint: Point3<f32> = Point3::origin();
        let mut omega_midpoint: Point3<f32> = Point3::origin();
        faces[self.alpha_index].project_midpoint(joints, &mut alpha_midpoint);
        faces[self.omega_index].project_midpoint(joints, &mut omega_midpoint);
        for face_joint_index in 0..3 {
            alpha_distance_sum += distance(
                &omega_midpoint,
                &self.alpha_joint(joints, faces, face_joint_index).location,
            );
            omega_distance_sum += distance(
                &alpha_midpoint,
                &self.omega_joint(joints, faces, face_joint_index).location,
            );
        }
        let average_alpha = alpha_distance_sum / 3.0;
        let average_omega = omega_distance_sum / 3.0;
        for face_joint_index in 0..3 {
            let alpha_location = &self.alpha_joint(joints, faces, face_joint_index).location;
            let omega_location = &self.omega_joint(joints, faces, face_joint_index).location;
            let mut to_alpha: Vector3<f32> = zero();
            to_alpha += &alpha_location.coords;
            to_alpha -= &omega_midpoint.coords;
            let mut to_omega: Vector3<f32> = zero();
            to_omega += &omega_location.coords;
            to_omega -= &alpha_midpoint.coords;
            let alpha_distance = to_alpha.magnitude();
            let omega_distance = to_omega.magnitude();
            let push_alpha = final_nuance * (average_alpha - alpha_distance);
            let push_omega = final_nuance * (average_omega - omega_distance);
            self.alpha_joint_mut(joints, faces, face_joint_index).force +=
                to_alpha * orientation_force * push_alpha / alpha_distance;
            self.omega_joint_mut(joints, faces, face_joint_index).force +=
                to_omega * orientation_force * push_omega / omega_distance;
        }
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
        let mut push: Vector3<f32> = zero();
        push += &self.unit;
        if self.interval_role == IntervalRole::FacePull {
            push *= force / 6_f32;
            let mut alpha_midpoint: Point3<f32> = Point3::origin();
            let mut omega_midpoint: Point3<f32> = Point3::origin();
            faces[self.alpha_index].project_midpoint(joints, &mut alpha_midpoint);
            faces[self.omega_index].project_midpoint(joints, &mut omega_midpoint);
            for face_joint_index in 0..3 {
                faces[self.alpha_index]
                    .joint_mut(joints, face_joint_index)
                    .force += &push;
                faces[self.omega_index]
                    .joint_mut(joints, face_joint_index)
                    .force -= &push;
            }
            if ideal_length <= world.face_pull_end_zone {
                let final_nuance: f32 =
                    (world.face_pull_end_zone - ideal_length) / world.face_pull_end_zone;
                self.end_zone_physics(
                    joints,
                    faces,
                    final_nuance,
                    world.face_pull_orientation_force,
                );
            }
        } else {
            push *= force / 2_f32;
            joints[self.alpha_index].force += &push;
            joints[self.omega_index].force -= &push;
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

    pub fn project_line_locations<'a>(&self, view: &mut View, joints: &'a Vec<Joint>, extend: f32) {
        let alpha = &self.alpha(joints).location;
        let omega = &self.omega(joints).location;
        view.line_locations.push(alpha.x - self.unit.x * extend);
        view.line_locations.push(alpha.y - self.unit.y * extend);
        view.line_locations.push(alpha.z - self.unit.z * extend);
        view.line_locations.push(omega.x + self.unit.x * extend);
        view.line_locations.push(omega.y + self.unit.y * extend);
        view.line_locations.push(omega.z + self.unit.z * extend);
    }

    pub fn project_line_features<'a>(&self, view: &mut View) {
        view.unit_vectors.push(self.unit.x);
        view.unit_vectors.push(self.unit.y);
        view.unit_vectors.push(self.unit.z);
        view.strains.push(self.strain);
        //        view.strain_nuances.push(self.strain_nuance) todo
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
        let rainbow_index = (nuance * RAINBOW.len() as f32 / 3.01).floor() as usize;
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
    let mut push: Vector3<f32> = zero();
    push += &interval.unit * force;
    assert_eq!(push, Vector3::new(force, 0_f32, 0_f32));
    assert_eq!(joints[0].force, push / 2_f32);
    assert_eq!(joints[1].interval_mass, INTERVAL_MASS);
    assert_eq!(joints[1].force, push / -2_f32);
    assert_eq!(joints[1].velocity, Vector3::new(0_f32, 0_f32, 0_f32));
    joints[0].physics(&world, 0_f32, world.shaping_drag, false);
    joints[1].physics(&world, 0_f32, world.shaping_drag, false);
    assert_eq!(
        joints[1].velocity,
        -push / 2_f32 / INTERVAL_MASS * (1_f32 - world.shaping_drag)
    );
    assert_eq!(
        joints[1].location,
        Point3::new(
            1_f32 - push.x / 2_f32 / INTERVAL_MASS * (1_f32 - world.shaping_drag),
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
