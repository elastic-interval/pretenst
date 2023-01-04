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
    pub gravity: f32,
    pub antigravity: f32,
    pub viscosity: f32,
    pub push_extension: f32,
    pub stiffness: f32,
}

pub struct World {
    pub surface_character: SurfaceCharacter,
    pub safe_physics: Physics,
    pub physics: Physics,
}

impl Default for World {
    fn default() -> Self {
        World {
            surface_character: SurfaceCharacter::Bouncy,
            safe_physics: Physics {
                gravity: 0.0,
                antigravity: 0.0,
                viscosity: 1.0e4,
                push_extension: 0.3,
                stiffness: 0.0005,
            },
            physics: Physics {
                gravity: 2e-7,
                antigravity: 0.001,
                viscosity: 1.0e2,
                push_extension: 0.03,
                stiffness: 0.01,
            },
        }
    }
}
