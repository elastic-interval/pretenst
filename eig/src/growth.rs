use cgmath::MetricSpace;
use crate::fabric::{Fabric, UniqueId};
use crate::interval::Role::Pull;
use crate::tenscript::{BuildPhase, FabricPlan, ShapePhase, Spin};
use crate::tenscript::FaceName::Apos;
use crate::tenscript::TenscriptNode;
use crate::tenscript::TenscriptNode::{Branch, Grow, Mark};
use crate::tenscript::VulcanizeType::{Bowtie, Snelson};

#[allow(dead_code)]
#[derive(Clone)]
pub enum MarkAction {
    Join,
    ShapingDistance { length_factor: f32 },
    PretenstDistance { length_factor: f32 },
    Subtree { node: TenscriptNode },
}

#[derive(Clone, Debug)]
pub struct Bud {
    face_id: UniqueId,
    forward: String,
    scale_factor: f32,
    node: Option<TenscriptNode>,
}

#[derive(Clone, Debug)]
pub struct PostMark {
    face_id: UniqueId,
    mark_name: String,
}

#[derive(Debug)]
pub struct Shaper {
    interval: UniqueId,
    alpha_face: UniqueId,
    omega_face: UniqueId,
}

#[derive(Debug)]
pub struct Growth {
    pub plan: FabricPlan,
    pub pretenst_factor: f32,
    pub buds: Vec<Bud>,
    pub marks: Vec<PostMark>,
    pub shapers: Vec<Shaper>,
}

impl Growth {
    pub fn new(plan: FabricPlan) -> Self {
        Self {
            plan,
            pretenst_factor: 1.3,
            buds: vec![],
            marks: vec![],
            shapers: vec![],
        }
    }

    pub fn init(&mut self, fabric: &mut Fabric) {
        let (buds, marks) = self.use_node(fabric, None, None);
        self.buds = buds;
        self.marks = marks;
    }

    pub fn is_growing(&self) -> bool {
        !self.buds.is_empty()
    }

    pub fn growth_step(&mut self, fabric: &mut Fabric) {
        let buds = self.buds.clone();
        self.buds.clear();
        for bud in buds {
            let (new_buds, new_marks) = self.execute_bud(fabric, bud);
            self.buds.extend(new_buds);
            self.marks.extend(new_marks);
        }
    }

    pub fn needs_shaping(&self) -> bool {
        !self.marks.is_empty()
    }

    pub fn create_shapers(&mut self, fabric: &mut Fabric) {
        let ShapePhase { pull_together, .. } = &self.plan.shape_phase;
        for mark_name in pull_together {
            self.shapers.extend(self.attach_shapers(fabric, mark_name));
        }
        self.marks.clear();
    }

    pub fn complete_shapers(&mut self, fabric: &mut Fabric) {
        for shaper in &self.shapers {
            self.complete_shaper(fabric, shaper)
        }
        self.shapers.clear();
    }

    pub fn vulcanize(&self, fabric: &mut Fabric) -> bool {
        let FabricPlan { shape_phase: ShapePhase { vulcanize, .. }, .. } = self.plan;
        match vulcanize {
            Some(Bowtie) => {
                fabric.bow_tie();
                true
            }
            Some(Snelson) => {
                fabric.snelson();
                true
            }
            _ => false
        }
    }

    fn execute_bud(&self, fabric: &mut Fabric, Bud { face_id, forward, scale_factor, node }: Bud) -> (Vec<Bud>, Vec<PostMark>) {
        let face = fabric.face(face_id);
        let Some(next_twist_switch) = forward.chars().next() else { return (vec![], vec![]); };
        let mut buds = Vec::new();
        let mut marks = Vec::new();
        let spin = if next_twist_switch == 'X' { face.spin.opposite() } else { face.spin };
        let reduced: String = forward[1..].into();
        if reduced.is_empty() {
            let spin_node = node.map(|n| (spin, n));
            let (node_buds, node_marks) = self.use_node(fabric, spin_node, Some(face_id));
            buds.extend(node_buds);
            marks.extend(node_marks);
        } else {
            let [_, (_, a_pos_face_id)] = fabric.single_twist(spin, self.pretenst_factor, scale_factor, Some(face_id));
            buds.push(Bud {
                face_id: a_pos_face_id,
                forward: reduced,
                scale_factor,
                node,
            });
        };
        (buds, marks)
    }

    fn attach_shapers(&self, fabric: &mut Fabric, sought_mark_name: &str) -> Vec<Shaper> {
        let marks: Vec<_> = self.marks
            .iter()
            .filter(|PostMark { mark_name, .. }| sought_mark_name == *mark_name)
            .map(|PostMark { face_id, .. }| face_id)
            .collect();
        let mut shapers: Vec<Shaper> = vec![];
        match *marks.as_slice() {
            [alpha_id, omega_id] => {
                let (alpha, omega) = (fabric.face(*alpha_id).middle_joint(fabric), fabric.face(*omega_id).middle_joint(fabric));
                let interval = fabric.create_interval(alpha, omega, Pull, 0.3);
                shapers.push(Shaper { interval, alpha_face: *alpha_id, omega_face: *omega_id })
            }
            [_, _, _] => unimplemented!(),
            _ => panic!()
        }
        shapers
    }

    fn use_node(&self, fabric: &mut Fabric, spin_node: Option<(Spin, TenscriptNode)>, base_face_id: Option<UniqueId>) -> (Vec<Bud>, Vec<PostMark>) {
        let root = &spin_node.is_some();
        let (spin, node) = spin_node.unwrap_or({
            let BuildPhase { seed, node } = &self.plan.build_phase;
            let spin = seed.unwrap_or(Spin::Left);
            let root_node = node.clone().unwrap();
            (spin, root_node)
        });
        let mut buds: Vec<Bud> = vec![];
        let mut marks: Vec<PostMark> = vec![];
        match node {
            Grow { forward, scale_factor, branch, .. } => {
                let [_, (_, a_pos_face)] = fabric.single_twist(spin, self.pretenst_factor, scale_factor, base_face_id);
                let node = branch.map(|boxy| *boxy);
                buds.push(Bud {
                    face_id: a_pos_face,
                    forward,
                    scale_factor,
                    node,
                })
            }
            Branch { subtrees, .. } => {
                let needs_double = subtrees.iter().any(|node| {
                    matches!(node, Grow { face_name, .. }| Mark { face_name, .. } if *face_name != Apos)
                });
                if needs_double {
                    let faces = fabric.double_twist(spin, self.pretenst_factor, 1.0, base_face_id);
                    for (sought_face_name, face_id) in if *root { &faces } else { &faces[1..] } {
                        for subtree in &subtrees {
                            match subtree {
                                Grow { face_name, forward, scale_factor, branch }
                                if face_name == sought_face_name => {
                                    let node = branch.clone().map(|boxy| *boxy);
                                    buds.push(Bud {
                                        face_id: *face_id,
                                        forward: forward.clone(),
                                        scale_factor: *scale_factor,
                                        node,
                                    })
                                }
                                Mark { face_name, mark_name }
                                if face_name == sought_face_name => {
                                    marks.push(PostMark {
                                        face_id: *face_id,
                                        mark_name: mark_name.clone(),
                                    })
                                }
                                _ => {}
                            }
                        }
                    }
                } else {
                    let [_, (_, a_pos_face_id)] = fabric.single_twist(spin, self.pretenst_factor, 1.0, base_face_id);
                    for node in subtrees {
                        match node {
                            Mark { face_name, mark_name } if face_name == Apos => {
                                marks.push(PostMark {
                                    face_id: a_pos_face_id,
                                    mark_name,
                                });
                            }
                            _ => {}
                        }
                    }
                }
            }
            Mark { .. } => {
                panic!("Build cannot be a mark statement")
            }
        }
        (buds, marks)
    }

    fn complete_shaper(&self, fabric: &mut Fabric, Shaper { interval, alpha_face, omega_face }: &Shaper) {
        let (alpha, omega) = (fabric.face(*alpha_face), fabric.face(*omega_face));
        let (mut alpha_ends, omega_ends) = (alpha.radial_joints(fabric), omega.radial_joints(fabric));
        alpha_ends.reverse();
        let (mut alpha_points, omega_points) =(
            alpha_ends.map(|id| fabric.location(id)),
            omega_ends.map(|id| fabric.location(id))
        );
        let links = [(0, 0), (0, 1), (1, 1), (1, 2), (2, 2), (2, 0)];
        let (_, alpha_rotated) = (0..3)
            .map(|rotation| {
                let length: f32 = links
                    .map(|(a, b)| alpha_points[a].distance(omega_points[b]))
                    .iter()
                    .sum();
                alpha_points.rotate_right(1);
                let mut rotated = alpha_ends;
                rotated.rotate_right(rotation);
                (length, rotated)
            })
            .min_by(|(length_a, _), (length_b, _)| length_a.partial_cmp(length_b).unwrap())
            .unwrap();
        let scale = (alpha.scale + omega.scale) / 2.0;
        for (a, b) in links {
            fabric.create_interval(alpha_rotated[a], omega_ends[b], Pull, scale);
        }
        fabric.remove_interval(*interval);
        fabric.remove_face(*alpha_face);
        fabric.remove_face(*omega_face);
    }
}
