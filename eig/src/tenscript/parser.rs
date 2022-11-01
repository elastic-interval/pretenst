use std::collections::HashSet;
use std::fmt::{Debug, Display, Formatter};
use std::iter::repeat;

use crate::tenscript::error::Error;
use crate::tenscript::output::{FabricPlan, FaceName, Mark, Spin, SurfaceCharacter, TenscriptNode, VulcanizeType};
use crate::tenscript::parser::ErrorKind::{AlreadyDefined, BadCall, IllegalCall, IllegalRepetition, Mismatch, MultipleBranches, Unknown};
use crate::tenscript::sexp;
use crate::tenscript::sexp::Sexp;

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
    Mismatch { rule: &'static str, sexp: Sexp, expected: &'static str },
    BadCall { context: &'static str, expected: &'static str, sexp: Sexp },
    TypeError { expected: &'static str, sexp: Sexp },
    AlreadyDefined { property: &'static str, sexp: Sexp },
    IllegalRepetition { kind: &'static str, value: String },
    MultipleBranches,
    IllegalCall { context: &'static str, sexp: Sexp },
    Unknown,
}

impl Display for ErrorKind {
    fn fmt(&self, f: &mut Formatter<'_>) -> std::fmt::Result {
        Debug::fmt(self, f)
    }
}

pub fn parse(source: &str) -> Result<FabricPlan, Error> {
    let sexp = &sexp::parse(source)?;
    fabric_plan(sexp)
        .map_err(|kind| Error::ParseError(ParseError { kind }))
}

macro_rules! expect_enum {
        ($value:expr, { $($name:pat => $enum_val:expr,)+ }) => {
            {
                let expected = stringify!($($name)|+);
                let $crate::tenscript::sexp::Sexp::Atom(ref name) = $value else {
                    return Err($crate::tenscript::parser::ErrorKind::TypeError { expected, sexp: $value.clone() })
                };
                match name.as_str() {
                    $(
                        $name => $enum_val,
                    )+
                    _ => return Err($crate::tenscript::parser::ErrorKind::TypeError { expected, sexp: $value.clone() })
                }
            }
        }
    }

struct Call<'a> {
    head: &'a str,
    tail: &'a [Sexp],
}


fn expect_call<'a>(rule: &'static str, sexp: &'a Sexp) -> Result<Call<'a>, ErrorKind> {
    let Sexp::List(ref terms) = sexp else {
        return Err(Mismatch { rule, expected: "( .. )", sexp: sexp.clone() });
    };
    let [ref head, ref tail @ ..] = terms[..] else {
        return Err(Mismatch { rule, expected: "(<head> ..)", sexp: sexp.clone() });
    };
    let Sexp::Ident(ref head) = head else {
        return Err(Mismatch { rule, expected: "(<head:ident> ..)", sexp: sexp.clone() });
    };
    Ok(Call {
        head,
        tail,
    })
}

fn fabric_plan(sexp: &Sexp) -> Result<FabricPlan, ErrorKind> {
    let Call { head: "fabric", tail } = expect_call("fabric", sexp)? else {
        return Err(Mismatch { rule: "fabric", expected: "(fabric ..)", sexp: sexp.clone() });
    };

    let mut fabric = FabricPlan::default();
    for sexp in tail {
        let Call { head, tail } = expect_call("fabric", sexp)?;
        match head {
            "scale" => {
                if fabric.scale.is_some() {
                    return Err(AlreadyDefined { property: "scale", sexp: sexp.clone() });
                };
                let &[Sexp::Percent(scale)] = tail else {
                    return Err(BadCall { context: "fabric plan", expected: "(scale <percent>)", sexp: sexp.clone() });
                };
                fabric.scale = Some(scale / 100.0);
            }
            "surface" => {
                if fabric.surface.is_some() {
                    return Err(AlreadyDefined { property: "surface", sexp: sexp.clone() });
                };
                let &[ref value] = tail else {
                    return Err(BadCall { context: "fabric plan", expected: "(surface <value>)", sexp: sexp.clone() });
                };
                let surface = expect_enum!(value, {
                        "bouncy" => SurfaceCharacter::Bouncy,
                        "frozen" => SurfaceCharacter::Frozen,
                        "sticky" => SurfaceCharacter::Sticky,
                    });
                fabric.surface = Some(surface);
            }
            "name" => {
                if fabric.name.is_some() {
                    return Err(AlreadyDefined { property: "name", sexp: sexp.clone() });
                };
                let &[Sexp::String(ref name)] = tail else {
                    return Err(BadCall { context: "fabric plan", expected: "(name <string>)", sexp: sexp.clone() });
                };
                fabric.name = Some(name.clone());
            }
            "features" => {
                features(&mut fabric, tail)?;
            }
            "build" => {
                build(&mut fabric, tail)?;
            }
            "shape" => { todo!() }
            "pretense" => { todo!() }
            _ => return Err(IllegalCall { context: "fabric plan", sexp: sexp.clone() })
        }
    }
    Ok(fabric)
}

fn build(FabricPlan { build_phase, .. }: &mut FabricPlan, sexps: &[Sexp]) -> Result<(), ErrorKind> {
    for sexp in sexps {
        let Call { head, tail } = expect_call("build", sexp)?;
        match head {
            "seed" => {
                if build_phase.seed.is_some() {
                    return Err(AlreadyDefined { property: "seed", sexp: sexp.clone() });
                };
                let &[ref value] = tail else {
                    return Err(BadCall { context: "build phase", expected: "(seed <value>)", sexp: sexp.clone() });
                };
                let seed_type = expect_enum!(value, {
                        "left" => Spin::Left,
                        "left-right" => Spin::LeftRight,
                        "right" => Spin::Right,
                        "right-left" => Spin::RightLeft,
                    });
                build_phase.seed = Some(seed_type);
            }
            "vulcanize" => {
                if build_phase.vulcanize.is_some() {
                    return Err(AlreadyDefined { property: "vulcanize", sexp: sexp.clone() });
                };

                let &[ref value] = tail else {
                    return Err(BadCall { context: "build phase", expected: "(vulcanize <value>)", sexp: sexp.clone() });
                };
                let vulcanize_type = expect_enum!(value, {
                        "bowtie" => VulcanizeType::Bowtie,
                        "snelson" => VulcanizeType::Snelson,
                    });
                build_phase.vulcanize = Some(vulcanize_type);
            }
            "scale" => {
                if build_phase.scale.is_some() {
                    return Err(AlreadyDefined { property: "scale", sexp: sexp.clone() });
                };
                let &[Sexp::Percent(value)] = tail else {
                    return Err(BadCall { context: "build phase", expected: "(scale <percent>)", sexp: sexp.clone() });
                };
                build_phase.scale = Some(value);
            }
            "branch" | "grow" => {
                if build_phase.growth.is_some() {
                    return Err(AlreadyDefined { property: "growth", sexp: sexp.clone() });
                };
                build_phase.growth = Some(tenscript_node(sexp)?);
            }
            _ => return Err(IllegalCall { context: "build phase", sexp: sexp.clone() })
        }
    }
    Ok(())
}

fn tenscript_node(sexp: &Sexp) -> Result<TenscriptNode, ErrorKind> {
    let Call { head, tail } = expect_call("tenscript_node", sexp)?;
    match head {
        "grow" => {
            let &[
            ref face_atom @ Sexp::Atom(ref face_name),
            Sexp::Integer(forward_count),
            ref post_growth @ ..,
            ] = tail else {
                return Err(Mismatch { rule: "tenscript_node", expected: "face name and forward count", sexp: sexp.clone() });
            };
            let face = expect_face_name(face_atom, face_name)?;
            let forward = repeat("X").take(forward_count as usize).collect();
            let mut marks = Vec::new();
            let mut branch = None;
            for post_growth_op in post_growth {
                let Call { head: op_head, tail: op_tail } = expect_call("tenscript_node", post_growth_op)?;
                match op_head {
                    "mark" => {
                        let [ face_sexp @ Sexp::Atom(face_name), Sexp::Atom(ref name) ] = op_tail else {
                            return Err(Mismatch { rule: "tenscript_node", expected: "(mark <face_name> <name>)", sexp: post_growth_op.clone() });
                        };

                        let face = expect_face_name(face_sexp, &face_name)?;
                        marks.push(Mark {
                            face,
                            name: name.clone(),
                        });
                    }
                    "branch" => {
                        if branch.is_some() {
                            return Err(MultipleBranches);
                        }
                        branch = Some(Box::new(tenscript_node(post_growth_op)?));
                    }
                    _ => return Err(Mismatch { rule: "tenscript_node", expected: "mark | branch", sexp: sexp.clone() }),
                }
            }
            Ok(TenscriptNode::Grow { face, forward, marks, branch })
        }
        "branch" => {
            let mut subtrees = Vec::new();
            let mut face_exists = HashSet::new();
            for sub_sexp in tail {
                let Call { head: "grow", .. } = expect_call("tenscript_node", sub_sexp)? else {
                    return Err(Mismatch { rule: "tenscript_node", expected: "(grow ..) under (branch ..)", sexp: sub_sexp.clone() });
                };
                let subtree = tenscript_node(sub_sexp)?;
                let TenscriptNode::Grow { face, .. } = subtree else {
                    return Err(Unknown);
                };
                if face_exists.contains(&face) {
                    return Err(IllegalRepetition { kind: "face name", value: face.to_string() });
                }
                face_exists.insert(face);

                subtrees.push(subtree);
            }
            Ok(TenscriptNode::Branch { subtrees })
        }
        _ => Err(Mismatch { rule: "tenscript_node", expected: "grow | branch", sexp: sexp.clone() }),
    }
}

fn expect_face_name(sexp: &Sexp, face_name: &str) -> Result<FaceName, ErrorKind> {
    Ok(match face_name {
        "A+" => FaceName::Aplus,
        "B+" => FaceName::Bplus,
        "C+" => FaceName::Cplus,
        "D+" => FaceName::Dplus,
        "A-" => FaceName::Aminus,
        "B-" => FaceName::Bminus,
        "C-" => FaceName::Cminus,
        "D-" => FaceName::Dminus,
        _ => return Err(Mismatch { rule: "tenscript_node", expected: "unrecognized face name", sexp: sexp.clone() }),
    })
}

fn features(FabricPlan { features, .. }: &mut FabricPlan, sexps: &[Sexp]) -> Result<(), ErrorKind> {
    let mut feature_defined = HashSet::new();
    for sexp in sexps {
        let Call { head: key, tail: &[ref val] } = expect_call("features", sexp)? else {
            return Err(BadCall { context: "features", expected: "(<feature-name> <value>)", sexp: sexp.clone() });
        };
        if feature_defined.contains(key) {
            return Err(IllegalRepetition { kind: "feature name", value: key.to_string() });
        }
        feature_defined.insert(key.to_string());
        match key {
            "iterations-per-frame" => {
                let Sexp::Integer(value) = val else {
                    return Err(Mismatch { rule: "features", expected: "(iterations-per-frame <integer>)", sexp: sexp.clone() });
                };
                features.iterations_per_frame = Some(*value as u32);
            }
            "visual-strain" => {
                let Sexp::Percent(value) = val else {
                    return Err(Mismatch { rule: "features", expected: "(visual-strain <percent>)", sexp: sexp.clone() });
                };
                features.visual_strain = Some(*value);
            }
            "gravity" => {
                let Sexp::Percent(value) = val else {
                    return Err(Mismatch { rule: "features", expected: "(gravity <percent>)", sexp: sexp.clone() });
                };
                features.gravity = Some(*value);
            }
            "pretenst-factor" => {
                let Sexp::Percent(value) = val else {
                    return Err(Mismatch { rule: "features", expected: "(pretenst-factor <percent>)", sexp: sexp.clone() });
                };
                features.pretenst_factor = Some(*value);
            }
            "stiffness-factor" => {
                let Sexp::Percent(value) = val else {
                    return Err(Mismatch { rule: "features", expected: "(stiffness-factor <percent>)", sexp: sexp.clone() });
                };
                features.stiffness_factor = Some(*value);
            }
            "push-over-pull" => {
                let Sexp::Percent(value) = val else {
                    return Err(Mismatch { rule: "features", expected: "(push-over-pull <percent>)", sexp: sexp.clone() });
                };
                features.push_over_pull = Some(*value);
            }
            "drag" => {
                let Sexp::Percent(value) = val else {
                    return Err(Mismatch { rule: "features", expected: "(drag <percent>)", sexp: sexp.clone() });
                };
                features.drag = Some(*value);
            }
            "shaping-pretenst-factor" => {
                let Sexp::Percent(value) = val else {
                    return Err(Mismatch { rule: "features", expected: "(shaping-pretenst-factor <percent>)", sexp: sexp.clone() });
                };
                features.shaping_pretenst_factor = Some(*value);
            }
            "shaping-drag" => {
                let Sexp::Percent(value) = val else {
                    return Err(Mismatch { rule: "features", expected: "(shaping-drag <percent>)", sexp: sexp.clone() });
                };
                features.shaping_drag = Some(*value);
            }
            "shaping-stiffness-factor" => {
                let Sexp::Percent(value) = val else {
                    return Err(Mismatch { rule: "features", expected: "(shaping-stiffness-factor <percent>)", sexp: sexp.clone() });
                };
                features.shaping_stiffness_factor = Some(*value);
            }
            "antigravity" => {
                let Sexp::Percent(value) = val else {
                    return Err(Mismatch { rule: "features", expected: "(antigravity <percent>)", sexp: sexp.clone() });
                };
                features.antigravity = Some(*value);
            }
            "interval-countdown" => {
                let Sexp::Percent(value) = val else {
                    return Err(Mismatch { rule: "features", expected: "(interval-countdown <percent>)", sexp: sexp.clone() });
                };
                features.interval_countdown = Some(*value);
            }
            "pretensing-countdown" => {
                let Sexp::Percent(value) = val else {
                    return Err(Mismatch { rule: "features", expected: "(pretensing-countdown <percent>)", sexp: sexp.clone() });
                };
                features.pretensing_countdown = Some(*value);
            }
            _ => return Err(BadCall { context: "features", expected: "legal feature name", sexp: sexp.clone() }),
        }
    }
    Ok(())
}

