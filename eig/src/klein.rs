use cgmath::{EuclideanSpace, InnerSpace, Point3, Vector3};
use crate::fabric::{Fabric, UniqueId};
use rand::prelude::*;
use crate::interval::Role::{Pull, Push};
use crate::interval::Material;

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
        self.fabric.create_joint(Point3::from_vec(v));
    }

    fn push(&mut self, alpha: isize, omega: isize) -> UniqueId {
        self.fabric.create_interval(alpha as usize, omega as usize, Push { canonical_length: 8.0 }, Material { stiffness: 1.0, mass: 1.0 }, Some(1.0))
    }

    fn pull(&mut self, alpha: isize, omega: isize) -> UniqueId {
        self.fabric.create_interval(alpha as usize, omega as usize, Pull { canonical_length: 1.0 }, Material { stiffness: 0.1, mass: 0.1 }, Some(1.0))
    }

    fn coord(&mut self) -> f32 {
        self.random.gen_range(-1000..1000) as f32 / 1000.0
    }
}

pub fn generate_klein(width: usize, height: usize, shift: usize) -> Fabric {
    let (w, h, sh) = ((width * 2) as isize, (height * 2 + 1) as isize, shift as isize);
    let mut kf = KleinFabric::new();
    let joint = |x: isize, y: isize| {
        let flip = (y / h) % 2 == 1;
        let x_rel = if flip { sh - 1 - x } else { x };
        let x_mod = (w * 2 + x_rel) % w;
        let y_mod = y % h;
        (y_mod * w + x_mod) / 2
    };
    for _ in 0..w * h / 2 {
        kf.random_joint();
    }
    for y in 0..h {
        for x in 0..w {
            if (x + y) % 2 == 0 {
                let (a, b, c, d, e, f) = (
                    joint(x, y),
                    joint(x - 1, y + 1),
                    joint(x + 1, y + 1),
                    joint(x, y + 2),
                    joint(x - 1, y + 3),
                    joint(x + 1, y + 3),
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
