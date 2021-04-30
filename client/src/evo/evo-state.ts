/*
 * Copyright (c) 2021. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { SurfaceCharacter } from "eig"
import { atom, selector } from "recoil"

import { ITenscript } from "../fabric/tenscript"
import { PostGrowthOp } from "../fabric/tensegrity"
import { Spin } from "../fabric/tensegrity-types"

import { Island } from "./island"
import { Patch } from "./patch"

const LEG = 6
const SCALE = 80

export const RUNNER_CODE: ITenscript = {
    name: "Runner",
    spin: Spin.LeftRight,
    code: [
        `(B(${LEG},S${SCALE}),C(${LEG},S${SCALE}),D(${LEG},S${SCALE}))`,
    ],
    postGrowthOp: PostGrowthOp.Bowtie,
    markDefStrings: {},
    surfaceCharacter: SurfaceCharacter.Bouncy,
    featureValues: {},
}

export const FLORA_CODE: ITenscript = {
    name: "Flora",
    postGrowthOp: PostGrowthOp.Bowtie,
    code: ["(2,S85,b(4,S85,MA0),c(4,S85,MA0),d(4,S85,MA0))"],
    spin: Spin.Left,
    markDefStrings: {
        0: "subtree(b(3, S85),c(3, S85),d(3, S85))",
    },
    surfaceCharacter: SurfaceCharacter.Frozen,
    featureValues: {},
}

export const islandAtom = atom<Island>({
    key: "island",
    default: new Island("galapagos", 383),
})

export const homePatchSelector = selector<Patch>({
    key: "MySelector",
    get: ({get}) => get(islandAtom).patches[0], // todo: for now
})
