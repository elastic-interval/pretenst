/*
 * Copyright (c) 2021. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { SurfaceCharacter } from "eig"
import { atom } from "recoil"

import { FabricInstance } from "../fabric/fabric-instance"
import { compileTenscript, ITenscript } from "../fabric/tenscript"
import { PostGrowthOp, Tensegrity } from "../fabric/tensegrity"
import { percentOrHundred, Spin } from "../fabric/tensegrity-types"

import { Genome } from "./genome"
import { Island, ISource } from "./island"
import { Patch } from "./patch"
import { Direction, IRunnerState, Runner } from "./runner"
import { Flora } from "./flora"

const RUNNER_CODE: ITenscript = {
    name: "Runner",
    code: ["(A(4,S80,Mb0),b(4,S80,Mb0),a(2,S70,Md0),B(2,Md0,S70))"],
    postGrowthOp: PostGrowthOp.Bowtie,
    spin: Spin.Left,
    marks: {
        0: "distance-60",
    },
    surfaceCharacter: SurfaceCharacter.Frozen,
    featureValues: {},
}

const FLORA_CODE: ITenscript = {
    name: "Flora",
    postGrowthOp: PostGrowthOp.Bowtie,
    code: ["(2,S85,b(4,S85,MA0),c(4,S85,MA0),d(4,S85,MA0))"],
    spin: Spin.Left,
    marks: {
        0: "subtree(b(3, S85),c(3, S85),d(3, S85))",
    },
    surfaceCharacter: SurfaceCharacter.Frozen,
    featureValues: {},
}

const source: ISource = {
    newRunner: (patch: Patch, instance: FabricInstance, genome: Genome): Runner => {
        const targetPatch = patch.adjacent[0]
        if (!targetPatch) {
            throw new Error("No adjacent")
        }
        const state: IRunnerState = {
            patch,
            targetPatch,
            instance,
            genome,
            muscles: [],
            extremities: [],
            direction: Direction.Forward,
            directionHistory: [],
            autopilot: true,
            timeSlice: 10,
            twitchesPerCycle: 10,
        }
        const tree = compileTenscript(RUNNER_CODE, (err) => {
            throw new Error("unable to compile runner: " + err)
        })
        if (!tree) {
            throw new Error("no tree")
        }
        const embryo = new Tensegrity(patch.center, percentOrHundred(), instance, 100, RUNNER_CODE, tree)
        return new Runner(state, embryo)
    },
    newFlora: (patch: Patch, instance: FabricInstance): Flora => {
        const tree = compileTenscript(FLORA_CODE, (err) => {
            throw new Error("unable to compile sat tree: " + err)
        })
        if (!tree) {
            throw new Error("no tree")
        }
        const tensegrity = new Tensegrity(patch.center, percentOrHundred(), instance, 1000, FLORA_CODE, tree)
        return new Flora(patch.name, tensegrity)
    },
}

const ISLAND = new Island(source, "galapagos", 666)
const homePatch = () => {
    const p = ISLAND.patches[0]
    if (!p) {
        throw new Error("no patch")
    }
    return p
}

export const islandAtom = atom<Island>({
    key: "island",
    default: ISLAND,
})

export const homePatchAtom = atom<Patch>({
    key: "homePatch",
    default: homePatch(),
})
