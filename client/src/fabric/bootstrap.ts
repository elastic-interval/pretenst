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
    },
    {
        name: "One",
        spin: Spin.Left,
        postGrowthOp: PostGrowthOp.Snelson,
        surfaceCharacter: SurfaceCharacter.Frozen,
        code: ["(1)"],
        featureValues: NO_FEATURE_VALUES, markDefStrings: NO_MARK_DEFS,
    },
    {
        name: "Axoneme",
        spin: Spin.Left,
        surfaceCharacter: SurfaceCharacter.Frozen,
        postGrowthOp: PostGrowthOp.Bowtie,
        code: ["(30,S95)"],
        featureValues: NO_FEATURE_VALUES, markDefStrings: NO_MARK_DEFS,
    },
    {
        name: "Knee",
        spin: Spin.Left,
        postGrowthOp: PostGrowthOp.Bowtie,
        surfaceCharacter: SurfaceCharacter.Frozen,
        code: ["(3,b3)"],
        featureValues: NO_FEATURE_VALUES, markDefStrings: NO_MARK_DEFS,
    },
    {
        name: "Jack",
        spin: Spin.LeftRight,
        postGrowthOp: PostGrowthOp.Bowtie,
        surfaceCharacter: SurfaceCharacter.Frozen,
        code: ["(a2,b2,c2,d2)"],
        featureValues: NO_FEATURE_VALUES, markDefStrings: NO_MARK_DEFS,
    },
    {
        name: "Star",
        spin: Spin.LeftRight,
        postGrowthOp: PostGrowthOp.Bowtie,
        surfaceCharacter: SurfaceCharacter.Frozen,
        code: ["(a(15,S90),b(15,S90),c(15,S90),d(15,S90))"],
        featureValues: NO_FEATURE_VALUES, markDefStrings: NO_MARK_DEFS,
    },
    {
        name: "Tripod with Knees",
        spin: Spin.RightLeft,
        postGrowthOp: PostGrowthOp.Bowtie,
        surfaceCharacter: SurfaceCharacter.Frozen,
        code: ["(A5,B(7,c(5,S90),S90),C(7,c(5,S90),S90),D(7,c(5,S90),S90))"],
        featureValues: NO_FEATURE_VALUES, markDefStrings: NO_MARK_DEFS,
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
    },
    {
        name: "Zigzag",
        spin: Spin.LeftRight,
        postGrowthOp: PostGrowthOp.Bowtie,
        surfaceCharacter: SurfaceCharacter.Frozen,
        code: ["(c(3,MA1),d(7,b(7,c(7,d(7,c(7,d(3,MA1)))))))"],
        markDefStrings: {
            1: "join",
        },
        featureValues: NO_FEATURE_VALUES,
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
    },
    {
        name: "Diamond",
        spin: Spin.RightLeft,
        postGrowthOp: PostGrowthOp.Bowtie,
        surfaceCharacter: SurfaceCharacter.Frozen,
        code: [
            "(",
            "   a(5,",
            "      b(5,b(5,b(2,MA3)),c(5,c(2,MA4))),",
            "      c(5,b(5,b(2,MA1)),c(5,c(2,MA5))),",
            "      d(5,b(5,b(2,MA6)),c(5,c(2,MA2)))",
            "   )",
            "   b(5,b(5,b(2,MA5)),c(5,c(2,MA3))),",
            "   c(5,b(5,b(2,MA2)),c(5,c(2,MA1))),",
            "   d(5,b(5,b(2,MA4)),c(5,c(2,MA6)))",
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
    },
    {
        name: "Equus Lunae",
        spin: Spin.LeftRight,
        postGrowthOp: PostGrowthOp.Bowtie,
        surfaceCharacter: SurfaceCharacter.Frozen,
        code: [
            "(",
            "  A(16,S95,Md0),",
            "  b(16,S95,Md0),",
            "  a(16,S95,Md0),",
            "  B(16,S95,Md0)",
            ")",
        ],
        markDefStrings: {
            0: "distance-60",
        },
        featureValues: NO_FEATURE_VALUES,
    },
    {
        name: "Runner",
        spin: Spin.LeftRight,
        postGrowthOp: PostGrowthOp.Bowtie,
        surfaceCharacter: SurfaceCharacter.Bouncy,
        code: ["(A1,B(5,S90),C(5,S90),D(5,S90))"],
        featureValues: NO_FEATURE_VALUES,
        markDefStrings: {},
    },
    {
        name: "Man",
        spin: Spin.LeftRight,
        postGrowthOp: PostGrowthOp.BowtieFaces,
        surfaceCharacter: SurfaceCharacter.Sticky,
        code: [
            "(",
            "A(7,b1,S88,Mc1,MA4),b(7,b1,S88,Mc1),",
            "a(3,C(7,S90,MA3),S95,MA2),B(3,C(7,S90,MA3),S95,MA2)",
            ")",
        ],
        featureValues: {
            [WorldFeature.Gravity]: 1,
        },
        markDefStrings: {
            "1": "distance-10",
            "2": "distance-5",
            "3": "distance-30",
            "4": "base",
        },
    },
    {
        name: "Infinity",
        spin: Spin.LeftRight,
        postGrowthOp: 3,
        surfaceCharacter: 2,
        code: [
            "(",
            "A(11,S88,MA1),b(11,S88,MA1),",
            "a(11,S88,MA2),B(11,S88,MA2)",
            ")",
        ],
        featureValues: {},
        markDefStrings: {
            "1": "join",
            "2": "join",
        },
    },
    {
        name: "Propellor Tree",
        spin: Spin.LeftRight,
        postGrowthOp: 3,
        surfaceCharacter: 2,
        code: [
            "(",
            "  a(5,S110),",
            "  B(11,S90,MA3),",
            "  b(11,S90,MA1),",
            "  C(11,S90,MA2),",
            "  c(11,S90,MA3),",
            "  D(11,S90,MA1),",
            "  d(11,S90,MA2),",
            ")",
        ],
        featureValues: {},
        markDefStrings: {
            "1": "join",
            "2": "join",
            "3": "join",
            "4": "join",
        },
    },
]

//    "(",
//     "  a(5,S110),",
//     "  B(11,S90,MA3),",
//     "  b(11,S90,MA1),",
//     "  C(11,S90,MA2),",
//     "  c(11,S90,MA3),",
//     "  D(11,S90,MA1),",
//     "  d(11,S90,MA2),",
//     ")"
export const BOOTSTRAP = BOOTSTRAP_TENSCRIPTS.map(tenscript => {
    compileTenscript(tenscript, (message: string) => {
        throw new Error(`Bootstrap compile error in "${tenscript}"! ${message}`)
    })
    return tenscript
})
