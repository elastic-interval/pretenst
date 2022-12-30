use cgmath::{EuclideanSpace, MetricSpace, Point3, Vector3};

use crate::fabric::Fabric;
use crate::role::{Role};

const PUSH_ROLE: &Role = &Role {
    tag: "push",
    push: true,
    reference_length: 1f32,
    stiffness: 1f32,
    density: 1f32,
};

const PULL_ROLE: &Role = &Role {
    tag: "push",
    push: false,
    reference_length: 1f32,
    stiffness: 0.3f32,
    density: 1f32,
};

impl Fabric {
    pub fn mitosis_example() -> Fabric {
        let mut fab = Fabric::default();
        let shaping_pretenst = 1f32 / 1.3;
        let short = 16f32 * shaping_pretenst;
        let long = 27f32 * shaping_pretenst;
        let side_ofs = long * 2f32 / 3f32;
        let v = Vector3::new;
        let mut push = |alpha: Vector3<f32>, omega: Vector3<f32>| {
            let alpha_joint = fab.create_joint(Point3::from_vec(alpha));
            let omega_joint = fab.create_joint(Point3::from_vec(omega));
            let length = alpha.distance(omega);
            let interval = fab.create_interval(alpha_joint, omega_joint, PUSH_ROLE, length);
            (alpha_joint, omega_joint, interval)
        };
        let middle = push(v(0f32, -short / 2f32, 0f32), v(0f32, short / 2f32, 0f32));
        let left = push(v(-side_ofs, -short / 2f32, 0f32), v(-side_ofs, short / 2f32, 0f32));
        let right = push(v(side_ofs, -short / 2f32, 0f32), v(side_ofs, short / 2f32, 0f32));
        let z_offset = 1f32;
        let front = push(v(-long / 2f32, 0f32, -z_offset), v(long / 2f32, 0f32, -z_offset));
        let back = push(v(-long / 2f32, 0f32, z_offset), v(long / 2f32, 0f32, z_offset));
        let outward_ofs = long / 3f32;
        let outward_sep = 4f32;
        let top_left = push(v(-outward_ofs, outward_sep, -short / 2f32), v(-outward_ofs, outward_sep, short / 2f32));
        let bot_left = push(v(-outward_ofs, -outward_sep, -short / 2f32), v(-outward_ofs, -outward_sep, short / 2f32));
        let top_right = push(v(outward_ofs, outward_sep, -short / 2f32), v(outward_ofs, outward_sep, short / 2f32));
        let bot_right = push(v(outward_ofs, -outward_sep, -short / 2f32), v(outward_ofs, -outward_sep, short / 2f32));
        let mut pull = |hub: usize, spokes: &[usize]| {
            for spoke in spokes {
                let length = fab.joints[hub].location.distance(fab.joints[*spoke].location);
                fab.create_interval(hub, *spoke, PULL_ROLE, length);
            }
        };
        pull(middle.1, &[top_right.0, top_right.1, top_left.0, top_left.1]);
        pull(middle.0, &[bot_right.0, bot_right.1, bot_left.0, bot_left.1]);
        pull(left.0, &[bot_left.0, bot_left.1, front.0, back.0]);
        pull(right.0, &[bot_right.0, bot_right.1, front.1, back.1]);
        pull(left.1, &[top_left.0, top_left.1, front.0, back.0]);
        pull(right.1, &[top_right.0, top_right.1, front.1, back.1]);
        pull(top_left.0, &[front.0]);
        pull(top_left.1, &[back.0]);
        pull(bot_left.0, &[front.0]);
        pull(bot_left.1, &[back.0]);
        pull(top_right.0, &[front.1]);
        pull(top_right.1, &[back.1]);
        pull(bot_right.0, &[front.1]);
        pull(bot_right.1, &[back.1]);
        fab
    }
}
