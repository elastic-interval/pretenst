use std::f32::consts::PI;
use std::ops::{Add, Div, Mul, Sub};

use cgmath::{EuclideanSpace, InnerSpace, MetricSpace, Point3, Vector3, Zero};
use cgmath::num_traits::abs;

use crate::fabric::Fabric;
use crate::fabric_logic::roles::{PULL_A, PULL_B, PUSH_B};
use crate::interval::Span::Approaching;
use crate::tenscript::{FaceName, Spin};

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

pub struct Role {
    pub tag: &'static str,
    pub push: bool,
    pub length: f32,
    pub stiffness: f32,
}

mod roles {
    use crate::constants::{PHI, ROOT3, ROOT6};
    use crate::fabric_logic::Role;

    pub const PUSH_A: &Role = &Role {
        tag: "A",
        push: true,
        length: ROOT6,
        stiffness: 1f32,
    };

    pub const PUSH_B: &Role = &Role {
        tag: "[B]",
        push: true,
        length: PHI * ROOT3,
        stiffness: 1f32,
    };

    pub const PULL_A: &Role = &Role {
        tag: "a",
        push: false,
        length: 1f32,
        stiffness: 1f32, // TODO
    };

    pub const PULL_B: &Role = &Role {
        tag: "b",
        push: false,
        length: ROOT3,
        stiffness: 1f32, // TODO
    };
}

#[derive(Clone, Copy)]
pub struct BudFace {
    pub joints: [usize; 3],
    pub twist: usize,
    pub face_name: FaceName,
    pub left_spin: bool,
}

impl Fabric {
    pub fn create_twist(&mut self, _spin: Spin, _scale: f32, base_triangle: Option<[Point3<f32>; 3]>) -> usize {
        // let twist = self.twist_count;
        let base = base_triangle.unwrap_or_else(||
            [0f32, 1f32, 2f32].map(|index| {
                let angle = index * PI * 2_f32 / 3_f32;
                Point3::from([angle.cos(), 0_f32, angle.sin()])
            })
        );
        let twist = 5;
        self.create_single(base, false, 1f32, twist);
        self.create_double(base, false, 1f32, twist);
        twist
    }

    pub fn create_interval_with_role(
        &mut self,
        alpha_index: usize,
        omega_index: usize,
        role: &Role,
        scale: f32,
    ) -> usize {
        let countdown = 1000f32; // todo
        let initial_length = self.joints[alpha_index].location.distance(self.joints[omega_index].location);
        let final_length = role.length * scale;
        let countdown = countdown as f32 * abs(final_length - initial_length);
        let span = Approaching { initial_length, final_length, attack: 1f32 / countdown, nuance: 0f32 };
        let mass = if role.push { final_length } else { final_length * 0.01 };
        self.create_interval(alpha_index, omega_index, role.push, span, role.stiffness, mass)
    }

    pub fn create_joint_from_point(&mut self, p: Point3<f32>) -> usize {
        self.create_joint(p.x, p.y, p.z)
    }

    pub fn create_budface(&mut self, _face: BudFace) {
        unimplemented!("add budface to inventory");
    }

    fn create_single(&mut self, base: [Point3<f32>; 3], left_spin: bool, scale: f32, twist: usize) {
        let pairs = create_pairs(base, left_spin, scale);
        let ends = pairs
            .map(|(alpha, omega)| (self.create_joint_from_point(alpha), self.create_joint_from_point(omega)));
        for (alpha, omega) in ends {
            self.create_interval_with_role(alpha, omega, roles::PUSH_A, scale);
        }
        let alpha_joint = self.create_joint_from_point(middle(pairs.map(|(alpha, _)| alpha)));
        let omega_joint = self.create_joint_from_point(middle(pairs.map(|(_, omega)| omega)));
        let alphas = ends.map(|(alpha, _)| alpha);
        for alpha in alphas {
            self.create_interval_with_role(alpha_joint, alpha, PULL_A, scale);
        }
        self.create_budface(BudFace { joints: alphas, twist, face_name: FaceName::Aminus, left_spin });
        let omegas = ends.map(|(_, omega)| omega);
        for omega in omegas.iter().rev().cloned() {
            self.create_interval_with_role(omega_joint, omega, PULL_A, scale);
        }
        self.create_budface(BudFace { joints: omegas, twist, face_name: FaceName::Aplus, left_spin: !left_spin });
        for index in [0isize, 1, 2] {
            let offset = if left_spin { -1 } else { 1 };
            let alpha = ends[index as usize].0;
            let omega = ends[(ends.len() as isize + index + offset) as usize % ends.len()].1;
            self.create_interval_with_role(alpha, omega, PULL_B, scale);
        }
    }

    fn create_double(&mut self, base: [Point3<f32>; 3], left_spin: bool, scale: f32, twist: usize) {
        let bottom_pairs = create_pairs(base, left_spin, scale);
        let top_pairs = create_pairs(bottom_pairs.map(|(_, omega)| omega), !left_spin, scale);
        let bot = bottom_pairs.map(|(alpha, omega)|
            (self.create_joint_from_point(alpha), self.create_joint_from_point(omega))
        );
        let top = top_pairs.map(|(alpha, omega)|
            (self.create_joint_from_point(alpha), self.create_joint_from_point(omega))
        );
        bot.iter().for_each(|(alpha, omega)| {
            self.create_interval_with_role(*alpha, *omega, PUSH_B, scale);
        });
        top.iter().for_each(|(alpha, omega)| {
            self.create_interval_with_role(*alpha, *omega, PUSH_B, scale);
        });
        let face_indexes = if left_spin {
            [
                [bot[0].0, bot[1].0, bot[2].0], // a
                [bot[2].0, bot[1].1, top[1].0], // B
                [bot[0].0, bot[2].1, top[2].0], // C
                [bot[1].0, bot[0].1, top[0].0], // D
                [top[1].1, bot[1].1, top[0].0], // b
                [top[0].1, bot[0].1, top[2].0], // d
                [top[2].1, bot[2].1, top[1].0], // c
                [top[0].1, top[2].1, top[1].1], // A
            ]
        } else {
            [
                [bot[0].0, bot[1].0, bot[2].0], // a
                [bot[2].0, top[2].0, bot[0].1], // D
                [bot[0].0, top[0].0, bot[1].1], // B
                [bot[1].0, top[1].0, bot[2].1], // C
                [top[1].1, top[2].0, bot[2].1], // b
                [top[2].1, top[0].0, bot[0].1], // c
                [top[0].1, top[1].0, bot[1].1], // d
                [top[0].1, top[2].1, top[1].1], // A
            ]
        };
        let face_joints = face_indexes
            .map(|indexes| indexes.map(|index| self.joints[index].location))
            .map(|joint_locations| middle(joint_locations))
            .map(|location| self.create_joint_from_point(location));
        face_indexes.into_iter().enumerate().for_each(|(index, joints)| {
            let middle_joint = face_joints[index];
            for joint in joints {
                self.create_interval_with_role(joint, middle_joint, PULL_A, scale);
            }
            let left_spin = [0usize, 4, 5, 6].contains(&index);
            self.create_budface(BudFace { joints, twist, face_name: FaceName::Aplus, left_spin });
            // todo: the face name here is WRONG
            // todo: add attribute to face addFace(twist, joints, pulls, spin, scale, midJoint)
        })
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
    let v01 = Vector3::zero().add(points[1].to_vec()).sub(points[0].to_vec());
    let v12 = Vector3::zero().add(points[2].to_vec()).sub(points[1].to_vec());
    Vector3::from(v01).cross(v12).normalize()
}

