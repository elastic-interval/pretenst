use cgmath::{EuclideanSpace, InnerSpace, Point3, Quaternion, Rad, Rotation3, VectorSpace};
use crate::fabric::{Fabric};
use crate::interval::Role::{Pull, Push};
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
    PushInterval { alpha_vertex: usize, omega_vertex: usize, alpha: usize, omega: usize, length: f32 },
}

#[derive(Debug)]
struct Spoke {
    near_vertex: usize,
    far_vertex: usize,
    near_joint: usize,
    far_joint: usize,
    length: f32,
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
                    let alpha = ts.fabric.create_joint(Point3::from_vec(quaternion * alpha_base));
                    let omega = ts.fabric.create_joint(Point3::from_vec(quaternion * omega_base));
                    let length = (omega_base - alpha_base).magnitude();
                    ts.fabric.create_interval(alpha, omega, Push { canonical_length: length }, 1.0);
                    PushInterval { alpha_vertex: *vertex_here, omega_vertex: *adjacent_vertex, alpha, omega, length }
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
                                if let PushInterval { alpha_vertex, omega_vertex, alpha, omega, length } = omega_vertex_adjacent {
                                    if *sought_alpha == *alpha_vertex && *omega_vertex == *sought_omega { // found opposite
                                        return Spoke { near_vertex: *omega_vertex, far_vertex: *alpha_vertex, near_joint: *omega, far_joint: *alpha, length: *length };
                                    }
                                }
                            }
                            panic!("Adjacent not found!");
                        }
                        PushInterval { alpha_vertex, omega_vertex, alpha, omega, length } => {
                            Spoke { near_vertex: *alpha_vertex, far_vertex: *omega_vertex, near_joint: *alpha, far_joint: *omega, length: *length }
                        }
                    }
                )
                .collect::<Vec<Spoke>>())
        .collect::<Vec<Vec<Spoke>>>();
    for (hub, spokes) in vertex_spokes.iter().enumerate() {
        for (spoke_index, spoke) in spokes.iter().enumerate() {
            let next_spoke = &spokes[(spoke_index + 1) % spokes.len()];
            ts.fabric.create_interval(spoke.near_joint, next_spoke.near_joint, Pull { canonical_length: 1.0 }, spoke.length / 3.0);
            let next_near = &spokes[(spoke_index + 1) % spokes.len()].near_joint;
            let next_far = {
                let far_vertex = &vertex_spokes[spoke.far_vertex];
                let hub_position = far_vertex.iter().position(|v| v.far_vertex == hub).unwrap();
                &far_vertex[(hub_position + 1) % far_vertex.len()].near_joint
            };
            if *next_far > *next_near { // only up-hill
                ts.fabric.create_interval(*next_near, *next_far, Pull { canonical_length: 1.0 }, spoke.length / 3.0);
            }
        }
    }
    ts.fabric
}
