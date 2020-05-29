/*
 * Copyright (c) 2020. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

use crate::fabric::{Fabric, DEFAULT_STRAIN_LIMITS};
use crate::world::World;
use nalgebra::*;
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub struct View {
    pub(crate) midpoint: Point3<f32>,
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
    pub(crate) linear_densities: Vec<f32>,
}

#[wasm_bindgen]
impl View {
    pub fn on_fabric(fabric: &Fabric) -> View {
        let joint_count = fabric.get_joint_count() as usize;
        let interval_count = fabric.get_interval_count() as usize;
        let face_count = fabric.get_face_count() as usize;
        View {
            midpoint: Point3::origin(),
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
            linear_densities: Vec::with_capacity(interval_count),
        }
    }

    pub fn render(&mut self, fabric: &Fabric, world: &World) {
        self.clear();
        for joint in fabric.joints.iter() {
            joint.project(self);
        }
        self.midpoint /= fabric.joints.len() as f32;
        for interval in fabric.intervals.iter() {
            let extend = interval.strain / -2_f32 * world.visual_strain;
            let bounded = if extend < -interval.length_0 / 2_f32 {
                -interval.length_0 / 2_f32
            } else {
                extend
            };
            interval.project_line_locations(self, &fabric.joints, &fabric.faces, bounded);
            interval.project_line_features(self)
        }
        self.strain_limits = fabric.strain_limits.to_vec();
        for interval in fabric.intervals.iter() {
            interval.project_line_color_nuance(self)
        }
        for face in fabric.faces.iter() {
            face.project_features(&fabric.joints, self)
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

    pub fn copy_linear_densities_to(&self, linear_densities: &mut [f32]) {
        linear_densities.copy_from_slice(&self.linear_densities);
    }

    fn clear(&mut self) {
        self.midpoint.coords.fill(0.0);
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
        self.linear_densities.clear();
    }
}
