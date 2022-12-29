use crate::fabric::{Fabric, UniqueId};
use crate::role::PULL_TOGETHER;
use crate::tenscript::{BuildPhase, FabricPlan, Spin};

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
pub struct Bud<'a> {
    face_id: UniqueId,
    forward: String,
    scale: f32,
    node: &'a Option<Box<TenscriptNode>>,
}

#[derive(Clone, Debug)]
pub struct PostMark<'a> {
    face_id: UniqueId,
    mark_name: &'a str,
}

pub struct Growth<'a> {
    pub plan: FabricPlan,
    pub buds: Vec<Bud<'a>>,
    pub marks: Vec<PostMark<'a>>,
}

impl<'a> Growth<'a> {
    pub fn new(plan: FabricPlan) -> Self {
        Self {
            plan,
            buds: vec![],
            marks: vec![],
        }
    }

    pub fn init(&'a mut self, fabric: &mut Fabric) {
        self.use_node(fabric, None);
    }

    pub fn iterate_on(&'a mut self, fabric: &mut Fabric) {
        let mut buds = Vec::new();
        let mut marks = Vec::new();
        for bud in &self.buds {
            let (new_buds, new_marks) = self.execute_bud(fabric, bud);
            buds.extend(new_buds);
            marks.extend(new_marks);
        }
        dbg!(buds);
        dbg!(marks);
        // self.buds = buds;
        // self.marks.extend(marks);
    }

    pub fn execute_bud(&'a self, fabric: &mut Fabric, Bud { face_id, forward, scale, node }: &Bud<'a>) -> (Vec<Bud>, Vec<PostMark>) {
        let face = fabric.find_face(*face_id);
        let Some(next_twist_switch) = forward.chars().next() else { return (vec![], vec![]); };
        let mut buds = Vec::new();
        let mut marks = Vec::new();
        let spin = if next_twist_switch == 'X' { face.spin.opposite() } else { face.spin };
        let reduced: String = forward[1..].into();
        if reduced.is_empty() {
            let spin_node = node.as_ref().map(|n| (spin, n.as_ref()));
            let (node_buds, node_marks) = self.use_node(fabric, spin_node);
            buds.extend(node_buds);
            marks.extend(node_marks);
        } else {
            let [_, (_, face_id)] = fabric.single_twist(spin, face.scale * scale, Some(*face_id));
            buds.push(Bud {
                face_id,
                forward: reduced,
                scale: *scale,
                node,
            });
        };
        (buds, marks)
    }

    pub fn execute_post_mark(&mut self, fabric: &mut Fabric, sought_mark_name: String) {
        let marks: Vec<_> = self.marks
            .iter()
            .filter(|PostMark { mark_name, .. }| sought_mark_name == *mark_name)
            .map(|PostMark { face_id, .. }| fabric.find_face(*face_id))
            .collect();
        match *marks.as_slice() {
            [alpha, omega] => {
                fabric.create_interval(alpha.middle_joint(fabric), omega.middle_joint(fabric), PULL_TOGETHER, 1.0);
            }
            [_, _, _] => unimplemented!(),
            _ => {}
        }
    }

    fn use_node(&'a self, fabric: &mut Fabric, spin_node: Option<(Spin, &'a TenscriptNode)>) -> (Vec<Bud>, Vec<PostMark>) {
        let (spin, node) = spin_node.unwrap_or({
            let BuildPhase { seed, node } = &self.plan.build_phase;
            let spin = seed.unwrap_or(Spin::Left);
            (spin, node.as_ref().unwrap())
        });
        let mut buds: Vec<Bud> = vec![];
        let mut marks: Vec<PostMark> = vec![];
        match node {
            Grow { forward, scale, branch, .. } => {
                let [_, (_, a_pos_face)] = fabric.single_twist(spin, 1.0, None);
                buds.push(Bud {
                    face_id: a_pos_face,
                    forward: forward.clone(),
                    scale: *scale,
                    node: branch,
                })
            }
            Branch { subtrees, .. } => {
                let faces = fabric.double_twist(spin, 1.0, None);
                for (sought_face_name, face_id) in if spin_node.is_some() { &faces[1..] } else { &faces } {
                    for subtree in subtrees {
                        match subtree {
                            Grow { face_name, forward, scale, branch }
                            if face_name == sought_face_name => {
                                buds.push(Bud {
                                    face_id: *face_id,
                                    forward: forward.clone(),
                                    scale: *scale,
                                    node: branch,
                                })
                            }
                            Mark { face_name, mark_name }
                            if face_name == sought_face_name => {
                                marks.push(PostMark {
                                    face_id: *face_id,
                                    mark_name,
                                })
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

