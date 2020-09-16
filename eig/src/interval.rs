/*
 * Copyright (c) 2020. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

extern crate fast_inv_sqrt;

use nalgebra::*;

use fast_inv_sqrt::InvSqrt32;

use crate::constants::*;
use crate::face::Face;
use crate::joint::Joint;
use crate::view::View;
use crate::world::World;

#[derive(Clone, Copy)]
pub struct Interval {
    pub(crate) alpha_index: usize,
    pub(crate) omega_index: usize,
    pub(crate) interval_role: IntervalRole,
    pub(crate) length_0: f32,
    pub(crate) length_1: f32,
    pub(crate) length_nuance: f32,
    pub(crate) attack: f32,
    pub(crate) decay: f32,
    pub(crate) stiffness: f32,
    pub(crate) linear_density: f32,
    pub(crate) unit: Vector3<f32>,
    pub(crate) strain: f32,
    pub(crate) strain_nuance: f32,
}

impl Interval {
    pub fn new(
        alpha_index: usize,
        omega_index: usize,
        interval_role: IntervalRole,
        length_0: f32,
        length_1: f32,
        stiffness: f32,
        linear_density: f32,
        countdown: f32,
    ) -> Interval {
        Interval {
            alpha_index,
            omega_index,
            interval_role,
            length_0,
            length_1,
            length_nuance: 0_f32,
            attack: 1_f32 / countdown,
            decay: 0_f32,
            stiffness,
            linear_density,
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
        match self.interval_role {
            IntervalRole::FaceConnector | IntervalRole::FaceDistancer => {
                let mut alpha_midpoint: Point3<f32> = Point3::origin();
                let mut omega_midpoint: Point3<f32> = Point3::origin();
                &faces[self.alpha_index].project_midpoint(joints, &mut alpha_midpoint);
                &faces[self.omega_index].project_midpoint(joints, &mut omega_midpoint);
                self.unit = omega_midpoint - alpha_midpoint;
            }
            IntervalRole::FaceAnchor => {
                let mut alpha_midpoint: Point3<f32> = Point3::origin();
                &faces[self.alpha_index].project_midpoint(joints, &mut alpha_midpoint);
                let mut middy: Point3<f32> = Point3::origin();
                &faces[self.alpha_index].project_midpoint(joints, &mut middy);
                let omega_location = &joints[self.omega_index].location;
                self.unit = omega_location - alpha_midpoint;
                if self.unit.y.is_nan() {
                    panic!("Y is NaN");
                }
            }
            _ => {
                let alpha_location = &joints[self.alpha_index].location;
                let omega_location = &joints[self.omega_index].location;
                self.unit = omega_location - alpha_location;
            }
        }
        let magnitude_squared = self.unit.magnitude_squared();
        if magnitude_squared < 0.00001_f32 {
            return 0.00001_f32;
        }
        let inverse_square_root = magnitude_squared.inv_sqrt32();
        self.unit *= inverse_square_root;
        1_f32 / inverse_square_root
    }

    pub fn physics(
        &mut self,
        world: &World,
        joints: &mut Vec<Joint>,
        faces: &mut Vec<Face>,
        stage: Stage,
        pretensing_nuance: f32,
    ) {
        let mut ideal = self.ideal_length_now();
        let real_length = self.calculate_current_length(joints, faces);
        let is_push = self.is_push();
        if is_push {
            match stage {
                Stage::Slack => {}
                Stage::Growing | Stage::Shaping => {
                    let nuance = if self.attack == 0_f32 {
                        1_f32
                    } else {
                        self.length_nuance
                    };
                    ideal *= 1_f32 + world.shaping_pretenst_factor * nuance;
                }
                Stage::Pretensing => ideal *= 1_f32 + world.pretenst_factor * pretensing_nuance,
                Stage::Pretenst => ideal *= 1_f32 + world.pretenst_factor,
            }
        }
        self.strain = (real_length - ideal) / ideal;
        if !world.push_and_pull
            && self.interval_role != IntervalRole::FaceDistancer
            && (is_push && self.strain > 0_f32 || !is_push && self.strain < 0_f32)
        {
            self.strain = 0_f32;
        }
        let factor = if stage < Stage::Pretensing {
            world.shaping_stiffness_factor
        } else {
            world.stiffness_factor
        };
        let mut force = self.strain * self.stiffness * factor;
        if stage <= Stage::Slack {
            force *= world.shaping_stiffness_factor;
        }
        match self.interval_role {
            IntervalRole::FaceConnector | IntervalRole::FaceDistancer => {
                let force_vector: Vector3<f32> = self.unit.clone() * force;
                let mut alpha_midpoint: Point3<f32> = Point3::origin();
                let mut omega_midpoint: Point3<f32> = Point3::origin();
                faces[self.alpha_index].project_midpoint(joints, &mut alpha_midpoint);
                faces[self.omega_index].project_midpoint(joints, &mut omega_midpoint);
                for face_joint in 0..3 {
                    faces[self.alpha_index].joint_mut(joints, face_joint).force += &force_vector;
                    faces[self.omega_index].joint_mut(joints, face_joint).force -= &force_vector;
                }
                if self.interval_role == IntervalRole::FaceConnector {
                    let mut total_distance = 0_f32;
                    for alpha in 0..3 {
                        for omega in 0..3 {
                            total_distance +=
                                (&faces[self.alpha_index].joint(joints, alpha).location
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
                }
            }
            IntervalRole::FaceAnchor => {
                let force_vector: Vector3<f32> = self.unit.clone() * force;
                let mut alpha_midpoint: Point3<f32> = Point3::origin();
                faces[self.alpha_index].project_midpoint(joints, &mut alpha_midpoint);
                for face_joint in 0..3 {
                    faces[self.alpha_index].joint_mut(joints, face_joint).force += &force_vector;
                }
                let half_mass = ideal * self.linear_density / 2_f32;
                joints[self.omega_index].interval_mass += half_mass;
            }
            _ => {
                let force_vector: Vector3<f32> = self.unit.clone() * force / 2_f32;
                joints[self.alpha_index].force += &force_vector;
                joints[self.omega_index].force -= &force_vector;
                let half_mass = ideal * self.linear_density / 2_f32;
                joints[self.alpha_index].interval_mass += half_mass;
                joints[self.omega_index].interval_mass += half_mass;
            }
        }
        if self.attack > 0_f32 {
            self.length_nuance += self.attack;
            if self.length_nuance > 1_f32 {
                self.attack = 0_f32; // done attacking
                if self.decay == 0_f32 {
                    self.length_0 = self.length_1; // both the same now
                    self.length_nuance = 0_f32; // reset to zero
                } else {
                    self.length_nuance = 1_f32 - self.decay; // first step back
                }
            }
        } else if self.decay > 0_f32 {
            self.length_nuance -= self.decay;
            if self.length_nuance <= 0_f32 {
                self.length_nuance = 0_f32; // exactly zero
                self.decay = 0_f32; // done decaying
            }
        }
    }

    pub fn is_push(&self) -> bool {
        match self.interval_role {
            IntervalRole::PhiPush | IntervalRole::RootPush | IntervalRole::Push => true,
            _ => false,
        }
    }

    pub fn calculate_strain_nuance(&self, limits: &[f32; 4]) -> f32 {
        let unsafe_nuance = if self.is_push() {
            (self.strain - limits[1]) / (limits[0] - limits[1])
        } else {
            (self.strain - limits[2]) / (limits[3] - limits[2])
        };
        if unsafe_nuance < 0_f32 {
            0_f32
        } else if unsafe_nuance > 1_f32 {
            1_f32
        } else {
            unsafe_nuance
        }
    }

    fn ideal_length_now(&mut self) -> f32 {
        self.length_0 * (1_f32 - self.length_nuance) + self.length_1 * self.length_nuance
    }

    pub fn change_rest_length(&mut self, rest_length: f32, countdown: f32) {
        self.length_0 = self.length_1;
        self.length_1 = rest_length;
        self.length_nuance = 0_f32;
        self.attack = 1_f32 / countdown;
        self.decay = 0_f32;
    }

    pub fn twitch(&mut self, attack_countdown: f32, decay_countdown: f32, delta_size_nuance: f32) {
        if self.length_nuance != 0_f32 {
            // while changing? ignore!
            return;
        }
        self.length_1 = self.length_0 * delta_size_nuance;
        self.length_nuance = 0_f32;
        self.attack = 1_f32 / attack_countdown;
        self.decay = 1_f32 / decay_countdown;
    }

    pub fn set_interval_role(&mut self, interval_role: IntervalRole) {
        self.interval_role = interval_role;
    }

    pub fn multiply_rest_length(&mut self, factor: f32, countdown: f32) {
        self.change_rest_length(self.length_1 * factor, countdown)
    }

    pub fn project_line_locations<'a>(
        &self,
        view: &mut View,
        joints: &'a Vec<Joint>,
        faces: &'a Vec<Face>,
        extend: f32,
    ) {
        match self.interval_role {
            IntervalRole::FaceConnector | IntervalRole::FaceDistancer => {
                let mut alpha: Point3<f32> = Point3::origin();
                let mut omega: Point3<f32> = Point3::origin();
                faces[self.alpha_index].project_midpoint(joints, &mut alpha);
                faces[self.omega_index].project_midpoint(joints, &mut omega);
                view.line_locations.push(alpha.x);
                view.line_locations.push(alpha.y);
                view.line_locations.push(alpha.z);
                view.line_locations.push(omega.x);
                view.line_locations.push(omega.y);
                view.line_locations.push(omega.z);
            }
            IntervalRole::FaceAnchor => {
                let mut alpha: Point3<f32> = Point3::origin();
                faces[self.alpha_index].project_midpoint(joints, &mut alpha);
                let omega = &self.omega(joints).location;
                view.line_locations.push(alpha.x);
                view.line_locations.push(alpha.y);
                view.line_locations.push(alpha.z);
                view.line_locations.push(omega.x);
                view.line_locations.push(omega.y);
                view.line_locations.push(omega.z);
            }
            _ => {
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
    }

    pub fn project_line_features<'a>(&self, view: &mut View) {
        view.unit_vectors.push(self.unit.x);
        view.unit_vectors.push(self.unit.y);
        view.unit_vectors.push(self.unit.z);
        view.ideal_lengths.push(self.length_0);
        view.strains.push(self.strain);
        view.strain_nuances.push(self.strain_nuance);
        view.stiffnesses.push(self.stiffness);
        view.linear_densities.push(self.linear_density);
    }

    pub fn project_line_color_nuance(&self, view: &mut View) {
        let ambient = 0.25_f32;
        let color = 1_f32 - ambient;
        let nuance = self.strain_nuance * color;
        let anti = (1_f32 - self.strain_nuance) * color;
        if self.is_push() {
            Interval::project_line_rgb(view, ambient, ambient + anti, ambient + nuance)
        } else {
            Interval::project_line_rgb(view, ambient + nuance, ambient + anti, ambient)
        }
    }

    pub fn project_line_rgb(view: &mut View, r: f32, g: f32, b: f32) {
        view.line_colors.push(r);
        view.line_colors.push(g);
        view.line_colors.push(b);
        view.line_colors.push(r);
        view.line_colors.push(g);
        view.line_colors.push(b);
    }
}
