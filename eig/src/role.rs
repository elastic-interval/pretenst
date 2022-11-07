pub struct Role {
    pub tag: &'static str,
    pub push: bool,
    pub reference_length: f32,
    pub stiffness: f32,
    pub density: f32,
}

use crate::constants::{PHI, ROOT3, ROOT6};

pub const PUSH_A: &Role = &Role {
    tag: "A",
    push: true,
    reference_length: ROOT6,
    stiffness: 1f32,
    density: 1f32,
};

pub const PUSH_B: &Role = &Role {
    tag: "[B]",
    push: true,
    reference_length: PHI * ROOT3,
    stiffness: 1f32,
    density: 1f32,
};

pub const PULL_A: &Role = &Role {
    tag: "a",
    push: false,
    reference_length: 1f32,
    stiffness: 1f32, // TODO
    density: 1f32,
};

pub const PULL_B: &Role = &Role {
    tag: "b",
    push: false,
    reference_length: ROOT3,
    stiffness: 1f32, // TODO
    density: 1f32,
};


pub const PUSH_SHORT: &Role = &Role {
    tag: "long",
    push: true,
    reference_length: ROOT6,
    stiffness: 1f32,
    density: 1f32,
};

