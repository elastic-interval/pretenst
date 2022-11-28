use std::ops::Mul;
use cgmath::{EuclideanSpace, InnerSpace, Point3, Quaternion, Rad, Rotation3, VectorSpace};
use crate::fabric::{Fabric};
use crate::role::Role;
use crate::sphere::{SphereScaffold, Vertex};

const TWIST_ANGLE: f32 = 0.52;

struct TensegritySphere {
    scaffold: SphereScaffold,
    fabric: Fabric,
}

impl TensegritySphere {
    fn new(frequency: usize, radius: f32) -> TensegritySphere {
        let mut scaffold = SphereScaffold::new(frequency);
        scaffold.generate();
        scaffold.set_radius(radius);
        TensegritySphere { scaffold, fabric: Fabric::default() }
    }
}

enum Cell {
    FindPush { alpha_vertex: usize, omega_vertex: usize },
    PushInterval { alpha_vertex: usize, omega_vertex: usize, alpha: usize, omega: usize },
}

#[derive(Debug)]
struct Spoke {
    near_vertex: usize,
    far_vertex: usize,
    near_joint: usize,
    far_joint: usize,
    found: bool,
}

pub fn generate_ball(frequency: usize, radius: f32) -> Fabric {
    use Cell::*;
    let mut ts = TensegritySphere::new(frequency, radius);
    let locations = ts.scaffold.locations();
    let vertex_cells = ts.scaffold.vertex
        .iter()
        .map(|Vertex { index, adjacent, .. }| {
            adjacent
                .iter()
                .map(|other_vertex| {
                    if *other_vertex > *index { // only up-hill
                        let (alpha_base, omega_base) = (locations[*index], locations[*other_vertex]);
                        let axis = alpha_base.lerp(omega_base, 0.5).normalize();
                        let quaternion = Quaternion::from_axis_angle(axis, Rad(TWIST_ANGLE));
                        let alpha = ts.fabric.create_joint_from_point(Point3::from_vec(quaternion.mul(alpha_base)));
                        let omega = ts.fabric.create_joint_from_point(Point3::from_vec(quaternion.mul(omega_base)));
                        let scale = (omega_base - alpha_base).magnitude();
                        ts.fabric.create_interval(alpha, omega, PUSH, scale);
                        PushInterval { alpha_vertex: *index, omega_vertex: *other_vertex, alpha, omega }
                    } else {
                        FindPush { alpha_vertex: *other_vertex, omega_vertex: *index } // also up-hill to find later
                    }
                }).collect::<Vec<Cell>>()
        }).collect::<Vec<Vec<Cell>>>();
    let vertex_spokes = vertex_cells
        .iter()
        .map(|cells| {
            cells
                .iter()
                .map(|cell| {
                    match cell {
                        FindPush { alpha_vertex, omega_vertex } => {
                            let sought_omega = omega_vertex;
                            let cell_to_search = &vertex_cells[*alpha_vertex];
                            for adjacent in cell_to_search {
                                if let PushInterval { alpha_vertex, omega_vertex, alpha, omega } = adjacent {
                                    if *omega_vertex == *sought_omega {
                                        return Spoke { near_vertex: *omega_vertex, far_vertex: *alpha_vertex, near_joint: *alpha, far_joint: *omega, found: true };
                                    }
                                }
                            }
                            panic!("Adjacent not found!");
                        }
                        PushInterval { alpha_vertex, omega_vertex, alpha, omega } => {
                            Spoke { near_vertex: *alpha_vertex, far_vertex: *omega_vertex, near_joint: *alpha, far_joint: *omega, found: false }
                        }
                    }
                }).collect::<Vec<Spoke>>()
        }).collect::<Vec<Vec<Spoke>>>();
    for spokes in &vertex_spokes {
        for spoke in spokes {
            if spoke.found {
                print!("({:?}=>{:?}), ", spoke.near_vertex, spoke.far_vertex);
            } else {
                print!("{:?}=>{:?}, ", spoke.near_vertex, spoke.far_vertex);
            }
        }
        println!();
    }
    let mut mid_pulls: Vec<(usize, usize)> = vec![];
    for (hub, spokes) in vertex_spokes.iter().enumerate() {
        let mut pull = |alpha: usize, omega: usize, check:bool| {
            if !check || !mid_pulls.iter().any(|pull| pull.0 == omega && pull.1 == alpha) {
                ts.fabric.create_interval(alpha, omega, PULL, 1.0); // TODO pass in scale
                mid_pulls.push((alpha, omega))
            }
        };
        for push_index in 0..spokes.len() {
            let (curr, next) = (&spokes[push_index], &spokes[(push_index + 1) % spokes.len()]);
            pull(curr.near_joint, next.near_joint, false);
            let other_vertex = &vertex_spokes[curr.far_vertex];
            let other_to_us_position = other_vertex.iter().position(|v| v.far_vertex == hub).unwrap();
            let next_to_us = &other_vertex[(other_to_us_position + 1) % other_vertex.len()];
            pull(next_to_us.near_joint, curr.near_joint, true);
        }
    }
    ts.fabric
}

const PUSH: &Role = &Role {
    tag: "push",
    push: true,
    reference_length: 1.0,
    stiffness: 1f32,
    density: 1f32,
};

const PULL: &Role = &Role {
    tag: "pull",
    push: false,
    reference_length: 1f32,
    stiffness: 1f32,
    density: 1f32,
};
