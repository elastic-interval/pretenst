/*
 * Copyright (c) 2020. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { WorldFeature } from "eig"
import { Vector3 } from "three"

import { IntervalRole, roleDefaultLength } from "../fabric/eig-util"
import { Tensegrity } from "../fabric/tensegrity"
import {
    FaceName,
    IFace,
    IInterval,
    IJoint,
    jointDistance,
    jointLocation,
    percentFromFactor,
    percentOrHundred,
} from "../fabric/tensegrity-types"

export const SHAPING_TIME = 1000

const RibbonHeight = 7
// const RibbonPushDensity = 2
const RibbonCount = 7
const HangerCount = 6
const BrickCount = 4
const BaseWidth = 18
const BaseLength = 50
const AnchorLength = 5
const AnchorScale = 110

/*

const RIBBON_WIDTH = 6
const RIBBON_STEP_LENGTH = 6

        case IntervalRole.RibbonPush:
            return Math.sqrt(RIBBON_WIDTH * RIBBON_WIDTH + RIBBON_STEP_LENGTH * RIBBON_STEP_LENGTH)
        case IntervalRole.RibbonShort:
            return RIBBON_STEP_LENGTH / 2
        case IntervalRole.RibbonLong:
            return RIBBON_WIDTH
        case IntervalRole.RibbonHanger:
            return 1


 */
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

export function bridgeNumeric(feature: WorldFeature, defaultValue: number): number {
    switch (feature) {
        case WorldFeature.IntervalCountdown:
            return defaultValue
        case WorldFeature.Gravity:
            return defaultValue * 0.03
        case WorldFeature.Drag:
            return defaultValue * 2
        case WorldFeature.ShapingStiffnessFactor:
            return defaultValue * 2
        case WorldFeature.PretensingCountdown:
            return defaultValue * 3
        case WorldFeature.VisualStrain:
            return defaultValue
        case WorldFeature.PretenstFactor:
            return defaultValue * 5
        case WorldFeature.StiffnessFactor:
            return defaultValue * 200.0
        case WorldFeature.PushOverPull:
            return 4
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
    jointIndex: number
}

export function ribbon(tensegrity: Tensegrity): IHook[][] {
    const ribbonShort = roleDefaultLength(IntervalRole.Cross)
    const ribbonLong = roleDefaultLength(IntervalRole.Cross)
    const joint = (x: number, left: boolean): IJoint => {
        const z = ribbonLong * (left ? -0.5 : 0.5)
        const location = new Vector3(x, RibbonHeight, z)
        const jointIndex = tensegrity.createJoint(location)
        const ribbonJoint: IJoint = {index: jointIndex, instance: tensegrity.instance}
        tensegrity.joints.push(ribbonJoint)
        return ribbonJoint
    }
    const interval = (alpha: IJoint, omega: IJoint, intervalRole: IntervalRole): IInterval => {
        const scale = percentOrHundred()
        return tensegrity.createScaledInterval(alpha, omega, intervalRole, scale)
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
    interval(L0, R0, IntervalRole.Pull)
    const joints = (index: number) => [J[0][index], J[1][index], J[2][index], J[3][index]]
    for (let walk = 1; walk < RibbonCount; walk++) {
        const prev = joints(walk - 1)
        const curr = joints(walk)
        interval(curr[0], curr[1], IntervalRole.Pull)
        interval(curr[2], curr[3], IntervalRole.Pull)
        for (let short = 0; short < 4; short++) {
            interval(prev[short], curr[short], IntervalRole.Pull)
        }
    }
    interval(J[Arch.FrontLeft][1], J[Arch.BackRight][1], IntervalRole.Push)
    interval(J[Arch.FrontRight][1], J[Arch.BackLeft][1], IntervalRole.Push)
    for (let walk = 2; walk < RibbonCount; walk++) {
        const prev = joints(walk - 2)
        const curr = joints(walk)
        interval(prev[0], curr[1], IntervalRole.Push)
        interval(prev[1], curr[0], IntervalRole.Push)
        interval(prev[2], curr[3], IntervalRole.Push)
        interval(prev[3], curr[2], IntervalRole.Push)
    }
    const hooks = extractHooks(tensegrity, HangerCount)
    const hanger = (alpha: IJoint, omega: IJoint): IInterval => {
        const intervalRole = IntervalRole.Pull
        const length = jointDistance(alpha, omega)
        const scale = percentFromFactor(length)
        return tensegrity.createScaledInterval(alpha, omega, intervalRole, scale)
    }
    for (let arch = 0; arch < 4; arch++) {
        const h = [...hooks[arch]]
        h.forEach((hook, index) => {
            if (index === 0) {
                return
            }
            const rj = J[arch][1 + Math.floor(index / 3)]
            const hookJoint = hook.face.ends[hook.jointIndex]
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
    tensegrity.faces.forEach(face => {
        // const gatherAncestors = (f: IFace, id: FaceName[]): Arch => {
        // const definition = BRICK_FACE_DEF[f.faceName]
        // id.push(definition.negative ? definition.opposite : definition.name)
        // const parentFace = f.brick.parentFace
        // if (parentFace) {
        //     return gatherAncestors(parentFace, id)
        // } else {
        //     return archFromFaceName(f.faceName)
        // }
        // return Arch.FrontRight
        // }
        const identities: FaceName[] = []
        const arch = Arch.FrontRight // TODO: This is wrong! Just so it will compile.
        const group = identities.shift()
        if (!group) {
            throw new Error("no top!")
        }
        if (group && isFaceExtremity(group)) {
            return
        }
        const distance = identities.length
        face.ends.forEach(({}, jointIndex) => {
            const name = `[${arch}]:[${distance}:${FaceName[group]}]:J${jointIndex}`
            hooks[arch].push({face, name, arch, distance, jointIndex})
        })
    })
    const filter = (hook: IHook) => {
        const {distance} = hook
        if (distance > hangerCount) {
            return false
        }
        // switch (hook.faceName) {
        //     case FaceName.NPN:
        //         return arch === Arch.BackRight
        //     case FaceName.NNP:
        //         return arch === Arch.FrontRight
        //     case FaceName.PNP:
        //         return arch === Arch.BackLeft
        //     case FaceName.PPN:
        //         return arch === Arch.FrontLeft
        //     default:
        //         return false
        // }
        return true // TODO: this is wrong!
    }
    const sortXY = (a: IHook, b: IHook) => {
        const aa = jointLocation(a.face.ends[a.jointIndex])
        const bb = jointLocation(b.face.ends[b.jointIndex])
        return aa.lengthSq() - bb.lengthSq()
    }
    return [
        hooks[Arch.FrontLeft].filter(filter).sort(sortXY),
        hooks[Arch.FrontRight].filter(filter).sort(sortXY),
        hooks[Arch.BackLeft].filter(filter).sort(sortXY),
        hooks[Arch.BackRight].filter(filter).sort(sortXY),
    ]
}

// function archFromFaceName(faceName: FaceName): Arch {
//     switch (faceName) {
//         case FaceName.NNN:
//             return Arch.BackLeft
//         case FaceName.PNN:
//             return Arch.BackRight
//         case FaceName.NPP:
//             return Arch.FrontLeft
//         case FaceName.PPP:
//             return Arch.FrontRight
//         default:
//             throw new Error("Strange arch")
//     }
// }

function isFaceExtremity(faceName: FaceName): boolean {
    return false // TODO
}

