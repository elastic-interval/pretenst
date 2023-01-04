/*
 * Copyright (c) 2020. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

use cgmath::{InnerSpace, Point3, Vector3};
use cgmath::num_traits::zero;
use crate::fabric::Stage;
use crate::fabric::Stage::{*};
use crate::world::{Physics, SurfaceCharacter, World};

const RESURFACE: f32 = 0.01;
const STICKY_UP_DRAG: f32 = 0.03;
const STICKY_DOWN_DRAG: f32 = 0.3;
const AMBIENT_MASS: f32 = 0.001;

#[derive(Clone, Copy, Debug)]
pub struct Joint {
    pub location: Point3<f32>,
    pub force: Vector3<f32>,
    pub velocity: Vector3<f32>,
    pub speed2: f32,
    pub interval_mass: f32,
}

impl Joint {
    pub fn new(location: Point3<f32>) -> Joint {
        Joint {
            location,
            force: zero(),
            velocity: zero(),
            speed2: 0.0,
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

    pub fn physics(&mut self, World { surface_character, safe_physics, physics, .. }: &World, stage: Stage) {
        let Physics{ gravity, antigravity, viscosity, ..} = match stage {
            Pretensing { .. } | Pretenst => physics,
            _ => safe_physics,
        };
        let altitude = self.location.y;
        self.speed2 = self.velocity.magnitude2();
        if self.speed2 > 0.01 {
            panic!("speed too high {:?}", self);
        }
        if self.interval_mass == 0.0 {
            self.velocity = zero();
        } else if altitude >= 0.0 || *gravity == 0.0 {
            self.velocity.y -= gravity;
            self.velocity += self.force / self.interval_mass - self.velocity * self.speed2 * *viscosity;
        } else {
            let degree_submerged: f32 = if -altitude < 1.0 { -altitude } else { 0.0 };
            let antigravity = antigravity * degree_submerged;
            self.velocity += self.force / self.interval_mass;
            match surface_character {
                SurfaceCharacter::Frozen => {
                    self.velocity = zero();
                    self.location.y = -RESURFACE;
                }
                SurfaceCharacter::Sticky => {
                    if self.velocity.y < 0.0 {
                        let sticky_drag = 1.0 - STICKY_DOWN_DRAG; // TODO: use viscosity
                        self.velocity.x *= sticky_drag;
                        self.velocity.y += antigravity;
                        self.velocity.z *= sticky_drag;
                    } else {
                        let sticky_drag = 1.0 - STICKY_UP_DRAG; // TODO: use viscosity
                        self.velocity.x *= sticky_drag;
                        self.velocity.y += antigravity;
                        self.velocity.z *= sticky_drag;
                    }
                }
                SurfaceCharacter::Bouncy => {
                    let degree_cushioned: f32 = 1.0 - degree_submerged;
                    self.velocity *= degree_cushioned;
                    self.velocity.y += antigravity;
                }
            }
        }
        self.location += self.velocity
    }
}
