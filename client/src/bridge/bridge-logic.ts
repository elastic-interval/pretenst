/*
 * Copyright (c) 2020. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { IntervalRole, WorldFeature } from "eig"
import { Vector3 } from "three"

import { Tensegrity } from "../fabric/tensegrity"
import { scaleToInitialStiffness } from "../fabric/tensegrity-optimizer"
import {
    factorToPercent,
    IFace,
    IInterval,
    IJoint,
    percentOrHundred,
    Triangle,
    TRIANGLE_DEFINITIONS,
} from "../fabric/tensegrity-types"


export function bridgeTenscript(): string {
    const C = 7
    const W = 2.5
    const L = 6
    const S = 95
    return (
        `'Melkvonder Ulft':(A(${C},S${S},MA0),b(${C},S${S},MA1),a(${C},S${S},MA3),B(${C},S${S},MA2))` +
        `:0=anchor-(${L},${W}):1=anchor-(${L},-${W}):2=anchor-(-${L},${W}):3=anchor-(-${L},-${W})`
    )
}

export function bridgeNumeric(feature: WorldFeature, defaultValue: number): number {
    const R = 2.5
    switch (feature) {
        case WorldFeature.IterationsPerFrame:
            return defaultValue * 2
        case WorldFeature.Gravity:
            return defaultValue * 0.4
        case WorldFeature.Drag:
            return defaultValue * 5
        case WorldFeature.ShapingStiffnessFactor:
            return defaultValue * 2
        case WorldFeature.PushRadius:
            return defaultValue * 3
        case WorldFeature.PullRadius:
            return defaultValue * 2
        case WorldFeature.JointRadiusFactor:
            return defaultValue * 0.8
        case WorldFeature.PretensingCountdown:
            return defaultValue * 5
        case WorldFeature.MaxStrain:
            return defaultValue * 0.1
        case WorldFeature.PretenstFactor:
            return defaultValue * 0.3
        case WorldFeature.StiffnessFactor:
            return defaultValue * 60.0
        case WorldFeature.PushOverPull:
            return 0.25
        case WorldFeature.RibbonLongLength:
            return defaultValue * R * 0.66
        case WorldFeature.RibbonPushLength:
        case WorldFeature.RibbonShortLength:
            return defaultValue * R
        default:
            return defaultValue
    }
}


const RIBBON_HEIGHT = 1
const RIBBON_PUSH_LINEAR_DENSITY = 1

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
}

export function ribbon(tensegrity: Tensegrity, size: number): IHook[][] {
    const ribbonShort = tensegrity.numericFeature(WorldFeature.RibbonShortLength)
    const ribbonLong = tensegrity.numericFeature(WorldFeature.RibbonLongLength)
    const joint = (x: number, left: boolean): IJoint => {
        const z = ribbonLong * (left ? -0.5 : 0.5)
        const location = new Vector3(x, RIBBON_HEIGHT, z)
        const jointIndex = tensegrity.createJoint(location)
        const ribbonJoint: IJoint = {
            index: jointIndex,
            oppositeIndex: -1,
            location: () => tensegrity.instance.jointLocation(jointIndex),
        }
        tensegrity.joints.push(ribbonJoint)
        return ribbonJoint
    }
    const interval = (alpha: IJoint, omega: IJoint, intervalRole: IntervalRole): IInterval => {
        const scale = percentOrHundred()
        const stiffness = scaleToInitialStiffness(scale)
        const linearDensity = intervalRole === IntervalRole.RibbonPush ? RIBBON_PUSH_LINEAR_DENSITY : Math.sqrt(stiffness)
        return tensegrity.createInterval(alpha, omega, intervalRole, scale, stiffness, linearDensity, 1000)
    }
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
    const hanger = (alpha: IJoint, omega: IJoint): IInterval => {
        const intervalRole = IntervalRole.RibbonHanger
        const length = alpha.location().distanceTo(omega.location())
        const scale = factorToPercent(length)
        const stiffness = scaleToInitialStiffness(scale)
        const linearDensity = Math.sqrt(stiffness)
        return tensegrity.createInterval(alpha, omega, intervalRole, scale, stiffness, linearDensity, 1000)
    }
    for (let arch = 0; arch < 4; arch++) {
        const h = hooks[arch]
        h.forEach((hook, index) => {
            const rj = J[arch][1 + index]
            hook.face.joints.forEach(hookJoint => hanger(rj, hookJoint))
        })
    }
    hanger(J[Arch.FrontRight][0], tensegrity.joints[11])
    hanger(J[Arch.FrontLeft][0], tensegrity.joints[10])
    hanger(J[Arch.FrontRight][0], tensegrity.joints[9])
    hanger(J[Arch.FrontLeft][0], tensegrity.joints[8])
    return hooks
}

function hookFilter(hook: IHook): boolean {
    const {arch, distance} = hook
    if (distance <= 1) {
        return false
    }
    switch (hook.triangle) {
        case Triangle.NPN:
            return arch === Arch.BackRight && distance <= 5
        case Triangle.NNP:
            return arch === Arch.FrontRight && distance <= 5
        case Triangle.PNP:
            return arch === Arch.BackLeft && distance <= 5
        case Triangle.PPN:
            return arch === Arch.FrontLeft && distance <= 5
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
        const name = `[${arch}]:[${distance}:${Triangle[group]}]:{tri=${Triangle[triangle]}}`
        hooks[arch].push({face, name, arch, distance, group, triangle})
    })
    return [
        hooks[Arch.FrontLeft].filter(hookFilter),
        hooks[Arch.FrontRight].filter(hookFilter),
        hooks[Arch.BackLeft].filter(hookFilter),
        hooks[Arch.BackRight].filter(hookFilter),
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

