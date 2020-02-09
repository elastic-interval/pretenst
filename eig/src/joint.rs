/*
 * Copyright (c) 2020. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

use crate::constants::SurfaceCharacter;
use crate::world::World;
use nalgebra::*;

const RESURFACE: f32 = 0.01;
const ANTIGRAVITY: f32 = -0.001;

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
            interval_mass: 0_f32,
        }
    }

    pub fn physics(&mut self, world: &World) {
        let altitude = self.location.y;
        if altitude > 0_f32 {
            self.velocity.y -= world.gravity;
            self.velocity *= 1_f32 - world.drag;
            self.velocity += &self.force / self.interval_mass;
        } else {
            self.velocity += &self.force / self.interval_mass;
            let degree_submerged: f32 = if -altitude < 1_f32 { -altitude } else { 0_f32 };
            let degree_cushioned: f32 = 1_f32 - degree_submerged;
            match world.surface_character {
                SurfaceCharacter::Frozen => {
                    self.velocity.fill(0_f32);
                    self.location.y = -RESURFACE;
                }
                SurfaceCharacter::Sticky => {
                    self.velocity *= degree_cushioned;
                    self.velocity.y = degree_submerged * RESURFACE;
                }
                SurfaceCharacter::Slippery => {
                    self.location.coords.fill(0_f32);
                    self.velocity.fill(0_f32);
                }
                SurfaceCharacter::Bouncy => {
                    self.velocity *= degree_cushioned;
                    self.velocity.y -= ANTIGRAVITY * degree_submerged;
                }
            }
        }
    }
}
