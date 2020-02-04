/*
 * Copyright (c) 2020. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */
use nalgebra::*;
use crate::*;

const RESURFACE: f32 = 0.01;
const ANTIGRAVITY: f32 = -0.001;

pub struct Joint {
    pub(crate) location: Vector3<f32>,
    pub(crate) force: Vector3<f32>,
    pub(crate) velocity: Vector3<f32>,
    pub(crate) interval_mass: f32,
}

impl Joint {
    pub fn new(x: f32, y: f32, z: f32) -> Joint {
        Joint {
            location: Vector3::new(x, y, z),
            force: zero(),
            velocity: zero(),
            interval_mass: 0.0,
        }
    }

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

