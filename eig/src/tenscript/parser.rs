use std::collections::HashSet;
use std::fmt::{Debug, Display, Formatter};

use crate::tenscript::error::Error;
use crate::tenscript::output::{FabricPlan, FaceName, Spin, SurfaceCharacter, TenscriptNode, VulcanizeType};
use crate::tenscript::parser::ErrorKind::{AlreadyDefined, BadCall, IllegalCall, IllegalRepetition, Mismatch, MultipleBranches, Unknown};
use crate::tenscript::expression;
use crate::tenscript::expression::Expression;

#[derive(Debug, Clone)]
pub struct ParseError {
    kind: ErrorKind,
}

impl Display for ParseError {
    fn fmt(&self, f: &mut Formatter<'_>) -> std::fmt::Result {
        Display::fmt(&self.kind, f)
    }
}

#[derive(Debug, Clone)]
pub enum ErrorKind {
    Mismatch { rule: &'static str, expression: Expression, expected: &'static str },
    BadCall { context: &'static str, expected: &'static str, expression: Expression },
    TypeError { expected: &'static str, expression: Expression },
    AlreadyDefined { property: &'static str, expression: Expression },
    IllegalRepetition { kind: &'static str, value: String },
    MultipleBranches,
    IllegalCall { context: &'static str, expression: Expression },
    Unknown,
}

impl Display for ErrorKind {
    fn fmt(&self, f: &mut Formatter<'_>) -> std::fmt::Result {
        Debug::fmt(self, f)
    }
}

pub fn parse(source: &str) -> Result<FabricPlan, Error> {
    let expression = &expression::parse(source)?;
    fabric_plan(expression)
        .map_err(|kind| Error::ParseError(ParseError { kind }))
}

macro_rules! expect_enum {
        ($value:expr, { $($name:pat => $enum_val:expr,)+ }) => {
            {
                let expected = stringify!($($name)|+);
                let $crate::tenscript::expression::Expression::Atom(ref name) = $value else {
                    return Err($crate::tenscript::parser::ErrorKind::TypeError { expected, expression: $value.clone() })
                };
                match name.as_str() {
                    $(
                        $name => $enum_val,
                    )+
                    _ => return Err($crate::tenscript::parser::ErrorKind::TypeError { expected, expression: $value.clone() })
                }
            }
        }
    }

struct Call<'a> {
    head: &'a str,
    tail: &'a [Expression],
}

fn expect_call<'a>(rule: &'static str, expression: &'a Expression) -> Result<Call<'a>, ErrorKind> {
    let Expression::List(ref terms) = expression else {
        return Err(Mismatch { rule, expected: "( .. )", expression: expression.clone() });
    };
    let [ref head, ref tail @ ..] = terms[..] else {
        return Err(Mismatch { rule, expected: "(<head> ..)", expression: expression.clone() });
    };
    let Expression::Ident(ref head) = head else {
        return Err(Mismatch { rule, expected: "(<head:ident> ..)", expression: expression.clone() });
    };
    Ok(Call { head, tail })
}

fn fabric_plan(expression: &Expression) -> Result<FabricPlan, ErrorKind> {
    let Call { head: "fabric", tail } = expect_call("fabric", expression)? else {
        return Err(Mismatch { rule: "fabric", expected: "(fabric ..)", expression: expression.clone() });
    };

    let mut plan = FabricPlan::default();
    for expression in tail {
        let Call { head, tail } = expect_call("fabric", expression)?;
        match head {
            "surface" => {
                if plan.surface.is_some() {
                    return Err(AlreadyDefined { property: "surface", expression: expression.clone() });
                };
                let [ value] = tail else {
                    return Err(BadCall { context: "fabric plan", expected: "(surface <value>)", expression: expression.clone() });
                };
                let surface = expect_enum!(value, {
                        "bouncy" => SurfaceCharacter::Bouncy,
                        "frozen" => SurfaceCharacter::Frozen,
                        "sticky" => SurfaceCharacter::Sticky,
                    });
                plan.surface = Some(surface);
            }
            "name" => {
                if plan.name.is_some() {
                    return Err(AlreadyDefined { property: "name", expression: expression.clone() });
                };
                let &[Expression::String(ref name)] = tail else {
                    return Err(BadCall { context: "fabric plan", expected: "(name <string>)", expression: expression.clone() });
                };
                plan.name = Some(name.clone());
            }
            "features" => {
                features(&mut plan, tail)?;
            }
            "build" => {
                build(&mut plan, tail)?;
            }
            "shape" => {
                shape(&mut plan, tail)?;
            }
            "pretense" => { todo!() }
            _ => return Err(IllegalCall { context: "fabric plan", expression: expression.clone() })
        }
    }
    Ok(plan)
}

fn build(FabricPlan { build_phase, .. }: &mut FabricPlan, expressions: &[Expression]) -> Result<(), ErrorKind> {
    for expression in expressions {
        let Call { head, tail } = expect_call("build", expression)?;
        match head {
            "seed" => {
                if build_phase.seed.is_some() {
                    return Err(AlreadyDefined { property: "seed", expression: expression.clone() });
                };
                let [ value] = tail else {
                    return Err(BadCall { context: "build phase", expected: "(seed <value>)", expression: expression.clone() });
                };
                let seed_type = expect_enum!(value, {
                        "left" => Spin::Left,
                        "right" => Spin::Right,
                    });
                build_phase.seed = Some(seed_type);
            }
            "branch" | "grow" | "mark" => {
                if build_phase.node.is_some() {
                    return Err(AlreadyDefined { property: "growth", expression: expression.clone() });
                };
                build_phase.node = Some(tenscript_node(expression)?);
            }
            _ => return Err(IllegalCall { context: "build phase", expression: expression.clone() })
        }
    }
    Ok(())
}

fn shape(FabricPlan { shape_phase, .. }: &mut FabricPlan, expressions: &[Expression]) -> Result<(), ErrorKind> {
    for expression in expressions {
        let Call { head, tail } = expect_call("shape", expression)?;
        match head {
            "vulcanize" => {
                if shape_phase.vulcanize.is_some() {
                    return Err(AlreadyDefined { property: "vulcanize", expression: expression.clone() });
                };
                let [ value] = tail else {
                    return Err(BadCall { context: "shape phase", expected: "(vulcanize <value>)", expression: expression.clone() });
                };
                let vulcanize_type = expect_enum!(value, {
                        "bowtie" => VulcanizeType::Bowtie,
                        "snelson" => VulcanizeType::Snelson,
                    });
                shape_phase.vulcanize = Some(vulcanize_type);
            }
            "pull-together" => {
                for mark in tail {
                    let Expression::Atom(ref mark_name) = mark else {
                        return Err(BadCall { context: "shape phase", expected: "(pull-together <atom>+)", expression: expression.clone() });
                    };
                    shape_phase.pull_together.push(mark_name.clone())
                }
            }
            _ => return Err(IllegalCall { context: "shape phase", expression: expression.clone() })
        }
    }
    Ok(())
}

fn tenscript_node(expression: &Expression) -> Result<TenscriptNode, ErrorKind> {
    let Call { head, tail } = expect_call("tenscript_node", expression)?;
    match head {
        "grow" => {
            let &[
            ref face_atom @ Expression::Atom(ref face_name),
            Expression::Integer(forward_count), // TODO: must check if this is a string and then use it instead, checking chars
            ref post_growth @ ..,
            ] = tail else {
                return Err(Mismatch { rule: "tenscript_node", expected: "face name and forward count", expression: expression.clone() });
            };
            let face_name = expect_face_name(face_atom, face_name)?;
            let forward = "X".repeat(forward_count as usize);
            let mut branch = None;
            let mut scale_factor = 1f32;
            for post_growth_op in post_growth {
                let Call { head: op_head, tail: op_tail } = expect_call("tenscript_node", post_growth_op)?;
                match op_head {
                    "branch" => {
                        if branch.is_some() {
                            return Err(MultipleBranches);
                        }
                        branch = Some(Box::new(tenscript_node(post_growth_op)?));
                    }
                    "scale" => {
                        let &[Expression::Percent(percent)] = op_tail else {
                            return Err(BadCall { context: "tenscript node", expected: "(scale <percent>)", expression: expression.clone() });
                        };
                        scale_factor = percent / 100.0;
                    }
                    _ => return Err(Mismatch { rule: "tenscript_node", expected: "mark | branch", expression: expression.clone() }),
                }
            }
            Ok(TenscriptNode::Grow { face_name, scale_factor, forward, branch })
        }
        "mark" => {
            let [ face_expression @ Expression::Atom(ref face_name_atom), Expression::Atom(ref mark_name) ] = tail else {
                return Err(Mismatch { rule: "tenscript_node", expected: "(mark <face_name> <name>)", expression: expression.clone() });
            };
            let face_name = expect_face_name(face_expression, face_name_atom)?;
            Ok(TenscriptNode::Mark { face_name, mark_name: mark_name.clone() })
        }
        "branch" => {
            let mut subtrees = Vec::new();
            let mut existing_face_names = HashSet::new();
            for subexpression in tail {
                let Call { head, .. } = expect_call("tenscript_node", subexpression)?;
                if head != "grow" && head != "mark" {
                    return Err(Mismatch { rule: "tenscript_node", expected: "(grow ..) or (mark ..) under (branch ..)", expression: subexpression.clone() });
                }
                let subtree = tenscript_node(subexpression)?;
                match subtree {
                    TenscriptNode::Grow { face_name, .. } => {
                        if existing_face_names.contains(&face_name) {
                            return Err(IllegalRepetition { kind: "face name", value: face_name.to_string() });
                        }
                        existing_face_names.insert(face_name);
                    }
                    TenscriptNode::Mark { face_name, .. } => {
                        if existing_face_names.contains(&face_name) {
                            return Err(IllegalRepetition { kind: "face name", value: face_name.to_string() });
                        }
                        existing_face_names.insert(face_name);
                    }
                    _ => {
                        return Err(Unknown);
                    }
                }
                subtrees.push(subtree);
            }
            Ok(TenscriptNode::Branch { subtrees })
        }
        _ => Err(Mismatch { rule: "tenscript_node", expected: "grow | branch", expression: expression.clone() }),
    }
}

fn expect_face_name(expression: &Expression, face_name: &str) -> Result<FaceName, ErrorKind> {
    Ok(match face_name {
        "A+" => FaceName::Apos,
        "B+" => FaceName::Bpos,
        "C+" => FaceName::Cpos,
        "D+" => FaceName::Dpos,
        "A-" => FaceName::Aneg,
        "B-" => FaceName::Bneg,
        "C-" => FaceName::Cneg,
        "D-" => FaceName::Dneg,
        _ => return Err(Mismatch { rule: "tenscript_node", expected: "unrecognized face name", expression: expression.clone() }),
    })
}

fn features(FabricPlan { features, .. }: &mut FabricPlan, expressions: &[Expression]) -> Result<(), ErrorKind> {
    let mut feature_defined = HashSet::new();
    for expression in expressions {
        let Call { head: key, tail: &[ref val] } = expect_call("features", expression)? else {
            return Err(BadCall { context: "features", expected: "(<feature-name> <value>)", expression: expression.clone() });
        };
        if feature_defined.contains(key) {
            return Err(IllegalRepetition { kind: "feature name", value: key.to_string() });
        }
        feature_defined.insert(key.to_string());
        match key {
            "iterations-per-frame" => {
                let Expression::Integer(value) = val else {
                    return Err(Mismatch { rule: "features", expected: "(iterations-per-frame <integer>)", expression: expression.clone() });
                };
                features.iterations_per_frame = Some(*value as u32);
            }
            "visual-strain" => {
                let Expression::Percent(value) = val else {
                    return Err(Mismatch { rule: "features", expected: "(visual-strain <percent>)", expression: expression.clone() });
                };
                features.visual_strain = Some(*value);
            }
            "gravity" => {
                let Expression::Percent(value) = val else {
                    return Err(Mismatch { rule: "features", expected: "(gravity <percent>)", expression: expression.clone() });
                };
                features.gravity = Some(*value);
            }
            "pretenst-factor" => {
                let Expression::Percent(value) = val else {
                    return Err(Mismatch { rule: "features", expected: "(pretenst-factor <percent>)", expression: expression.clone() });
                };
                features.pretenst_factor = Some(*value);
            }
            "stiffness-factor" => {
                let Expression::Percent(value) = val else {
                    return Err(Mismatch { rule: "features", expected: "(stiffness-factor <percent>)", expression: expression.clone() });
                };
                features.stiffness_factor = Some(*value);
            }
            "push-over-pull" => {
                let Expression::Percent(value) = val else {
                    return Err(Mismatch { rule: "features", expected: "(push-over-pull <percent>)", expression: expression.clone() });
                };
                features.push_over_pull = Some(*value);
            }
            "viscosity" => {
                let Expression::Percent(value) = val else {
                    return Err(Mismatch { rule: "features", expected: "(viscosity <percent>)", expression: expression.clone() });
                };
                features.viscosity = Some(*value);
            }
            "shaping-pretenst-factor" => {
                let Expression::Percent(value) = val else {
                    return Err(Mismatch { rule: "features", expected: "(shaping-pretenst-factor <percent>)", expression: expression.clone() });
                };
                features.shaping_pretenst_factor = Some(*value);
            }
            "shaping-viscosity" => {
                let Expression::Percent(value) = val else {
                    return Err(Mismatch { rule: "features", expected: "(shaping-viscosity <percent>)", expression: expression.clone() });
                };
                features.shaping_viscosity = Some(*value);
            }
            "shaping-stiffness-factor" => {
                let Expression::Percent(value) = val else {
                    return Err(Mismatch { rule: "features", expected: "(shaping-stiffness-factor <percent>)", expression: expression.clone() });
                };
                features.shaping_stiffness_factor = Some(*value);
            }
            "antigravity" => {
                let Expression::Percent(value) = val else {
                    return Err(Mismatch { rule: "features", expected: "(antigravity <percent>)", expression: expression.clone() });
                };
                features.antigravity = Some(*value);
            }
            "interval-countdown" => {
                let Expression::Percent(value) = val else {
                    return Err(Mismatch { rule: "features", expected: "(interval-countdown <percent>)", expression: expression.clone() });
                };
                features.interval_countdown = Some(*value);
            }
            "pretensing-countdown" => {
                let Expression::Percent(value) = val else {
                    return Err(Mismatch { rule: "features", expected: "(pretensing-countdown <percent>)", expression: expression.clone() });
                };
                features.pretensing_countdown = Some(*value);
            }
            _ => return Err(BadCall { context: "features", expected: "legal feature name", expression: expression.clone() }),
        }
    }
    Ok(())
}

