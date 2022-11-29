use cgmath::{InnerSpace, Vector3};
use crate::fabric::{Fabric, UniqueId};
use rand::prelude::*;
use crate::role::Role;

struct KleinFabric {
    fabric: Fabric,
    random: ThreadRng,
}

impl KleinFabric {
    fn new() -> KleinFabric {
        KleinFabric { fabric: Fabric::default(), random: thread_rng() }
    }

    fn random_joint(&mut self) {
        let mut v = Vector3::new(1.0, 1.0, 1.0);
        while v.magnitude2() > 1.0 {
            v.x = self.coord();
            v.y = self.coord();
            v.z = self.coord();
        }
        self.fabric.create_joint(v.x, v.y, v.z);
    }

    fn push(&mut self, alpha: isize, omega: isize) -> UniqueId {
        self.fabric.create_interval(alpha as usize, omega as usize, PUSH, 1.0)
    }

    fn pull(&mut self, alpha: isize, omega: isize) -> UniqueId {
        self.fabric.create_interval(alpha as usize, omega as usize, PULL, 1.0)
    }

    fn coord(&mut self) -> f32 {
        self.random.gen_range(-1000..1000) as f32 / 1000.0
    }
}

pub fn generate_klein(width: usize, height: usize, shift: usize) -> Fabric {
    let (w, h, sh) = ((width * 2) as isize, (height * 2 + 1) as isize, shift as isize);
    let mut kf = KleinFabric::new();
    let klein_joint = |x: isize, y: isize| {
        let flip = (y / h) % 2 == 1;
        let x_rel = if flip { sh - 1 - x } else { x };
        let x_mod = (w * 2 + x_rel) % w;
        let y_mod = y % h;
        (y_mod * w + x_mod) / 2
    };
    let joint_count = w * h / 2;
    for _ in 0..joint_count {
        kf.random_joint();
    }
    for y in 0..h {
        for x in 0..w {
            if (x + y) % 2 == 0 {
                let (a, b, c, d, e, f) = (
                    klein_joint(x, y),
                    klein_joint(x - 1, y + 1),
                    klein_joint(x + 1, y + 1),
                    klein_joint(x, y + 2),
                    klein_joint(x - 1, y + 3),
                    klein_joint(x + 1, y + 3),
                );
                kf.pull(a, b);
                kf.pull(a, c);
                kf.pull(a, d);
                kf.push(a, e);
                kf.push(a, f);
                kf.push(e, f);
                // createFace(a, b, d)
                // createFace(a, c, d)
            }
        }
    }
    kf.fabric
}

const PUSH: &Role = &Role {
    tag: "push",
    push: true,
    reference_length: 8.0,
    stiffness: 1f32,
    density: 1f32,
};

const PULL: &Role = &Role {
    tag: "pull",
    push: false,
    reference_length: 1f32,
    stiffness: 0.1f32,
    density: 1f32,
};

