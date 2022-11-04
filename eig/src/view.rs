/*
 * Copyright (c) 2020. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

use cgmath::{EuclideanSpace, InnerSpace, Point3};
use crate::fabric::{Fabric, DEFAULT_STRAIN_LIMITS};
use crate::world::World;

pub struct View {
    pub(crate) midpoint: Point3<f32>,
    pub(crate) mass: f32,
    pub(crate) radius: f32,
    pub(crate) joint_locations: Vec<f32>,
    pub(crate) joint_velocities: Vec<f32>,
    pub(crate) line_locations: Vec<f32>,
    pub(crate) line_colors: Vec<f32>,
    pub(crate) face_midpoints: Vec<f32>,
    pub(crate) face_normals: Vec<f32>,
    pub(crate) face_vertex_locations: Vec<f32>,
    pub(crate) unit_vectors: Vec<f32>,
    pub(crate) ideal_lengths: Vec<f32>,
    pub(crate) strains: Vec<f32>,
    pub(crate) strain_limits: Vec<f32>,
    pub(crate) strain_nuances: Vec<f32>,
    pub(crate) stiffnesses: Vec<f32>,
}

impl View {
    pub fn on_fabric(fabric: &Fabric) -> View {
        let joint_count = fabric.get_joint_count() as usize;
        let interval_count = fabric.get_interval_count() as usize;
        let face_count = fabric.get_face_count() as usize;
        View {
            midpoint: Point3::origin(),
            mass: 0_f32,
            radius: 2_f32,
            joint_locations: Vec::with_capacity(joint_count * 3),
            joint_velocities: Vec::with_capacity(joint_count * 3),
            line_locations: Vec::with_capacity(interval_count * 2 * 3),
            line_colors: Vec::with_capacity(interval_count * 2 * 3),
            face_midpoints: Vec::with_capacity(face_count * 3),
            face_normals: Vec::with_capacity(face_count * 3 * 3),
            face_vertex_locations: Vec::with_capacity(face_count * 3 * 3),
            unit_vectors: Vec::with_capacity(interval_count * 3),
            ideal_lengths: Vec::with_capacity(interval_count),
            strains: Vec::with_capacity(interval_count),
            strain_limits: DEFAULT_STRAIN_LIMITS.to_vec(),
            strain_nuances: Vec::with_capacity(interval_count),
            stiffnesses: Vec::with_capacity(interval_count),
        }
    }

    pub fn render(&mut self, fabric: &Fabric, world: &World) {
        self.clear();
        for joint in fabric.joints.iter() {
            joint.project(self);
        }
        self.midpoint /= self.mass;
        let mut radius_squared = 0_f32;
        for joint in fabric.joints.iter() {
            let from_midpoint = &joint.location - &self.midpoint;
            let squared = from_midpoint.magnitude2();
            if radius_squared < squared {
                radius_squared = squared
            }
        }
        self.radius = radius_squared.sqrt();
        let pretensing_nuance = world.pretensing_nuance(fabric);
        for interval in fabric.intervals.iter() {
            let current_length = interval.calculate_current_length(&fabric.joints) + 0.01_f32;
            let ideal_length = interval.ideal_length_now(world, fabric.stage, pretensing_nuance);
            let slack_pull = !interval.role.push && ideal_length > current_length;
            let extend = if slack_pull {
                0_f32
            } else {
                interval.strain * ideal_length * world.visual_strain
            };
            let bounded_extend = if extend >= current_length {
                current_length
            } else {
                extend
            };
            interval.project_line_locations(self, &fabric.joints, bounded_extend / -2_f32);
            interval.project_line_features(self, ideal_length)
        }
        self.strain_limits = fabric.strain_limits.to_vec();
        for interval in fabric.intervals.iter() {
            interval.project_line_color_nuance(self)
        }
        for face in fabric.faces.iter() {
            face.project_features(&fabric.joints,&fabric.intervals, self)
        }
    }

    pub fn midpoint_x(&self) -> f32 {
        self.midpoint.x
    }

    pub fn midpoint_y(&self) -> f32 {
        self.midpoint.y
    }

    pub fn midpoint_z(&self) -> f32 {
        self.midpoint.z
    }

    pub fn radius(&self) -> f32 {
        if self.radius < 2_f32 {
            2_f32
        } else {
            self.radius
        }
    }

    pub fn copy_joint_locations_to(&self, joint_locations: &mut [f32]) {
        joint_locations.copy_from_slice(&self.joint_locations);
    }

    pub fn copy_joint_velocities_to(&self, joint_velocities: &mut [f32]) {
        joint_velocities.copy_from_slice(&self.joint_velocities);
    }

    pub fn copy_line_locations_to(&self, line_locations: &mut [f32]) {
        line_locations.copy_from_slice(&self.line_locations);
    }

    pub fn copy_line_colors_to(&self, line_colors: &mut [f32]) {
        line_colors.copy_from_slice(&self.line_colors);
    }

    pub fn copy_face_midpoints_to(&self, face_midpoints: &mut [f32]) {
        face_midpoints.copy_from_slice(&self.face_midpoints);
    }

    pub fn copy_face_normals_to(&self, face_normals: &mut [f32]) {
        face_normals.copy_from_slice(&self.face_normals);
    }

    pub fn copy_face_vertex_locations_to(&self, face_vertex_locations: &mut [f32]) {
        face_vertex_locations.copy_from_slice(&self.face_vertex_locations);
    }

    pub fn copy_unit_vectors_to(&self, unit_vectors: &mut [f32]) {
        unit_vectors.copy_from_slice(&self.unit_vectors);
    }

    pub fn copy_ideal_lengths_to(&self, ideal_lengths: &mut [f32]) {
        ideal_lengths.copy_from_slice(&self.ideal_lengths);
    }

    pub fn copy_strains_to(&self, strains: &mut [f32]) {
        strains.copy_from_slice(&self.strains);
    }

    pub fn copy_strain_limits_to(&self, strain_limits: &mut [f32]) {
        strain_limits.copy_from_slice(&self.strain_limits)
    }

    pub fn copy_strain_nuances_to(&self, strain_nuances: &mut [f32]) {
        strain_nuances.copy_from_slice(&self.strain_nuances);
    }

    pub fn copy_stiffnesses_to(&self, stiffnesses: &mut [f32]) {
        stiffnesses.copy_from_slice(&self.stiffnesses);
    }

    fn clear(&mut self) {
        self.midpoint = Point3::origin();
        self.mass = 0_f32;
        self.joint_locations.clear();
        self.joint_velocities.clear();
        self.line_locations.clear();
        self.line_colors.clear();
        self.face_midpoints.clear();
        self.face_normals.clear();
        self.face_vertex_locations.clear();
        self.unit_vectors.clear();
        self.ideal_lengths.clear();
        self.strains.clear();
        self.strain_nuances.clear();
        self.stiffnesses.clear();
    }
}
