/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { IntervalRole, WorldFeature } from "eig"
import { Vector3 } from "three"

import { Tensegrity } from "./tensegrity"
import { IInterval, IJoint, IPercent, percentToFactor } from "./tensegrity-types"

export function scaleToInitialStiffness(scale: IPercent): number {
    const scaleFactor = percentToFactor(scale)
    return Math.pow(scaleFactor, 0.5) * 0.00001
}

export class TensegrityOptimizer {

    constructor(private tensegrity: Tensegrity) {
    }

    public replaceCrosses(countdown: number): void {
        const tensegrity = this.tensegrity
        const pairs: IPair[] = []
        const findPush = (jointIndex: number): IPush => {
            const interval = tensegrity.intervals
                .filter(i => i.isPush)
                .find(i => i.alpha.index === jointIndex || i.omega.index === jointIndex)
            if (!interval) {
                throw new Error(`Cannot find ${jointIndex}`)
            }
            const joint: IJoint = interval.alpha.index === jointIndex ? interval.alpha : interval.omega
            return {interval, joint}
        }
        const crosses = tensegrity.intervals.filter(interval => interval.intervalRole === IntervalRole.Cross)
        crosses.forEach((intervalA, indexA) => {
            const aAlpha = intervalA.alpha.index
            const aOmega = intervalA.omega.index
            const aAlphaPush = findPush(aAlpha)
            const aOmegaPush = findPush(aOmega)
            const aAlphaLoc = intervalA.alpha.location()
            const aOmegaLoc = intervalA.omega.location()
            const aLength = aAlphaLoc.distanceTo(aOmegaLoc)
            const aMid = new Vector3().addVectors(aAlphaLoc, aOmegaLoc).multiplyScalar(0.5)
            crosses.forEach((intervalB, indexB) => {
                const bAlpha = intervalB.alpha.index
                const bOmega = intervalB.omega.index
                if (indexA >= indexB || aAlpha === bAlpha || aAlpha === bOmega || aOmega === bAlpha || aOmega === bOmega) {
                    return
                }
                const bAlphaPush = findPush(bAlpha)
                const bOmegaPush = findPush(bOmega)
                let push: IInterval | undefined
                let a: IJoint | undefined
                let x: IJoint | undefined
                let b: IJoint | undefined
                let y: IJoint | undefined
                const samePush = (pushA: IPush, pushB: IPush) => pushA.interval.index === pushB.interval.index
                if (samePush(aAlphaPush, bAlphaPush)) {
                    push = aAlphaPush.interval
                    a = intervalA.alpha
                    x = intervalA.omega
                    b = intervalB.alpha
                    y = intervalB.omega
                } else if (samePush(aAlphaPush, bOmegaPush)) {
                    push = aAlphaPush.interval
                    a = intervalA.alpha
                    x = intervalA.omega
                    b = intervalB.omega
                    y = intervalB.alpha
                } else if (samePush(aOmegaPush, bAlphaPush)) {
                    push = aOmegaPush.interval
                    a = intervalA.omega
                    x = intervalA.alpha
                    b = intervalB.alpha
                    y = intervalB.omega
                } else if (samePush(aOmegaPush, bOmegaPush)) {
                    push = aOmegaPush.interval
                    a = intervalA.omega
                    x = intervalA.alpha
                    b = intervalB.omega
                    y = intervalB.alpha
                } else {
                    return
                }
                const bAlphaLoc = intervalB.alpha.location()
                const bOmegaLoc = intervalB.omega.location()
                const bLength = bAlphaLoc.distanceTo(bOmegaLoc)
                const bMid = new Vector3().addVectors(bAlphaLoc, bOmegaLoc).multiplyScalar(0.5)
                const aAlphaMidB = aAlphaLoc.distanceTo(bMid) / bLength
                const aOmegaMidB = aOmegaLoc.distanceTo(bMid) / bLength
                const bAlphaMidA = bAlphaLoc.distanceTo(aMid) / aLength
                const bOmegaMidA = bOmegaLoc.distanceTo(aMid) / aLength
                let closeCount = 0
                const close = (dist: number) => {
                    if (dist < 0.5) {
                        closeCount++
                    }
                }
                close(aAlphaMidB)
                close(aOmegaMidB)
                close(bAlphaMidA)
                close(bOmegaMidA)
                if (closeCount < 2) {
                    return
                }
                const scale = push.scale
                pairs.push({scale, a, x, b, y})
            })
        })
        pairs.forEach(({scale, a, x, b, y}: IPair) => {
            const stiffness = scaleToInitialStiffness(scale)
            const linearDensity = Math.sqrt(stiffness)
            tensegrity.createInterval(x, y, IntervalRole.BowMid, scale, stiffness, linearDensity, countdown)
            const ax = tensegrity.findInterval(a, x)
            const ay = tensegrity.findInterval(a, y)
            const bx = tensegrity.findInterval(b, x)
            const by = tensegrity.findInterval(b, y)
            if (!(ax && bx && ay && by)) {
                console.log("Cannot find intervals during optimize")
                return
            }
            tensegrity.removeInterval(ax)
            tensegrity.removeInterval(by)
            this.tensegrity.changeIntervalRole(ay, IntervalRole.BowEnd, scale, countdown)
            this.tensegrity.changeIntervalRole(bx, IntervalRole.BowEnd, scale, countdown)
        })
    }

    public stiffnessesFromStrains(includeInterval: (interval: IInterval) => boolean): void {
        const pushOverPull = this.tensegrity.numericFeature(WorldFeature.PushOverPull)
        const {stiffnesses, linearDensities} = adjustedStiffness(this.tensegrity, includeInterval, pushOverPull)
        this.tensegrity.instance.restoreSnapshot()
        this.tensegrity.fabric.copy_material(stiffnesses, linearDensities)
    }
}

function adjustedStiffness(tensegrity: Tensegrity, includeInterval: (interval: IInterval) => boolean, pushOverPull: number): {
    stiffnesses: Float32Array,
    linearDensities: Float32Array,
} {
    const floatView = tensegrity.instance.floatView
    const strains: Float32Array = floatView.strains
    const getAverageStrain = (toAverage: IInterval[]) => {
        const included = toAverage.filter(includeInterval)
        const totalStrain = included.reduce((sum, interval) => sum + strains[interval.index], 0)
        return totalStrain / included.length
    }
    const intervals = tensegrity.intervals
    const pushes = intervals.filter(interval => interval.isPush)
    const averagePushStrain = getAverageStrain(pushes)
    const pulls = intervals.filter(interval => !interval.isPush)
    const averagePullStrain = getAverageStrain(pulls)
    const averageAbsoluteStrain = (-pushOverPull * averagePushStrain + averagePullStrain) / 2
    const changes = intervals.map(interval => {
        if (!includeInterval(interval)) {
            return 1
        }
        const absoluteStrain = strains[interval.index] * (interval.isPush ? -pushOverPull : 1)
        const normalizedStrain = absoluteStrain - averageAbsoluteStrain
        const strainFactor = normalizedStrain / averageAbsoluteStrain
        return 1 + strainFactor
    })
    const stiffnesses = floatView.stiffnesses.map((value, index) => value * changes[index])
    const linearDensities = floatView.linearDensities.map((value, index) => Math.sqrt(value * value * changes[index]))
    return {stiffnesses, linearDensities}
}

interface IPair {
    scale: IPercent
    a: IJoint
    x: IJoint
    b: IJoint
    y: IJoint
}

interface IPush {
    interval: IInterval
    joint: IJoint
}
