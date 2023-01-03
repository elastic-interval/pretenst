use crate::fabric::{Fabric, UniqueId};
use crate::interval::Role::Pull;
use crate::tenscript::{BuildPhase, FabricPlan, ShapePhase, Spin};
use crate::tenscript::FaceName::Apos;

use crate::tenscript::TenscriptNode;
use crate::tenscript::TenscriptNode::{Branch, Grow, Mark};

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
pub struct Growth {
    pub plan: FabricPlan,
    pub buds: Vec<Bud>,
    pub marks: Vec<PostMark>,
}

impl Growth {
    pub fn new(plan: FabricPlan) -> Self {
        Self {
            plan,
            buds: vec![],
            marks: vec![],
        }
    }

    pub fn iterate_on(&mut self, fabric: &mut Fabric) -> bool {
        let mut buds = Vec::new();
        let mut marks = Vec::new();
        if fabric.joints.is_empty() {
            let (new_buds, new_marks) = self.use_node(fabric, None, None);
            buds.extend(new_buds);
            marks.extend(new_marks);
        } else {
            for bud in &self.buds {
                let (new_buds, new_marks) = self.execute_bud(fabric, bud);
                buds.extend(new_buds);
                marks.extend(new_marks);
            }
        }
        self.buds = buds;
        self.marks.extend(marks);
        if !self.buds.is_empty() {
            return false;
        }
        if !self.marks.is_empty() {
            let ShapePhase { pull_together, .. } = &self.plan.shape_phase;
            for mark_name in pull_together {
                self.execute_post_mark(fabric, mark_name);
            }
            return false;
        }
        true
    }

    pub fn execute_bud(&self, fabric: &mut Fabric, Bud { face_id, forward, scale_factor, node }: &Bud) -> (Vec<Bud>, Vec<PostMark>) {
        let face = fabric.find_face(*face_id);
        let Some(next_twist_switch) = forward.chars().next() else { return (vec![], vec![]); };
        let mut buds = Vec::new();
        let mut marks = Vec::new();
        let spin = if next_twist_switch == 'X' { face.spin.opposite() } else { face.spin };
        let reduced: String = forward[1..].into();
        if reduced.is_empty() {
            let spin_node = node.clone().map(|n| (spin, n));
            let (node_buds, node_marks) = self.use_node(fabric, spin_node, Some(*face_id));
            buds.extend(node_buds);
            marks.extend(node_marks);
        } else {
            let [_, (_, a_pos_face_id)] = fabric.single_twist(spin, *scale_factor, Some(*face_id));
            buds.push(Bud {
                face_id: a_pos_face_id,
                forward: reduced,
                scale_factor: *scale_factor,
                node: node.clone(),
            });
        };
        (buds, marks)
    }

    pub fn execute_post_mark(&self, fabric: &mut Fabric, sought_mark_name: &str) {
        let marks: Vec<_> = self.marks
            .iter()
            .filter(|PostMark { mark_name, .. }| sought_mark_name == *mark_name)
            .map(|PostMark { face_id, .. }| fabric.find_face(*face_id))
            .collect();
        match *marks.as_slice() {
            [alpha, omega] => {
                fabric.create_interval(alpha.middle_joint(fabric), omega.middle_joint(fabric), Pull, 1.0);
            }
            [_, _, _] => unimplemented!(),
            _ => {}
        }
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
                let [_, (_, a_pos_face)] = fabric.single_twist(spin, scale_factor, base_face_id);
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
                    let faces = fabric.double_twist(spin, 1.0, base_face_id);
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
                    let [_, (_, a_pos_face_id)] = fabric.single_twist(spin, 1.0, base_face_id);
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
}

/*
export function rotateForBestRing(instance: FabricInstance, alpha: ITwistFace, omega: ITwistFace): void {
    const alphaEnds = [...alpha.ends].reverse()
    const omegaEnds = omega.ends
    const ringLengths: number[] = []
    for (let rotation = 0; rotation < alphaEnds.length; rotation++) {
        let ringLength = 0
        for (let walk = 0; walk < alphaEnds.length; walk++) {
            const rotatedWalk = (walk + rotation) % alphaEnds.length
            ringLength += instance.jointDistance(alphaEnds[walk], omegaEnds[rotatedWalk])
            ringLength += instance.jointDistance(omegaEnds[rotatedWalk], alphaEnds[(walk + 1) % alphaEnds.length])
        }
        ringLengths.push(ringLength)
    }
    let bestRotation = 0
    let minLength = ringLengths[bestRotation]
    ringLengths.forEach((ringLength, index) => {
        if (ringLength < minLength) {
            bestRotation = index
            minLength = ringLength
        }
    })
    if (bestRotation > 0) {
        omega.ends = omega.ends.map(({}, index) => omega.ends[(index + bestRotation) % omega.ends.length])
    }
}

 */