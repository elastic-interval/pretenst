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
        .map(|Vertex { index: vertex_here, adjacent, .. }|
            adjacent
                .iter()
                .map(|adjacent_vertex| if *adjacent_vertex > *vertex_here { // only up-hill
                    let (alpha_base, omega_base) = (locations[*vertex_here], locations[*adjacent_vertex]);
                    let axis = alpha_base.lerp(omega_base, 0.5).normalize();
                    let quaternion = Quaternion::from_axis_angle(axis, Rad(TWIST_ANGLE));
                    let alpha = ts.fabric.create_joint_from_point(Point3::from_vec(quaternion.mul(alpha_base)));
                    let omega = ts.fabric.create_joint_from_point(Point3::from_vec(quaternion.mul(omega_base)));
                    let scale = (omega_base - alpha_base).magnitude();
                    ts.fabric.create_interval(alpha, omega, PUSH, scale);
                    PushInterval { alpha_vertex: *vertex_here, omega_vertex: *adjacent_vertex, alpha, omega }
                } else {
                    FindPush { alpha_vertex: *vertex_here, omega_vertex: *adjacent_vertex }
                })
                .collect::<Vec<Cell>>())
        .collect::<Vec<Vec<Cell>>>();
    let vertex_spokes = vertex_cells
        .iter()
        .map(|cells|
            cells
                .iter()
                .map(|cell|
                    match cell {
                        FindPush { alpha_vertex, omega_vertex } => {
                            let (sought_omega, sought_alpha) = (alpha_vertex, omega_vertex);
                            for omega_vertex_adjacent in &vertex_cells[*omega_vertex] {
                                if let PushInterval { alpha_vertex, omega_vertex, alpha, omega } = omega_vertex_adjacent {
                                    if *sought_alpha == *alpha_vertex && *omega_vertex == *sought_omega { // found opposite
                                        return Spoke { near_vertex: *omega_vertex, far_vertex: *alpha_vertex, near_joint: *omega, far_joint: *alpha, found: true };
                                    }
                                }
                            }
                            panic!("Adjacent not found!");
                        }
                        PushInterval { alpha_vertex, omega_vertex, alpha, omega } => {
                            Spoke { near_vertex: *alpha_vertex, far_vertex: *omega_vertex, near_joint: *alpha, far_joint: *omega, found: false }
                        }
                    }
                )
                .collect::<Vec<Spoke>>())
        .collect::<Vec<Vec<Spoke>>>();
    let mut mid_pulls: Vec<(usize, usize)> = vec![];
    for (hub, spokes) in vertex_spokes.iter().enumerate() {
        for (index, spoke) in spokes.iter().enumerate() {
            let next_spoke = &spokes[(index + 1) % spokes.len()];
            ts.fabric.create_interval(spoke.near_joint, next_spoke.near_joint, PULL, 1.0); // TODO pass in scale
        }
        for (index, spoke) in spokes.iter().enumerate() {
            let next_vertex = &spokes[(index + 1) % spokes.len()];
            let rim_vertex = &vertex_spokes[spoke.far_vertex];
            let rim_to_hub_position = rim_vertex.iter().position(|v| v.far_vertex == hub).unwrap();
            let next_to_hub = &rim_vertex[(rim_to_hub_position + 1) % rim_vertex.len()];
            let (alpha, omega) = (next_vertex.near_joint, next_to_hub.near_joint);
            if !mid_pulls.iter().any(|(existing_alpha, existing_omega)| *existing_alpha == omega && *existing_omega == alpha) {
                ts.fabric.create_interval(alpha, omega, PULL, 1.0); // TODO pass in scale
                mid_pulls.push((alpha, omega));
            }
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
