/*
 * Copyright (c) 2020. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { FabricFeature, IntervalRole } from "eig"
import { Vector3 } from "three"

import { Tensegrity } from "../fabric/tensegrity"
import {
    factorToPercent,
    IFace,
    IInterval,
    IJoint,
    percentOrHundred,
    Triangle,
    TRIANGLE_DEFINITIONS,
} from "../fabric/tensegrity-types"

const RIBBON_HEIGHT = 1

export enum Arch {
    FrontLeft,
    FrontRight,
    BackLeft,
    BackRight,
}

export interface IHook {
    face: IFace
    name: string
    arch: Arch
    distance: number
    group: Triangle
    triangle: Triangle
    jointIndex: number
}

export function ribbon(tensegrity: Tensegrity, size: number): IHook[][] {
    const ribbonShort = tensegrity.numericFeature(FabricFeature.RibbonShortLength)
    const ribbonLong = tensegrity.numericFeature(FabricFeature.RibbonLongLength)
    const joint = (x: number, left: boolean): IJoint => {
        const z = ribbonLong * (left ? -0.5 : 0.5)
        const location = new Vector3(x, RIBBON_HEIGHT, z)
        const jointIndex = tensegrity.createJoint(location)
        return {
            index: jointIndex,
            oppositeIndex: -1,
            location: () => tensegrity.instance.jointLocation(jointIndex),
        }
    }
    const interval = (alpha: IJoint, omega: IJoint, intervalRole: IntervalRole): IInterval =>
        tensegrity.createInterval(alpha, omega, intervalRole, percentOrHundred(), 1000)
    const L0 = joint(0, true)
    const R0 = joint(0, false)
    const J: IJoint[][] = [[L0], [R0], [L0], [R0]]
    for (let walk = 1; walk < size; walk++) {
        const x = walk * ribbonShort
        J[Arch.FrontLeft].push(joint(x, true))
        J[Arch.FrontRight].push(joint(x, false))
        J[Arch.BackLeft].push(joint(-x, true))
        J[Arch.BackRight].push(joint(-x, false))
    }
    tensegrity.instance.refreshFloatView()
    interval(L0, R0, IntervalRole.RibbonLong)
    const joints = (index: number) => [J[0][index], J[1][index], J[2][index], J[3][index]]
    for (let walk = 1; walk < size; walk++) {
        const prev = joints(walk - 1)
        const curr = joints(walk)
        interval(curr[0], curr[1], IntervalRole.RibbonLong)
        interval(curr[2], curr[3], IntervalRole.RibbonLong)
        for (let short = 0; short < 4; short++) {
            interval(prev[short], curr[short], IntervalRole.RibbonShort)
        }
    }
    interval(J[Arch.FrontLeft][1], J[Arch.BackRight][1], IntervalRole.RibbonPush)
    interval(J[Arch.FrontRight][1], J[Arch.BackLeft][1], IntervalRole.RibbonPush)
    for (let walk = 2; walk < size; walk++) {
        const prev = joints(walk - 2)
        const curr = joints(walk)
        interval(prev[0], curr[1], IntervalRole.RibbonPush)
        interval(prev[1], curr[0], IntervalRole.RibbonPush)
        interval(prev[2], curr[3], IntervalRole.RibbonPush)
        interval(prev[3], curr[2], IntervalRole.RibbonPush)
    }
    const hooks = extractHooks(tensegrity)
    for (let arch = 0; arch < 4; arch++) {
        const h = hooks[arch]
        const hanger = (alpha: IJoint, omega: IJoint): IInterval => {
            const intervalRole = IntervalRole.RibbonHanger
            const length = alpha.location().distanceTo(omega.location())
            const scale = factorToPercent(length)
            return tensegrity.createInterval(alpha, omega, intervalRole, scale, 1000)
        }
        h.forEach((hook, index) => {
            const rj = J[arch][index + 1]
            const hj = hookJoint(hook)
            hanger(rj, hj)
        })
    }
    return hooks
}

function hookJoint(hook: IHook): IJoint {
    return hook.face.joints[hook.jointIndex]
}

function hookX(hook: IHook): number {
    return Math.abs(hookJoint(hook).location().x)
}

function hookSort(a: IHook, b: IHook): number {
    return hookX(a) - hookX(b)
}

function hookFilter(hook: IHook): boolean {
    if (hook.distance > 4) {
        return false
    }
    switch (hook.triangle) {
        case Triangle.NPN:
            return hook.jointIndex !== 2 && hook.arch === Arch.BackRight
        case Triangle.NNP:
            return hook.jointIndex !== 0 && hook.arch === Arch.FrontRight
        case Triangle.PNP:
            return hook.jointIndex !== 2 && hook.arch === Arch.BackLeft
        case Triangle.PPN:
            return hook.jointIndex !== 1 && hook.arch === Arch.FrontLeft
        default:
            return false
    }
}

function extractHooks(tensegrity: Tensegrity): IHook[][] {
    const hooks: IHook[][] = [[], [], [], []]
    const faces = tensegrity.faces.filter(face => !face.removed && face.brick.parentFace)
    faces.forEach(face => {
        const gatherAncestors = (f: IFace, id: Triangle[]): Arch => {
            const definition = TRIANGLE_DEFINITIONS[f.triangle]
            id.push(definition.negative ? definition.opposite : definition.name)
            const parentFace = f.brick.parentFace
            if (parentFace) {
                return gatherAncestors(parentFace, id)
            } else {
                return archFromTriangle(f.triangle)
            }
        }
        const identities: Triangle[] = []
        const arch = gatherAncestors(face, identities)
        const group = identities.shift()
        if (!group) {
            throw new Error("no top!")
        }
        if (group && isTriangleExtremity(group)) {
            return
        }
        const triangle = face.triangle
        const distance = identities.length
        for (let jointIndex = 0; jointIndex < 3; jointIndex++) {
            const name = `[${arch}]:[${distance}:${Triangle[group]}]:{tri=${Triangle[triangle]}}:{j=${jointIndex}}`
            hooks[arch].push({face, name, arch, distance, group, triangle, jointIndex})
        }
    })
    return [
        hooks[Arch.FrontLeft].filter(hookFilter).sort(hookSort),
        hooks[Arch.FrontRight].filter(hookFilter).sort(hookSort),
        hooks[Arch.BackLeft].filter(hookFilter).sort(hookSort),
        hooks[Arch.BackRight].filter(hookFilter).sort(hookSort),
    ]
}

function archFromTriangle(triangle: Triangle): Arch {
    switch (triangle) {
        case Triangle.NNN:
            return Arch.BackLeft
        case Triangle.PNN:
            return Arch.BackRight
        case Triangle.NPP:
            return Arch.FrontLeft
        case Triangle.PPP:
            return Arch.FrontRight
        default:
            throw new Error("Strange arch")
    }
}

function isTriangleExtremity(triangle: Triangle): boolean {
    const definition = TRIANGLE_DEFINITIONS[triangle]
    const normalizedTriangle = definition.negative ? definition.opposite : triangle
    return normalizedTriangle === Triangle.PPP
}

