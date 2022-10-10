pub use std::fmt::{Display, Formatter};

#[derive(Debug, Copy, Clone, Ord, PartialOrd, Eq, PartialEq, Hash)]
pub enum FaceName {
    Seed,
    Aplus,
    Bplus,
    Cplus,
    Dplus,
    Aminus,
    Bminus,
    Cminus,
    Dminus,
}

impl Display for FaceName {
    fn fmt(&self, f: &mut Formatter<'_>) -> std::fmt::Result {
        f.write_str(match self {
            FaceName::Aplus => "A+",
            FaceName::Bplus => "B+",
            FaceName::Cplus => "C+",
            FaceName::Dplus => "D+",
            FaceName::Aminus => "A-",
            FaceName::Bminus => "B-",
            FaceName::Cminus => "C-",
            FaceName::Dminus => "D-",
            FaceName::Seed => "SEED",
        })
    }
}

#[derive(Debug, Clone)]
pub enum VulcanizeType {
    Bowtie,
    Snelson,
}


#[derive(Debug, Clone)]
pub enum SurfaceCharacter {
    Frozen,
    Bouncy,
    Sticky,
}

#[derive(Debug, Clone)]
pub enum SeedType {
    Left,
    LeftRight,
    Right,
    RightLeft,
}

#[derive(Debug, Clone)]
pub struct Mark {
    pub face: FaceName,
    pub name: String,
}

#[derive(Debug, Clone)]
pub enum TenscriptNode {
    Grow {
        face: FaceName,
        forward: String,
        branch: Option<Box<TenscriptNode>>,
        marks: Vec<Mark>,
    },
    Branch {
        subtrees: Vec<TenscriptNode>,
    },
}

#[derive(Debug, Clone, Default)]
pub struct BuildPhase {
    pub seed: Option<SeedType>,
    pub scale: Option<f64>,
    pub vulcanize: Option<VulcanizeType>,
    pub growth: Option<TenscriptNode>,
}

#[derive(Debug, Clone, Default)]
pub struct Features {
    pub iterations_per_frame: Option<u32>,
    pub visual_strain: Option<f64>,
    pub gravity: Option<f64>,
    pub pretenst_factor: Option<f64>,
    pub stiffness_factor: Option<f64>,
    pub push_over_pull: Option<f64>,
    pub drag: Option<f64>,
    pub shaping_pretenst_factor: Option<f64>,
    pub shaping_drag: Option<f64>,
    pub shaping_stiffness_factor: Option<f64>,
    pub antigravity: Option<f64>,
    pub interval_countdown: Option<f64>,
    pub pretensing_countdown: Option<f64>,
}

#[derive(Debug, Clone, Default)]
pub struct FabricPlan {
    pub name: Option<String>,
    pub scale: Option<f64>,
    pub surface: Option<SurfaceCharacter>,
    pub features: Features,
    pub build_phase: BuildPhase,
}
