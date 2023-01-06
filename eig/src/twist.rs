use std::f32::consts::PI;

use cgmath::{EuclideanSpace, InnerSpace, Point3, Vector3};

use crate::fabric::{Fabric, UniqueId};
use crate::face::Face;
use crate::interval::Role::{*};
use crate::tenscript::{FaceName, Spin};
use crate::tenscript::FaceName::{*};
use crate::tenscript::Spin::{Left, Right};
use crate::tenscript::TenscriptNode;
use crate::tenscript::TenscriptNode::{Branch, Grow, Mark};

const ROOT3: f32 = 1.732_050_8;
const ROOT5: f32 = 2.236_068;
const ROOT6: f32 = 2.449_489_8;
const PHI: f32 = (1f32 + ROOT5) / 2f32;

impl Fabric {
    pub fn single_twist(&mut self, spin: Spin, pretenst_factor:f32, scale_factor: f32, face_id: Option<UniqueId>) -> [(FaceName, UniqueId); 2] {
        let face = face_id.map(|id| self.face(id));
        let scale = face.map(|Face { scale, .. }| *scale).unwrap_or(1.0) * scale_factor;
        let base = self.base_triangle(face);
        let pairs = create_pairs(base, spin, scale, scale);
        let ends = pairs
            .map(|(alpha, omega)|
                (self.create_joint(alpha), self.create_joint(omega)));
        let push_intervals = ends.map(|(alpha, omega)| {
            self.create_interval(alpha, omega, TwistPush, scale * ROOT6 * pretenst_factor)
        });
        let alpha_joint = self.create_joint(middle(pairs.map(|(alpha, _)| alpha)));
        let omega_joint = self.create_joint(middle(pairs.map(|(_, omega)| omega)));
        let alphas_x = ends.map(|(alpha, _)| alpha);
        let alphas = [alphas_x[2], alphas_x[1], alphas_x[0]];
        let alpha_radials = alphas.map(|alpha| {
            self.create_interval(alpha_joint, alpha, Pull, scale)
        });
        let a_minus_face = self.create_face(scale, spin, alpha_radials, push_intervals);
        let omegas: [usize; 3] = ends.map(|(_, omega)| omega);
        let omega_radials = omegas.map(|omega| {
            self.create_interval(omega_joint, omega, Pull, scale)
        });
        let a_plus_face = self.create_face(scale, spin, omega_radials, push_intervals);
        for index in 0..=2 {
            let offset = match spin { Left => 1, Right => -1 };
            let alpha = ends[index as usize].0;
            let omega = ends[(ends.len() as isize + index + offset) as usize % ends.len()].1;
            self.create_interval(alpha, omega, TwistVerticalPull, ROOT3 * scale);
        }
        if let Some(id) = face_id { self.faces_to_loop(id, a_minus_face) }
        [(Aneg, a_minus_face), (Apos, a_plus_face)]
    }

    pub fn double_twist(&mut self, spin: Spin, pretenst_factor:f32, scale_factor: f32, face_id: Option<UniqueId>) -> [(FaceName, UniqueId); 8] {
        let face = face_id.map(|id| self.face(id));
        let scale = face.map(|Face { scale, .. }| *scale).unwrap_or(1.0) * scale_factor;
        let base = self.base_triangle(face);
        let widening = 1.5f32;
        let bottom_pairs = create_pairs(base, spin, scale, scale * widening);
        let top_pairs = create_pairs(bottom_pairs.map(|(_, omega)| omega), spin.opposite(), widening, scale);
        let bot = bottom_pairs.map(|(alpha, omega)|
            (self.create_joint(alpha), self.create_joint(omega))
        );
        let top = top_pairs.map(|(alpha, omega)|
            (self.create_joint(alpha), self.create_joint(omega))
        );
        let bot_push = bot.map(|(alpha, omega)| {
            self.create_interval(alpha, omega, DoubleTwistPush, PHI * ROOT3 * scale * pretenst_factor)
        });
        let top_push = top.map(|(alpha, omega)| {
            self.create_interval(alpha, omega, DoubleTwistPush, PHI * ROOT3 * scale * pretenst_factor)
        });
        let face_definitions = match spin {
            Left => [
                (Aneg, Left, [bot[2].0, bot[1].0, bot[0].0], [bot_push[0], bot_push[2], bot_push[1]]),
                (Bpos, Right, [bot[0].0, bot[1].1, top[0].0], [bot_push[0], bot_push[1], top_push[0]]),
                (Cpos, Right, [bot[1].0, bot[2].1, top[1].0], [bot_push[1], bot_push[2], top_push[1]]),
                (Dpos, Right, [bot[2].0, bot[0].1, top[2].0], [bot_push[2], bot_push[0], top_push[2]]),
                (Bneg, Left, [top[2].0, top[1].1, bot[2].1], [top_push[2], top_push[1], bot_push[2]]),
                (Cneg, Left, [top[0].0, top[2].1, bot[0].1], [top_push[0], top_push[2], bot_push[0]]),
                (Dneg, Left, [top[1].0, top[0].1, bot[1].1], [top_push[1], top_push[0], bot_push[1]]),
                (Apos, Right, [top[0].1, top[1].1, top[2].1], [top_push[0], top_push[1], top_push[2]]),
            ],
            Right => [
                (Aneg, Right, [bot[2].0, bot[1].0, bot[0].0], [bot_push[0], bot_push[2], bot_push[1]]),
                (Bpos, Left, [bot[0].0, top[2].0, bot[2].1], [bot_push[0], top_push[2], bot_push[2]]),
                (Cpos, Left, [bot[2].0, top[1].0, bot[1].1], [bot_push[2], top_push[1], bot_push[1]]),
                (Dpos, Left, [bot[1].0, top[0].0, bot[0].1], [bot_push[1], top_push[0], bot_push[0]]),
                (Bneg, Right, [top[0].0, bot[1].1, top[1].1], [top_push[0], bot_push[1], top_push[1]]),
                (Cneg, Right, [top[2].0, bot[0].1, top[0].1], [top_push[2], bot_push[0], top_push[0]]),
                (Dneg, Right, [top[1].0, bot[2].1, top[2].1], [top_push[1], bot_push[2], top_push[2]]),
                (Apos, Left, [top[0].1, top[1].1, top[2].1], [top_push[0], top_push[1], top_push[2]]),
            ],
        };
        let faces = face_definitions
            .map(|(name, spin, indexes, push_intervals)| {
                let middle = middle(indexes.map(|index| self.joints[index].location));
                let mid_joint = self.create_joint(middle);
                let radial_intervals = indexes
                    .map(|outer| self.create_interval(mid_joint, outer, RadialPull, scale));
                let face = self.create_face(scale, spin, radial_intervals, push_intervals);
                (name, face)
            });
        if let Some(id) = face_id { self.faces_to_loop(id, faces[0].1) }
        faces
    }

    pub fn faces_to_loop(&mut self, face_a_id: UniqueId, face_b_id: UniqueId) {
        let (face_a, face_b) = (self.face(face_a_id), self.face(face_b_id));
        let scale = (face_a.scale + face_b.scale) / 2.0;
        let (a, b) = (face_a.radial_joints(self), face_b.radial_joints(self));
        for (alpha, omega) in [(0, 0), (2, 0), (1, 2), (0, 2), (2, 1), (1, 1)] {
            self.create_interval(a[alpha], b[omega], TwistRingPull, scale);
        }
        self.remove_face(face_a_id);
        self.remove_face(face_b_id)
    }

    fn base_triangle(&self, face: Option<&Face>) -> [Point3<f32>; 3] {
        if let Some(face) = face {
            face.radial_joint_locations(&self.joints, self)
        } else {
            [0f32, 2f32, 1f32].map(|index| {
                let angle = index * PI * 2.0 / 3.0;
                Point3::from([angle.cos(), 0.0, angle.sin()])
            })
        }
    }
}

fn find_node(nodes: &[TenscriptNode], sought_face_name: &FaceName) -> Option<TenscriptNode> {
    nodes.iter().find(|node|
        match node {
            Grow { face_name, .. } => {
                face_name == sought_face_name
            }
            Mark { face_name, .. } => {
                face_name == sought_face_name
            }
            Branch { .. } => { false }
        }
    ).cloned()
}

fn create_pairs(base: [Point3<f32>; 3], spin: Spin, alpha_scale: f32, omega_scale: f32) -> [(Point3<f32>, Point3<f32>); 3] {
    let radius_factor = 1.4f32;
    let mid = middle(base).to_vec();
    let up = points_to_normal(base) * (alpha_scale + omega_scale) / -2.0;
    [0, 1, 2].map(|index| {
        let from_mid = |offset| base[(index + 3 + offset) as usize % 3].to_vec() - mid;
        let between = |idx1, idx2| (from_mid(idx1) + from_mid(idx2)) * 0.5 * radius_factor;
        let alpha = mid + between(0, 1) * alpha_scale;
        let offset = match spin { Left => 0, Right => 1 };
        let omega = mid + up + from_mid(offset) * omega_scale;
        (Point3::from_vec(alpha), Point3::from_vec(omega))
    })
}

fn middle(points: [Point3<f32>; 3]) -> Point3<f32> {
    (points[0] + points[1].to_vec() + points[2].to_vec()) / 3f32
}

fn points_to_normal(points: [Point3<f32>; 3]) -> Vector3<f32> {
    let v01 = points[1].to_vec() - points[0].to_vec();
    let v12 = points[2].to_vec() - points[1].to_vec();
    v12.cross(v01).normalize()
}
