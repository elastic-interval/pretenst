import { SurfaceCharacter, WorldFeature } from "eig"

import { compileTenscript, ITenscript } from "./tenscript"
import { Spin } from "./tensegrity-types"

const featureValues: Record<WorldFeature, number> = {}
const marks: Record<number, string> = {}

const BOOTSTRAP_TENSCRIPTS: ITenscript[] = [
    {
        name: "Phi",
        spin: Spin.LeftRight,
        surfaceCharacter: SurfaceCharacter.Frozen,
        code: ["()"],
        featureValues, marks,
    },
    {
        name: "One",
        spin: Spin.Left,
        surfaceCharacter: SurfaceCharacter.Frozen,
        code: ["(1)"],
        featureValues, marks,
    },
    {
        name: "Axoneme",
        spin: Spin.Left,
        surfaceCharacter: SurfaceCharacter.Frozen,
        code: ["(30,S95)"],
        featureValues, marks,
    },
    {
        name: "Knee",
        spin: Spin.Left,
        surfaceCharacter: SurfaceCharacter.Frozen,
        code: ["(3,b3)"],
        featureValues, marks,
    },
    {
        name: "Jack",
        surfaceCharacter: SurfaceCharacter.Frozen,
        spin: Spin.LeftRight,
        code: ["(a2,b2,c2,d2)"],
        featureValues, marks,
    },
    {
        name: "Star",
        surfaceCharacter: SurfaceCharacter.Frozen,
        spin: Spin.LeftRight,
        code: ["(a(15,S90),b(15,S90),c(15,S90),d(15,S90))"],
        featureValues, marks,
    },
    {
        name: "Tripod with Knees",
        surfaceCharacter: SurfaceCharacter.Frozen,
        spin: Spin.RightLeft,
        code: ["(A5,B(7,c(5,S90),S90),C(7,c(5,S90),S90),D(7,c(5,S90),S90))"],
        featureValues, marks,
    },
    {
        name: "Pretenst Lander",
        surfaceCharacter: SurfaceCharacter.Frozen,
        spin: Spin.LeftRight,
        code: ["(B(15,S90),C(15,S90),D(15,S90))"],
        featureValues, marks,
    },
    {
        name: "Zigzag",
        spin: Spin.LeftRight,
        surfaceCharacter: SurfaceCharacter.Frozen,
        code: ["(d(3,MA1),c(7,b(7,d(7,d(7,d(7,d(3,MA1)))))))"],
        marks: {
            1: "join",
        },
        featureValues,
    },
    {
        name: "Bulge Ring",
        spin: Spin.Left,
        surfaceCharacter: SurfaceCharacter.Frozen,
        code: ["(A(15,S90,MA1), a(16,S90,MA1))"],
        marks: {
            1: "join",
        },
        featureValues,
    },
    {
        name: "Convergence",
        spin: Spin.LeftRight,
        surfaceCharacter: SurfaceCharacter.Frozen,
        code: ["(a1,b(15,S92,MA1),c(15,S92,MA1),d(15,S92,MA1))"],
        marks: {
            1: "join",
        },
        featureValues,
    },
    {
        name: "Halo by Crane",
        spin: Spin.Left,
        surfaceCharacter: SurfaceCharacter.Frozen,
        code: ["(5,S92,b(12,S92,MA1),d(11,S92,MA1))"],
        marks: {
            1: "join",
        },
        featureValues,
    },
    {
        name: "Thick Tripod",
        spin: Spin.LeftRight,
        surfaceCharacter: SurfaceCharacter.Frozen,
        code: ["(A3,B(8,MA1),C(8,MA1),D(8,MA1))"],
        marks: {
            1: "distance-35",
        },
        featureValues,
    },
    {
        name: "Diamond",
        spin: Spin.RightLeft,
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
        marks: {
            1: "join",
            2: "join",
            3: "join",
            4: "join",
            5: "join",
            6: "join",
        },
        featureValues,
    },
    {
        name: "Composed Tree",
        spin: Spin.Left,
        surfaceCharacter: SurfaceCharacter.Frozen,
        code: ["(6,b(4,MA1),c(4,MA1),d(4,MA1))"],
        marks: {
            1: "subtree(b5,c5,d5)",
        },
        featureValues,
    },
    {
        name: "Equus Lunae",
        spin: Spin.LeftRight,
        surfaceCharacter: SurfaceCharacter.Frozen,
        code: ["(A(16,S95,Mb0),b(16,S95,Md0),a(16,S95,Md0),B(16,Mb0,S95))"],
        marks: {
            0: "distance-60",
        },
        featureValues,
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
