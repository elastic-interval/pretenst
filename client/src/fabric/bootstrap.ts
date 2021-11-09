import { SurfaceCharacter } from "eig"

import { compileTenscript, ITenscript } from "./tenscript"
import { PostGrowthOp } from "./tensegrity"
import { Spin } from "./tensegrity-types"

const BOOTSTRAP_TENSCRIPTS: ITenscript[] = [
    {
        name: "Phi",
        spin: Spin.LeftRight,
        postGrowthOp: PostGrowthOp.NoOp,
        surfaceCharacter: SurfaceCharacter.Frozen,
        code: ["()"],
    },
    {
        name: "One",
        spin: Spin.Left,
        postGrowthOp: PostGrowthOp.NoOp,
        surfaceCharacter: SurfaceCharacter.Bouncy,
        code: ["(1)"],
        jobs: [
            {
                age: 30000,
                todo: "pretensing",
            },
        ],
        featureValues: {
            "IterationsPerFrame": 300,
        },
    },
    {
        name: "Axoneme",
        spin: Spin.Left,
        surfaceCharacter: SurfaceCharacter.Frozen,
        postGrowthOp: PostGrowthOp.Bowtie,
        code: ["(30,S95)"],
    },
    {
        name: "Knee",
        spin: Spin.Left,
        postGrowthOp: PostGrowthOp.Bowtie,
        surfaceCharacter: SurfaceCharacter.Frozen,
        code: ["(3,b3)"],
    },
    {
        name: "Jack",
        spin: Spin.LeftRight,
        postGrowthOp: PostGrowthOp.Bowtie,
        surfaceCharacter: SurfaceCharacter.Frozen,
        code: ["(a2,b2,c2,d2)"],
    },
    {
        name: "Star",
        spin: Spin.LeftRight,
        postGrowthOp: PostGrowthOp.Bowtie,
        surfaceCharacter: SurfaceCharacter.Frozen,
        code: ["(a(15,S90),b(15,S90),c(15,S90),d(15,S90))"],
    },
    {
        name: "Tripod with Knees",
        spin: Spin.RightLeft,
        postGrowthOp: PostGrowthOp.Bowtie,
        surfaceCharacter: SurfaceCharacter.Frozen,
        code: ["(A5,B(7,c(5,S90),S90),C(7,c(5,S90),S90),D(7,c(5,S90),S90))"],
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
            0: "shaping-distance-60",
        },
    },
    {
        name: "Runner",
        spin: Spin.LeftRight,
        postGrowthOp: PostGrowthOp.Bowtie,
        surfaceCharacter: SurfaceCharacter.Bouncy,
        code: ["(A1,B(5,S90),C(5,S90),D(5,S90))"],
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
    {
        name: "Halo by Crane",
        spin: Spin.Left,
        scale: 100,
        postGrowthOp: PostGrowthOp.Bowtie,
        surfaceCharacter: SurfaceCharacter.Frozen,
        code: ["(5,S92,b(12,S92,MA1),d(11,S92,MA1))"],
        markDefStrings: {
            1: "join",
        },
        jobs: [
            {
                age: 60000,
                todo: "pretensing",
            },
        ],
        featureValues: {
            "Gravity": 50,
            "IterationsPerFrame": 1000,
        },
    },
    {
        name: "Convergence",
        spin: Spin.LeftRight,
        scale: 100,
        postGrowthOp: PostGrowthOp.Bowtie,
        surfaceCharacter: SurfaceCharacter.Frozen,
        code: ["(a2,b(10,S90,MA1),c(10,S90,MA1),d(10,S90,MA1))"],
        markDefStrings: {
            1: "join",
        },
        jobs: [
            {
                age: 60000,
                todo: "pretensing",
            },
        ],
        featureValues: {
            "IterationsPerFrame": 1000,
        },
    },
    {
        name: "Headless Hug",
        spin: Spin.LeftRight,
        scale: 105,
        postGrowthOp: PostGrowthOp.BowtieFaces,
        surfaceCharacter: SurfaceCharacter.Frozen,
        code: [
            "(",
            "A(OOOOXOO,S95,MA0),",
            "b(OOOOXOO,S95,MA0),",
            "a(3,C(XOOOXOO,S93,MA3),S90,MA2),",
            "B(3,C(XOOOXOO,S93,MA3),S90,MA2)",
            ")",
        ],
        markDefStrings: {
            "0": "shaping-distance-5",
            "2": "shaping-distance-7",
            "3": "shaping-distance-5",
        },
        featureValues: {
            "IterationsPerFrame": 1000,
            "PushOverPull": 400,
        },
        jobs: [
            {
                age: 100000,
                todo: "pretensing",
            },
            {
                age: 110000,
                todo: "conflict",
            },
            {
                age: 120000,
                todo: "orient-0",
            },
        ],
    },
    {
        name: "Triped",
        spin: Spin.LeftRight,
        scale: 100,
        postGrowthOp: PostGrowthOp.Bowtie,
        surfaceCharacter: SurfaceCharacter.Bouncy,
        code: ["(B(9,S90,MA1),C(9,S90,MA1),D(9,S90,MA1))"],
        markDefStrings: {
            1: "shaping-distance-25",
        },
        featureValues: {
            "IterationsPerFrame": 1000,
            "PushOverPull": 1000,
        },
        jobs: [
            {
                age: 80000,
                todo: "pretensing",
            },
        ],
    },
    {
        name: "Arch",
        spin: Spin.Left,
        scale: 1600,
        postGrowthOp: PostGrowthOp.Faces,
        surfaceCharacter: SurfaceCharacter.Frozen,
        code: ["(A(3,MA0), a(4,MA0))"],
        markDefStrings: {
            0: "pretenst-distance-35",
        },
        featureValues: {
            "PushOverPull": 1000,
            "IterationsPerFrame": 500,
        },
        jobs: [
            {
                age: 50000,
                todo: "orient-0",
            },
        ],
    },
]

export const BOOTSTRAP = BOOTSTRAP_TENSCRIPTS.map(tenscript => {
    compileTenscript(tenscript, (message: string) => {
        throw new Error(`Bootstrap compile error in "${tenscript}"! ${message}`)
    })
    return tenscript
})

export const CONSTRUCTIONS = BOOTSTRAP.filter(({scale}) => scale !== undefined)
