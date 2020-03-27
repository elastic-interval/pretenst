/*
 * Copyright (c) 2020. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

use crate::constants::*;
use crate::view::View;
use crate::world::World;
use nalgebra::*;

const RESURFACE: f32 = 0.01;

#[derive(Clone, Copy)]
pub struct Joint {
    pub(crate) location: Point3<f32>,
    pub(crate) force: Vector3<f32>,
    pub(crate) velocity: Vector3<f32>,
    pub(crate) interval_mass: f32,
    pub(crate) grasp_countdown: u16,
}

impl Joint {
    pub fn new(x: f32, y: f32, z: f32) -> Joint {
        Joint {
            location: Point3::new(x, y, z),
            force: zero(),
            velocity: zero(),
            interval_mass: 1_f32,
            grasp_countdown: 0,
        }
    }

    pub fn velocity_physics(
        &mut self,
        world: &World,
        gravity_above: f32,
        drag_above: f32,
        antigravity: f32,
        active_surface: bool,
    ) {
        let altitude = self.location.y;
        if !active_surface || altitude >= 0_f32 {
            if active_surface {
                self.velocity.y -= gravity_above;
            }
            self.velocity += &self.force / self.interval_mass;
            self.velocity *= 1_f32 - drag_above;
        } else {
            let degree_submerged: f32 = if -altitude < 1_f32 { -altitude } else { 0_f32 };
            if self.grasp_countdown > 0 {
                self.grasp_countdown -= 1;
                self.velocity = zero();
                if self.location.y > -RESURFACE {
                    self.location.y = -RESURFACE;
                } else {
                    self.velocity.y += antigravity * degree_submerged;
                }
            } else {
                self.velocity += &self.force / self.interval_mass;
                let degree_cushioned: f32 = 1_f32 - degree_submerged;
                match world.surface_character {
                    SurfaceCharacter::Frozen => {
                        self.velocity = zero();
                        self.location.y = -RESURFACE;
                    }
                    SurfaceCharacter::Sticky => {
                        self.velocity *= degree_cushioned;
                        self.velocity.y = degree_submerged * RESURFACE;
                    }
                    SurfaceCharacter::Slippery => {
                        self.location.coords.fill(0_f32);
                        self.velocity = zero();
                    }
                    SurfaceCharacter::Bouncy => {
                        self.velocity *= degree_cushioned;
                        self.velocity.y += antigravity * degree_submerged;
                    }
                }
            }
        }
    }

    pub fn location_physics(&mut self) {
        self.location += &self.velocity
    }

    pub fn project(&self, view: &mut View) {
        view.midpoint += &self.location.coords;
        view.joint_locations.push(self.location.x);
        view.joint_locations.push(self.location.y);
        view.joint_locations.push(self.location.z);
        view.joint_velocities.push(self.velocity.x);
        view.joint_velocities.push(self.velocity.y);
        view.joint_velocities.push(self.velocity.z);
    }
}

#[cfg(test)]
#[test]
fn joint_physics() {
    let world = World::new();
    let mut joint = Joint::new(0_f32, 1_f32, 0_f32);
    joint.force.fill(1_f32);
    joint.velocity.fill(1_f32);
    joint.interval_mass = 1_f32;
    joint.velocity_physics(&world, world.gravity, world.drag, world.antigravit, true);
    joint.location_physics();
    let vy_after = (1_f32 - world.gravity + 1_f32) * (1_f32 - world.drag);
    assert_eq!(joint.velocity.y, vy_after);
    let vx_after = 2_f32 * (1_f32 - world.drag);
    assert_eq!(joint.velocity.x, vx_after);
    assert_eq!(joint.location.x, vx_after);
}
