/*
 * Copyright (c) 2020. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

use crate::constants::*;
use crate::view::View;
use crate::world::World;
use nalgebra::*;

const RESURFACE: f32 = 0.01;
const STICKY_UP_DRAG: f32 = 0.03;
const STICKY_DOWN_DRAG: f32 = 0.3;
const AMBIENT_MASS: f32 = 0.001_f32;

#[derive(Clone, Copy)]
pub struct Joint {
    pub(crate) location: Point3<f32>,
    pub(crate) force: Vector3<f32>,
    pub(crate) velocity: Vector3<f32>,
    pub(crate) interval_mass: f32,
}

impl Joint {
    pub fn new(x: f32, y: f32, z: f32) -> Joint {
        Joint {
            location: Point3::new(x, y, z),
            force: zero(),
            velocity: zero(),
            interval_mass: AMBIENT_MASS,
        }
    }

    pub fn reset(&mut self) {
        self.force = zero();
        self.interval_mass = AMBIENT_MASS;
    }

    pub fn is_connected(&self) -> bool {
        self.interval_mass > AMBIENT_MASS
    }

    pub fn velocity_physics(&mut self, world: &World, gravity: f32, drag: f32) {
        let altitude = self.location.y;
        if self.interval_mass == 0_f32 {
            self.velocity = zero();
        } else if altitude >= 0_f32 || gravity == 0_f32 {
            self.velocity.y -= gravity;
            self.velocity += &self.force / self.interval_mass;
            self.velocity *= 1_f32 - drag;
        } else {
            let degree_submerged: f32 = if -altitude < 1_f32 { -altitude } else { 0_f32 };
            let antigravity = world.antigravity * degree_submerged;
            self.velocity += &self.force / self.interval_mass;
            match world.surface_character {
                SurfaceCharacter::Frozen => {
                    self.velocity = zero();
                    self.location.y = -RESURFACE;
                }
                SurfaceCharacter::Sticky => {
                    if self.velocity.y < 0_f32 {
                        let sticky_drag = 1_f32 - STICKY_DOWN_DRAG;
                        self.velocity.x *= sticky_drag;
                        self.velocity.y += antigravity;
                        self.velocity.z *= sticky_drag;
                    } else {
                        let sticky_drag = 1_f32 - STICKY_UP_DRAG;
                        self.velocity.x *= sticky_drag;
                        self.velocity.y += antigravity;
                        self.velocity.z *= sticky_drag;
                    }
                }
                SurfaceCharacter::Bouncy => {
                    let degree_cushioned: f32 = 1_f32 - degree_submerged;
                    self.velocity *= degree_cushioned;
                    self.velocity.y += antigravity;
                }
            }
        }
    }

    pub fn location_physics(&mut self) {
        self.location += &self.velocity
    }

    pub fn project(&self, view: &mut View) {
        view.midpoint += &self.location.coords * self.interval_mass;
        view.mass += self.interval_mass;
        view.joint_locations.push(self.location.x);
        view.joint_locations.push(self.location.y);
        view.joint_locations.push(self.location.z);
        view.joint_velocities.push(self.velocity.x);
        view.joint_velocities.push(self.velocity.y);
        view.joint_velocities.push(self.velocity.z);
    }
}
