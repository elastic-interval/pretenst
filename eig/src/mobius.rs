use std::f32::consts::PI;
use cgmath::{EuclideanSpace, InnerSpace, Point3, vec3, Vector3};
use crate::fabric::Fabric;
use crate::interval::Role::{Pull, Push};

struct MobiusFabric {
    fabric: Fabric,
}

impl MobiusFabric {
    fn default() -> MobiusFabric { MobiusFabric { fabric: Fabric::default() } }
}

pub fn generate_mobius(segments: usize) -> Fabric {
    let mut mf = MobiusFabric::default();
    let joint_count = segments * 2 + 1;
    let radius = joint_count as f32 * 0.07;
    let location = |bottom: bool, angle: f32| {
        let major = vec3(angle.cos() * radius, 0.0, angle.sin() * radius);
        let outwards = major.normalize();
        let up = Vector3::unit_y();
        let ray = (outwards * (angle / 2.0).sin()) + (up * (angle / 2.0).cos());
        let minor = ray * (if bottom { -0.5 } else { 0.5 });
        Point3::from_vec(major + minor)
    };
    for joint_index in 0..joint_count {
        let angle = joint_index as f32 / joint_count as f32 * PI * 2.0;
        mf.fabric.create_joint(location(joint_index % 2 == 0, angle));
    }
    for joint_index in 0..joint_count {
        let joint = |offset: usize| (joint_index * 2 + offset) % joint_count;
        mf.fabric.create_interval(joint(0), joint(2), Pull { canonical_length: 0.4 }, 1.0);
        mf.fabric.create_interval(joint(0), joint(1), Pull { canonical_length: 1.0 }, 1.0);
        mf.fabric.create_interval(joint(0), joint(3), Push { canonical_length: 3.0 }, 1.0);
        // mf.fabric.create_face(joint(0), joint(1), joint(2))
    }
    mf.fabric
}
