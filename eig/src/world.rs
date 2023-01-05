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
    pub stiffness: f32,
}

pub struct World {
    pub surface_character: SurfaceCharacter,
    pub safe_physics: Physics,
    pub pretenst_physics: Physics,
}

impl Default for World {
    fn default() -> Self {
        World {
            surface_character: SurfaceCharacter::Frozen,
            safe_physics: Physics {
                gravity: 0.0,
                antigravity: 0.0,
                viscosity: 1.0e4,
                stiffness: 0.0005,
            },
            pretenst_physics: Physics {
                gravity: 1e-7,
                antigravity: 1e-3,
                viscosity: 1.0e2,
                stiffness: 0.02,
            },
        }
    }
}
