import { SurfaceCharacter, WorldFeature } from "eig"

import { compileTenscript, ITenscript } from "./tenscript"
import { PostGrowthOp } from "./tensegrity"
import { Spin } from "./tensegrity-types"

const NO_FEATURE_VALUES: Record<WorldFeature, number> = {}
const NO_MARK_DEFS: Record<number, string> = {}

const BOOTSTRAP_TENSCRIPTS: ITenscript[] = [
    {
        name: "Phi",
        spin: Spin.LeftRight,
        postGrowthOp: PostGrowthOp.NoOp,
        surfaceCharacter: SurfaceCharacter.Frozen,
        code: ["()"],
        featureValues: NO_FEATURE_VALUES, markDefStrings: NO_MARK_DEFS,
        scaling: 1,
    },
    {
        name: "One",
        spin: Spin.Left,
        postGrowthOp: PostGrowthOp.Snelson,
        surfaceCharacter: SurfaceCharacter.Frozen,
        code: ["(1)"],
        featureValues: NO_FEATURE_VALUES, markDefStrings: NO_MARK_DEFS,
        scaling: 1,
    },
    {
        name: "Axoneme",
        spin: Spin.Left,
        surfaceCharacter: SurfaceCharacter.Frozen,
        postGrowthOp: PostGrowthOp.Bowtie,
        code: ["(30,S95)"],
        featureValues: NO_FEATURE_VALUES, markDefStrings: NO_MARK_DEFS,
        scaling: 1,
    },
    {
        name: "Knee",
        spin: Spin.Left,
        postGrowthOp: PostGrowthOp.Bowtie,
        surfaceCharacter: SurfaceCharacter.Frozen,
        code: ["(3,b3)"],
        featureValues: NO_FEATURE_VALUES, markDefStrings: NO_MARK_DEFS,
        scaling: 1,
    },
    {
        name: "Jack",
        spin: Spin.LeftRight,
        postGrowthOp: PostGrowthOp.Bowtie,
        surfaceCharacter: SurfaceCharacter.Frozen,
        code: ["(a2,b2,c2,d2)"],
        featureValues: NO_FEATURE_VALUES, markDefStrings: NO_MARK_DEFS,
        scaling: 1,
    },
    {
        name: "Star",
        spin: Spin.LeftRight,
        postGrowthOp: PostGrowthOp.Bowtie,
        surfaceCharacter: SurfaceCharacter.Frozen,
        code: ["(a(15,S90),b(15,S90),c(15,S90),d(15,S90))"],
        featureValues: NO_FEATURE_VALUES, markDefStrings: NO_MARK_DEFS,
        scaling: 1,
    },
    {
        name: "Tripod with Knees",
        spin: Spin.RightLeft,
        postGrowthOp: PostGrowthOp.Bowtie,
        surfaceCharacter: SurfaceCharacter.Frozen,
        code: ["(A5,B(7,c(5,S90),S90),C(7,c(5,S90),S90),D(7,c(5,S90),S90))"],
        featureValues: NO_FEATURE_VALUES, markDefStrings: NO_MARK_DEFS,
        scaling: 1,
    },
    {
        name: "Pretenst Lander",
        spin: Spin.LeftRight,
        postGrowthOp: PostGrowthOp.Bowtie,
        surfaceCharacter: SurfaceCharacter.Bouncy,
        code: ["(B(15,S90,MA1),C(15,S90,MA1),D(15,S90,MA1))"],
        featureValues: NO_FEATURE_VALUES,
        markDefStrings: {
            1: "distance-60",
        },
        scaling: 1,
    },
    {
        name: "Zigzag",
        spin: Spin.LeftRight,
        postGrowthOp: PostGrowthOp.Bowtie,
        surfaceCharacter: SurfaceCharacter.Frozen,
        code: ["(d(3,MA1),c(7,b(7,d(7,d(7,d(7,d(3,MA1)))))))"],
        markDefStrings: {
            1: "join",
        },
        featureValues: NO_FEATURE_VALUES,
        scaling: 1,
    },
    {
        name: "Magnet",
        spin: Spin.Left,
        postGrowthOp: PostGrowthOp.NoOp,
        surfaceCharacter: SurfaceCharacter.Bouncy,
        code: ["(A(9,S80,MA1), a(9,S80,MA1))"],
        markDefStrings: {
            1: "distance-5",
        },
        featureValues: {
            [WorldFeature.Gravity]: 0,
            [WorldFeature.StiffnessFactor]: 25,
            [WorldFeature.Drag]: 1000,
        },
        scaling: 1,
    },
    {
        name: "Convergence",
        spin: Spin.LeftRight,
        postGrowthOp: PostGrowthOp.Bowtie,
        surfaceCharacter: SurfaceCharacter.Frozen,
        code: ["(a2,b(10,S90,MA1),c(10,S90,MA1),d(10,S90,MA1))"],
        markDefStrings: {
            1: "join",
        },
        featureValues: NO_FEATURE_VALUES,
        scaling: 1,
    },
    {
        name: "Halo by Crane",
        spin: Spin.Left,
        postGrowthOp: PostGrowthOp.Bowtie,
        surfaceCharacter: SurfaceCharacter.Frozen,
        code: ["(5,S92,b(12,S92,MA1),d(11,S92,MA1))"],
        markDefStrings: {
            1: "join",
        },
        featureValues: NO_FEATURE_VALUES,
        scaling: 1,
    },
    {
        name: "Thick Tripod",
        spin: Spin.LeftRight,
        postGrowthOp: PostGrowthOp.Bowtie,
        surfaceCharacter: SurfaceCharacter.Frozen,
        code: ["(A3,B(8,MA1),C(8,MA1),D(8,MA1))"],
        markDefStrings: {
            1: "distance-35",
        },
        featureValues: NO_FEATURE_VALUES,
        scaling: 1,
    },
    {
        name: "Diamond",
        spin: Spin.RightLeft,
        postGrowthOp: PostGrowthOp.Bowtie,
        surfaceCharacter: SurfaceCharacter.Frozen,
        code: [
            "(",
            "   a(5,",
            "      b(5,b(5,b(2,MA3)),c(5,d(2,MA4))),",
            "      c(5,b(5,b(2,MA1)),c(5,d(2,MA5))),",
            "      d(5,b(5,b(2,MA6)),c(5,d(2,MA2)))",
            "   ),",
            "   b(5,b(5,b(2,MA2)),d(5,c(2,MA3))),",
            "   c(5,b(5,b(2,MA5)),d(5,c(2,MA6))),",
            "   d(5,b(5,b(2,MA4)),d(5,c(2,MA1)))",
            ")",
        ],
        markDefStrings: {
            1: "join",
            2: "join",
            3: "join",
            4: "join",
            5: "join",
            6: "join",
        },
        featureValues: NO_FEATURE_VALUES,
        scaling: 1,
    },
    {
        name: "Composed Tree",
        spin: Spin.Left,
        postGrowthOp: PostGrowthOp.Bowtie,
        surfaceCharacter: SurfaceCharacter.Frozen,
        code: ["(6,b(4,MA1),c(4,MA1),d(4,MA1))"],
        markDefStrings: {
            1: "subtree(b5,c5,d5)",
        },
        featureValues: NO_FEATURE_VALUES,
        scaling: 1,
    },
    {
        name: "Equus Lunae",
        spin: Spin.LeftRight,
        postGrowthOp: PostGrowthOp.Bowtie,
        surfaceCharacter: SurfaceCharacter.Frozen,
        code: [
            "(",
            "  A(16,S95,Md0),",
            "  b(16,S95,Mc0),",
            "  a(16,S95,Mc0),",
            "  B(16,S95,Md0)",
            ")",
        ],
        markDefStrings: {
            0: "distance-60",
        },
        featureValues: NO_FEATURE_VALUES,
        scaling: 1,
    },
    {
        name: "Runner",
        spin: Spin.LeftRight,
        postGrowthOp: PostGrowthOp.Bowtie,
        surfaceCharacter: SurfaceCharacter.Bouncy,
        code: ["(A1,B(5,S90),C(5,S90),D(5,S90))"],
        featureValues: NO_FEATURE_VALUES,
        markDefStrings: {},
        scaling: 1,
    },
    // "'Infinity':LR(a(16,S90,MA1),b(16,S90,MA2),B(16,S90,MA1),A(16,S90,MA2)):*=join",
    // "'Binfinity':LR(d(16,S90,MA4),C(16,S90,MA4),c(16,S90,MA3),D(16,S90,MA3),a(16,S90,MA1),b(16,S90,MA2),B(16,S90,MA1),A(16,S90,MA2)):*=join",
    // "'Mobiosity':LR(d(16,S90,MA4),C(16,S90,MA4),c(16,S90,MA3),D(16,S90,MA2),a(16,S90,MA1),b(16,S90,MA2),B(16,S90,MA1),A(16,S90,MA3)):*=join",
    // "'Pretenst Squared':L(a(3,MA1),A(2,MA1)):1=distance-70",
]

export const BOOTSTRAP = BOOTSTRAP_TENSCRIPTS.map(tenscript => {
    compileTenscript(tenscript, (message: string) => {
        throw new Error(`Bootstrap compile error in "${tenscript}"! ${message}`)
    })
    return tenscript
})
