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

export const SHAPING_TIME = 1000

const GlobalScale = 5 / Math.sqrt(2)
const RibbonHeight = 9
const RibbonPushDensity = 1
const RibbonCount = 9
const HangerCount = 6
const BrickCount = 6
const BaseWidth = 9
const BaseLength = 46
const CenterExpand = 2
const AnchorLength = 5
const AnchorScale = 110

export function bridgeTenscript(): string {
    return (
        `'Melkvonder Ulft':` +
        `(` +
        ` A(${BrickCount},MA0),` +
        ` b(${BrickCount},MA1),` +
        ` a(${BrickCount},MA3),` +
        ` B(${BrickCount},MA2)` +
        `)` +
        `:0=anchor-(${BaseLength / 2},${BaseWidth / 2})-${AnchorLength}-${AnchorScale}` +
        `:1=anchor-(${BaseLength / 2},-${BaseWidth / 2})-${AnchorLength}-${AnchorScale}` +
        `:2=anchor-(-${BaseLength / 2},${BaseWidth / 2})-${AnchorLength}-${AnchorScale}` +
        `:3=anchor-(-${BaseLength / 2},-${BaseWidth / 2})-${AnchorLength}-${AnchorScale}`
    )
}

export function beforeShaping(tensegrity: Tensegrity): void {
    const brick = tensegrity.bricks[0]
    brick.pushes.forEach(interval => tensegrity.changeIntervalScale(interval, CenterExpand))
}

export function bridgeNumeric(feature: WorldFeature, defaultValue: number): number {
    switch (feature) {
        case WorldFeature.NexusPushLength:
        case WorldFeature.ColumnPushLength:
        case WorldFeature.TriangleLength:
        case WorldFeature.RingLength:
        case WorldFeature.CrossLength:
        case WorldFeature.BowMidLength:
        case WorldFeature.BowEndLength:
        case WorldFeature.RibbonHangerLength:
            const value = defaultValue * GlobalScale
            if (feature === WorldFeature.ColumnPushLength) {
                console.log("Column push", value.toFixed(2))
            }
            return value
        case WorldFeature.IterationsPerFrame:
            return defaultValue * 3
        case WorldFeature.IntervalCountdown:
            return defaultValue
        case WorldFeature.Gravity:
            return defaultValue * 0.1
        case WorldFeature.Drag:
            return defaultValue * 0.1
        case WorldFeature.ShapingStiffnessFactor:
            return defaultValue * 5
        case WorldFeature.PushRadius:
            return defaultValue * 3
        case WorldFeature.PullRadius:
            return defaultValue * 2
        case WorldFeature.JointRadiusFactor:
            return defaultValue * 0.8
        case WorldFeature.PretensingCountdown:
            return defaultValue * 4
        case WorldFeature.VisualStrain:
            return defaultValue
        case WorldFeature.SlackThreshold:
            return 0
        case WorldFeature.MaxStrain:
            return defaultValue * 0.1
        case WorldFeature.PretenstFactor:
            return defaultValue * 0.5
        case WorldFeature.StiffnessFactor:
            return defaultValue * 300.0
        case WorldFeature.PushOverPull:
            return 4
        case WorldFeature.RibbonLongLength:
        case WorldFeature.RibbonPushLength:
        case WorldFeature.RibbonShortLength:
            return defaultValue
        default:
            return defaultValue
    }
}

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

export function ribbon(tensegrity: Tensegrity): IHook[][] {
    const ribbonShort = tensegrity.numericFeature(WorldFeature.RibbonShortLength)
    const ribbonLong = tensegrity.numericFeature(WorldFeature.RibbonLongLength)
    const joint = (x: number, left: boolean): IJoint => {
        const z = ribbonLong * (left ? -0.5 : 0.5)
        const location = new Vector3(x, RibbonHeight, z)
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
        const linearDensity = intervalRole === IntervalRole.RibbonPush ? RibbonPushDensity : Math.sqrt(stiffness)
        return tensegrity.createInterval(alpha, omega, intervalRole, scale, stiffness, linearDensity, 100)
    }
    const L0 = joint(0, true)
    const R0 = joint(0, false)
    const J: IJoint[][] = [[L0], [R0], [L0], [R0]]
    for (let walk = 1; walk < RibbonCount; walk++) {
        const x = walk * ribbonShort
        J[Arch.FrontLeft].push(joint(x, true))
        J[Arch.FrontRight].push(joint(x, false))
        J[Arch.BackLeft].push(joint(-x, true))
        J[Arch.BackRight].push(joint(-x, false))
    }
    tensegrity.instance.refreshFloatView()
    interval(L0, R0, IntervalRole.RibbonLong)
    const joints = (index: number) => [J[0][index], J[1][index], J[2][index], J[3][index]]
    for (let walk = 1; walk < RibbonCount; walk++) {
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
    for (let walk = 2; walk < RibbonCount; walk++) {
        const prev = joints(walk - 2)
        const curr = joints(walk)
        interval(prev[0], curr[1], IntervalRole.RibbonPush)
        interval(prev[1], curr[0], IntervalRole.RibbonPush)
        interval(prev[2], curr[3], IntervalRole.RibbonPush)
        interval(prev[3], curr[2], IntervalRole.RibbonPush)
    }
    const hooks = extractHooks(tensegrity, HangerCount)
    const hanger = (alpha: IJoint, omega: IJoint): IInterval => {
        const intervalRole = IntervalRole.RibbonHanger
        const length = alpha.location().distanceTo(omega.location())
        const scale = factorToPercent(length)
        const stiffness = scaleToInitialStiffness(scale)
        const linearDensity = Math.sqrt(stiffness)
        return tensegrity.createInterval(alpha, omega, intervalRole, scale, stiffness, linearDensity, 10)
    }
    for (let arch = 0; arch < 4; arch++) {
        const h = [...hooks[arch]]
        h.forEach((hook, index) => {
            if (index === 0) {
                return
            }
            const rj = J[arch][1 + Math.floor(index / 3)]
            const hookJoint = hook.face.joints[hook.jointIndex]
            hanger(rj, hookJoint)
        })
    }
    hanger(J[Arch.FrontRight][0], tensegrity.joints[11])
    hanger(J[Arch.FrontLeft][0], tensegrity.joints[10])
    hanger(J[Arch.FrontRight][0], tensegrity.joints[9])
    hanger(J[Arch.FrontLeft][0], tensegrity.joints[8])
    return hooks
}

function extractHooks(tensegrity: Tensegrity, hangerCount: number): IHook[][] {
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
        face.joints.forEach(({}, jointIndex) => {
            const name = `[${arch}]:[${distance}:${Triangle[group]}]:{tri=${Triangle[triangle]}:J${jointIndex}`
            hooks[arch].push({face, name, arch, distance, group, triangle, jointIndex})
        })
    })
    const filter = (hook: IHook) => {
        const {arch, distance} = hook
        if (distance > hangerCount) {
            return false
        }
        switch (hook.triangle) {
            case Triangle.NPN:
                return arch === Arch.BackRight
            case Triangle.NNP:
                return arch === Arch.FrontRight
            case Triangle.PNP:
                return arch === Arch.BackLeft
            case Triangle.PPN:
                return arch === Arch.FrontLeft
            default:
                return false
        }
    }
    const center = tensegrity.bricks[0].location()
    const sortXY = (a: IHook, b: IHook) => {
        const aa = a.face.joints[a.jointIndex].location()
        const bb = b.face.joints[b.jointIndex].location()
        return aa.distanceToSquared(center) - bb.distanceToSquared(center)
    }
    return [
        hooks[Arch.FrontLeft].filter(filter).sort(sortXY),
        hooks[Arch.FrontRight].filter(filter).sort(sortXY),
        hooks[Arch.BackLeft].filter(filter).sort(sortXY),
        hooks[Arch.BackRight].filter(filter).sort(sortXY),
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

