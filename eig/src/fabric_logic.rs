use std::f32::consts::PI;
use std::ops::{Add, Div, Mul, Sub};

use cgmath::{EuclideanSpace, InnerSpace, Point3, Vector3};

use crate::fabric::{Fabric, UniqueId};
use crate::face::Face;
use crate::role::{PULL_A, PULL_B, PUSH_A, PUSH_B};
use crate::tenscript::{FabricPlan, FaceName, Spin};
use crate::tenscript::FaceName::{*};
use crate::tenscript::TenscriptNode;
use crate::tenscript::TenscriptNode::{Branch, Grow};

#[allow(dead_code)]
#[derive(Clone)]
pub enum MarkAction {
    Join,
    ShapingDistance { length_factor: f32 },
    PretenstDistance { length_factor: f32 },
    Subtree { node: TenscriptNode },
}

impl Fabric {
    pub fn with_plan(plan: &FabricPlan) -> Fabric {
        let mut fabric = Fabric::default();
        let spin = &plan.build_phase.seed.unwrap_or(Spin::Left);
        let node = &plan.build_phase.node.as_ref();
        let (single, scale) = if let Some(Grow { face_name, scale, .. }) = node {
            if face_name != &Apos {
                panic!("First grow must have face A+")
            }
            (true, *scale)
        } else { (false, 1f32) };
        match spin {
            Spin::Left => {
                if single {
                    fabric.single_twist(*node, true, scale, None);
                } else {
                    fabric.double_twist(*node, true, scale, None);
                }
            }
            Spin::Right => {
                if single {
                    fabric.single_twist(*node, false, scale, None);
                } else {
                    fabric.double_twist(*node, false, scale, None);
                }
            }
        };
        fabric
    }

    pub fn execute_face(&mut self, face: &Face) -> bool {
        match &face.node {
            Some(Grow { forward, marks, branch, scale, .. }) => {
                if let Some(next_twist_switch) = forward.chars().next() {
                    let left_spin = if next_twist_switch == 'X' { !face.left_handed } else { face.left_handed };
                    let reduced: String = forward[1..].into();
                    let node = if reduced.is_empty() {
                        branch.as_ref().map(|node_box| *node_box.clone())
                    } else {
                        Some(Grow { face_name: Apos, scale: *scale, forward: reduced, marks: marks.clone(), branch: branch.clone() })
                    };
                    self.single_twist(node.as_ref(), left_spin, face.scale * scale, Some(face));
                    true
                } else {
                    false
                }
            }
            Some(branch) => {
                self.double_twist(Some(branch), !face.left_handed, face.scale, Some(face));
                true
            }
            _ => { false }
        }
    }

    pub fn create_joint_from_point(&mut self, p: Point3<f32>) -> usize {
        self.create_joint(p.x, p.y, p.z)
    }

    fn single_twist(&mut self, node: Option<&TenscriptNode>, left_spin: bool, scale: f32, face: Option<&Face>) {
        let base = self.base_triangle(face);
        let pairs = create_pairs(base, left_spin, scale * 1.2);
        let ends = pairs
            .map(|(alpha, omega)|
                (self.create_joint_from_point(alpha), self.create_joint_from_point(omega)));
        let push_intervals = ends.map(|(alpha, omega)| {
            self.create_interval(alpha, omega, PUSH_A, scale)
        });
        let alpha_joint = self.create_joint_from_point(middle(pairs.map(|(alpha, _)| alpha)));
        let omega_joint = self.create_joint_from_point(middle(pairs.map(|(_, omega)| omega)));
        let alphas_x = ends.map(|(alpha, _)| alpha);
        let alphas = [alphas_x[2], alphas_x[1], alphas_x[0]];
        let alpha_radials = alphas.map(|alpha| {
            self.create_interval(alpha_joint, alpha, PULL_A, scale)
        });
        let a_minus_face = self.create_face(Aneg, scale, left_spin, None, vec![], alpha_radials, push_intervals);
        let omegas: [usize; 3] = ends.map(|(_, omega)| omega);
        let omega_radials = omegas.map(|omega| {
            self.create_interval(omega_joint, omega, PULL_A, scale)
        });
        self.create_face(Apos, scale, left_spin, node.cloned(), vec![], omega_radials, push_intervals);
        for index in [0isize, 1, 2] {
            let offset = if left_spin { 1 } else { -1 };
            let alpha = ends[index as usize].0;
            let omega = ends[(ends.len() as isize + index + offset) as usize % ends.len()].1;
            self.create_interval(alpha, omega, PULL_B, scale);
        }
        if let Some(face) = face {
            self.faces_to_loop(face.id, a_minus_face)
        }
    }

    fn double_twist(&mut self, node: Option<&TenscriptNode>, left_spin: bool, scale: f32, face: Option<&Face>) {
        let empty_nodes: Vec<TenscriptNode> = Vec::new();
        let nodes = if let Some(Branch { subtrees }) = node { subtrees } else { &empty_nodes };
        let base = self.base_triangle(face);
        let bottom_pairs = create_pairs(base, left_spin, scale);
        let top_pairs = create_pairs(bottom_pairs.map(|(_, omega)| omega), !left_spin, scale);
        let bot = bottom_pairs.map(|(alpha, omega)|
            (self.create_joint_from_point(alpha), self.create_joint_from_point(omega))
        );
        let top = top_pairs.map(|(alpha, omega)|
            (self.create_joint_from_point(alpha), self.create_joint_from_point(omega))
        );
        let bot_push = bot.map(|(alpha, omega)| {
            self.create_interval(alpha, omega, PUSH_B, scale)
        });
        let top_push = top.map(|(alpha, omega)| {
            self.create_interval(alpha, omega, PUSH_B, scale)
        });
        let face_definitions = if left_spin {
            [
                (Aneg, true, [bot[0].0, bot[2].0, bot[1].0], [bot_push[0], bot_push[2], bot_push[1]]),
                (Bpos, false, [bot[0].0, bot[1].1, top[0].0], [bot_push[0], bot_push[1], top_push[0]]),
                (Cpos, false, [bot[1].0, bot[2].1, top[1].0], [bot_push[1], bot_push[2], top_push[1]]),
                (Dpos, false, [bot[2].0, bot[0].1, top[2].0], [bot_push[2], bot_push[0], top_push[2]]),
                (Bneg, true, [top[2].0, top[1].1, bot[2].1], [top_push[2], top_push[1], bot_push[2]]),
                (Cneg, true, [top[0].0, top[2].1, bot[0].1], [top_push[0], top_push[2], bot_push[0]]),
                (Dneg, true, [top[1].0, top[0].1, bot[1].1], [top_push[1], top_push[0], bot_push[1]]),
                (Apos, false, [top[0].1, top[1].1, top[2].1], [top_push[0], top_push[1], top_push[2]]),
            ]
        } else {
            [
                (Aneg, false, [bot[0].0, bot[2].0, bot[1].0], [bot_push[0], bot_push[2], bot_push[1]]),
                (Bpos, true, [bot[0].0, top[2].0, bot[2].1], [bot_push[0], top_push[2], bot_push[2]]),
                (Cpos, true, [bot[2].0, top[1].0, bot[1].1], [bot_push[2], top_push[1], bot_push[1]]),
                (Dpos, true, [bot[1].0, top[0].0, bot[0].1], [bot_push[1], top_push[0], bot_push[0]]),
                (Bneg, false, [top[0].0, bot[1].1, top[1].1], [top_push[0], bot_push[1], top_push[1]]),
                (Cneg, false, [top[2].0, bot[0].1, top[0].1], [top_push[2], bot_push[0], top_push[0]]),
                (Dneg, false, [top[1].0, bot[2].1, top[2].1], [top_push[1], bot_push[2], top_push[2]]),
                (Apos, true, [top[0].1, top[1].1, top[2].1], [top_push[0], top_push[1], top_push[2]]),
            ]
        };
        let faces = face_definitions
            .map(|(name, left_handed, indexes, push_intervals)| {
                (name, left_handed, indexes, push_intervals, middle(indexes.map(|index| self.joints[index].location)))
            })
            .map(|(name, left_handed, indexes, push_intervals, middle)| {
                let mid_joint = self.create_joint_from_point(middle);
                let radial_intervals = indexes.map(|outer| self.create_interval(mid_joint, outer, PULL_A, scale));
                let node = find_node(nodes, &name);
                self.create_face(name, scale, left_handed, node, vec![], radial_intervals, push_intervals)
            });
        if let Some(face) = face {
            self.faces_to_loop(face.id, faces[0])
        }
    }

    pub fn faces_to_loop(&mut self, face_a_id: UniqueId, face_b_id: UniqueId) {
        let face_a = self.find_face(face_a_id);
        let face_b = self.find_face(face_b_id);
        let scale = (face_a.scale + face_b.scale) / 2.0;
        let a = face_a.radial_joints(&self);
        let b = face_b.radial_joints(&self);
        self.create_interval(a[2], b[0], PULL_A, scale);
        self.create_interval(a[0], b[0], PULL_A, scale);
        self.create_interval(a[0], b[2], PULL_A, scale);
        self.create_interval(a[1], b[2], PULL_A, scale);
        self.create_interval(a[1], b[1], PULL_A, scale);
        self.create_interval(a[2], b[1], PULL_A, scale);
        self.remove_face(face_a_id);
        self.remove_face(face_b_id)
    }

    fn base_triangle(&self, face: Option<&Face>) -> [Point3<f32>; 3] {
        if let Some(face) = face {
            face.radial_joint_locations(&self.joints, &self)
        } else {
            [0f32, 2f32, 1f32].map(|index| {
                let angle = index * PI * 2_f32 / 3_f32;
                Point3::from([angle.cos(), 0_f32, angle.sin()])
            })
        }
    }
}


fn find_node(nodes: &[TenscriptNode], face_name: &FaceName) -> Option<TenscriptNode> {
    nodes.iter().find(|node| {
        if let Grow { face_name: face, .. } = node {
            face == face_name
        } else {
            false
        }
    }).cloned()
}

fn create_pairs(base: [Point3<f32>; 3], left_spin: bool, scale: f32) -> [(Point3<f32>, Point3<f32>); 3] {
    let radius_factor = 1.7f32;
    let mid = middle(base).to_vec();
    let up = points_to_normal(base).mul(-scale);
    [0, 1, 2].map(|index| {
        let from_mid = |offset| base[(index + 3 + offset) as usize % 3].to_vec().sub(mid);
        let between = |idx1, idx2| from_mid(idx1).add(from_mid(idx2)).mul(0.5 * radius_factor);
        let alpha = mid.add(between(0, 1).mul(scale));
        let omega = mid.add(up).add(if left_spin { from_mid(0) } else { from_mid(1) }).mul(scale);
        (Point3::from_vec(alpha), Point3::from_vec(omega))
    })
}

fn middle(points: [Point3<f32>; 3]) -> Point3<f32> {
    points[0].add(points[1].to_vec()).add(points[2].to_vec()).div(3f32)
}

fn points_to_normal(points: [Point3<f32>; 3]) -> Vector3<f32> {
    let v01 = points[1].to_vec().sub(points[0].to_vec());
    let v12 = points[2].to_vec().sub(points[1].to_vec());
    v12.cross(v01).normalize()
}
