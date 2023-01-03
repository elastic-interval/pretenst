/*
 * Copyright (c) 2020. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

#[derive(Debug, Clone, Copy)]
pub enum SurfaceCharacter {
    Frozen,
    Sticky,
    Bouncy,
}

pub struct Physics {
    pub viscosity: f32,
    pub push_extension: f32,
    pub stiffness: f32,
}

pub struct World {
    pub surface_character: SurfaceCharacter,
    pub gravity: f32,
    pub antigravity: f32,
    pub safe_physics: Physics,
    pub physics: Physics,
}

impl Default for World {
    fn default() -> Self {
        World {
            surface_character: SurfaceCharacter::Bouncy,
            gravity: 2e-7,
            antigravity: 0.001,
            safe_physics: Physics {
                viscosity: 1.0e4,
                push_extension: 0.3,
                stiffness: 0.0005,
            },
            physics: Physics {
                viscosity: 1.0e2,
                push_extension: 0.03,
                stiffness: 0.01,
            },
        }
    }
}
