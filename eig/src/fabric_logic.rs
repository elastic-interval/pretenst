use std::f32::consts::PI;
use std::ops::{Add, Div, Mul, Sub};

use cgmath::{EuclideanSpace, InnerSpace, Point3, Vector3};

use crate::fabric::Fabric;
use crate::face::Face;
use crate::role::{PULL_A, PULL_B, PUSH_A, PUSH_B};
use crate::tenscript::{FabricPlan, FaceName, Spin};
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
        let seed = plan.build_phase.seed.unwrap_or(Spin::Left);
        let _faces: Vec<&Face> = fabric.create_twist(seed, 1.0, None).into_iter()
            .map(|index|&fabric.faces[index]).collect();

        fabric
    }

    pub fn execute_face(&mut self, face: &mut Face) {
        let ahead = if let Some(Grow { forward, .. }) = &face.node {
            forward.chars().nth(face.forward_index)
        } else {
            None
        };
        let base = &face.radial_joint_locations(&self.joints, &self.intervals);
        if let Some(_go) = ahead {
            // act on the GO char, make another twist
            self.create_single(base.clone(), face.left_handed, 1f32);
            face.forward_index += 1
        } else {
            match &face.node {
                Some(Grow { marks, branch, .. }) => {
                    face.marks = marks.clone();
                    if let Some(node_box) = branch {
                        face.node = Some(*node_box.clone())
                    }
                }
                Some(Branch { subtrees: _subtrees, .. }) => {
                    // attach the subtrees to the double's faces
                    self.create_double(base.clone(), face.left_handed, 1f32);
                }
                None => {}
            };
        }
    }

    pub fn create_twist(&mut self, spin: Spin, scale: f32, base_triangle: Option<[Point3<f32>; 3]>) -> Vec<usize> {
        let base = base_triangle.unwrap_or_else(||
            [0f32, 1f32, 2f32].map(|index| {
                let angle = index * PI * 2_f32 / 3_f32;
                Point3::from([angle.cos(), 0_f32, angle.sin()])
            })
        );
        match spin {
            Spin::Left => { self.create_single(base, true, scale) }
            Spin::LeftRight => { self.create_double(base, true, scale) }
            Spin::Right => { self.create_single(base, false, scale) }
            Spin::RightLeft => { self.create_double(base, false, scale) }
        }
    }

    pub fn create_joint_from_point(&mut self, p: Point3<f32>) -> usize {
        self.create_joint(p.x, p.y, p.z)
    }

    fn create_single(&mut self, base: [Point3<f32>; 3], left_spin: bool, scale: f32) -> Vec<usize> {
        let pairs = create_pairs(base, left_spin, scale);
        let ends = pairs
            .map(|(alpha, omega)|
                (self.create_joint_from_point(alpha), self.create_joint_from_point(omega)));
        let push_intervals = ends.map(|(alpha, omega)| {
            self.create_interval(alpha, omega, PUSH_A, scale)
        });
        let alpha_joint = self.create_joint_from_point(middle(pairs.map(|(alpha, _)| alpha)));
        let omega_joint = self.create_joint_from_point(middle(pairs.map(|(_, omega)| omega)));
        let alphas = ends.map(|(alpha, _)| alpha);
        let radial_intervals = alphas.map(|alpha| {
            self.create_interval(alpha_joint, alpha, PULL_A, scale)
        });
        let bottom_face = self.create_face(Face {
            name: FaceName::Aminus,
            left_handed: left_spin,
            node: None,
            forward_index: 0,
            marks: vec![],
            radial_intervals,
            push_intervals,
        });
        let omegas = ends.map(|(_, omega)| omega);
        for omega in omegas.iter().rev().cloned() {
            self.create_interval(omega_joint, omega, PULL_A, scale);
        }
        let top_face = self.create_face(Face {
            name: FaceName::Aplus,
            left_handed: !left_spin,
            node: None,
            forward_index: 0,
            marks: vec![],
            radial_intervals,
            push_intervals,
        });
        for index in [0isize, 1, 2] {
            let offset = if left_spin { -1 } else { 1 };
            let alpha = ends[index as usize].0;
            let omega = ends[(ends.len() as isize + index + offset) as usize % ends.len()].1;
            self.create_interval(alpha, omega, PULL_B, scale);
        }
        Vec::from([bottom_face, top_face])
    }

    fn create_double(&mut self, base: [Point3<f32>; 3], left_spin: bool, scale: f32) -> Vec<usize> {
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
        let faces = if left_spin {
            [
                (FaceName::Aminus, true, [bot[0].0, bot[1].0, bot[2].0], [bot_push[0], bot_push[1], bot_push[2]]),
                (FaceName::Bplus, false, [bot[0].0, bot[2].1, top[2].0], [bot_push[0], bot_push[2], top_push[2]]),
                (FaceName::Cplus, false, [bot[1].0, bot[0].1, top[0].0], [bot_push[1], bot_push[0], top_push[0]]),
                (FaceName::Dplus, false, [bot[2].0, bot[1].1, top[1].0], [bot_push[2], bot_push[1], top_push[1]]),
                (FaceName::Bminus, true, [top[0].0, top[1].1, bot[1].1], [top_push[0], top_push[1], bot_push[1]]),
                (FaceName::Cminus, true, [top[1].0, top[2].1, bot[2].1], [top_push[1], top_push[2], bot_push[2]]),
                (FaceName::Dminus, true, [top[2].0, top[0].1, bot[0].1], [top_push[2], top_push[0], bot_push[0]]),
                (FaceName::Aplus, false, [top[0].1, top[2].1, top[1].1], [top_push[0], top_push[2], top_push[1]]),
            ]
        } else {
            [
                (FaceName::Aminus, false, [bot[0].0, bot[1].0, bot[2].0], [bot_push[0], bot_push[1], bot_push[2]]),
                (FaceName::Bplus, true, [bot[0].0, top[0].0, bot[1].1], [bot_push[0], top_push[0], bot_push[1]]),
                (FaceName::Cplus, true, [bot[2].0, top[2].0, bot[0].1], [bot_push[2], top_push[2], bot_push[0]]),
                (FaceName::Dplus, true, [bot[1].0, top[1].0, bot[2].1], [bot_push[1], top_push[1], bot_push[2]]),
                (FaceName::Bminus, false, [top[2].0, bot[2].1, top[1].1], [top_push[2], bot_push[2], top_push[1]]),
                (FaceName::Cminus, false, [top[1].0, bot[1].1, top[0].1], [top_push[1], bot_push[1], top_push[0]]),
                (FaceName::Dminus, false, [top[0].0, bot[0].1, top[2].1], [top_push[0], bot_push[0], top_push[2]]),
                (FaceName::Aplus, true, [top[0].1, top[2].1, top[1].1], [top_push[0], top_push[1], top_push[2]]),
            ]
        };
        Vec::from(faces
            .map(|(name, left_handed, indexes, push_intervals)| {
                (name, left_handed, indexes, push_intervals, middle(indexes.map(|index| self.joints[index].location)))
            })
            .map(|(name, left_handed, indexes, push_intervals, middle)| {
                let mid_joint = self.create_joint_from_point(middle);
                let radial_intervals = indexes.map(|outer| self.create_interval(mid_joint, outer, PULL_A, scale));
                self.create_face(Face {
                    name,
                    left_handed,
                    node: None,
                    forward_index: 0,
                    marks: vec![],
                    radial_intervals,
                    push_intervals,
                })
            }))
    }
}

fn create_pairs(base: [Point3<f32>; 3], left_spin: bool, scale: f32) -> [(Point3<f32>, Point3<f32>); 3] {
    let mid = middle(base).to_vec();
    let up = points_to_normal(base).mul(-scale);
    [0, 1, 2].map(|index| {
        let from_mid = |offset| base[(index + 3 + offset) as usize % 3].to_vec().sub(mid);
        let between = |idx1, idx2| from_mid(idx1).add(from_mid(idx2)).mul(0.5);
        let alpha = mid.add(between(0, 1).mul(scale));
        let omega = mid.add(up).add(if left_spin { between(1, 2) } else { between(-1, 0) });
        (Point3::from_vec(alpha), Point3::from_vec(omega))
    })
}

fn middle(points: [Point3<f32>; 3]) -> Point3<f32> {
    Point3::from(points[0]).add(points[1].to_vec()).add(points[2].to_vec()).div(3f32)
}

fn points_to_normal(points: [Point3<f32>; 3]) -> Vector3<f32> {
    let v01 = Vector3::from(points[1].to_vec()).sub(points[0].to_vec());
    let v12 = Vector3::from(points[2].to_vec()).sub(points[1].to_vec());
    Vector3::from(v01).cross(v12).normalize()
}

