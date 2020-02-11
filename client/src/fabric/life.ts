/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import {FabricFeature, Stage} from "eig"

import { TensegrityFabric } from "./tensegrity-fabric"
import { IInterval } from "./tensegrity-types"

export interface ITransitionPrefs {
    strainToStiffness?: boolean
    adoptLengths?: boolean
}

export class Life {
    private _stage: Stage

    constructor(private numericFeature: (fabricFeature: FabricFeature) => number, private fabric: TensegrityFabric, stage: Stage) {
        this._stage = stage
    }

    public withStage(stage: Stage, prefs?: ITransitionPrefs): Life {
        this.transition(stage, prefs)
        this._stage = stage
        return new Life(this.numericFeature, this.fabric, stage)
    }

    public get stage(): Stage {
        return this._stage
    }

    private transition(stage: Stage, prefs?: ITransitionPrefs): void {
        switch (this._stage) {
            case Stage.Growing:
                switch (stage) {
                    case Stage.Shaping:
                        this.save()
                        return
                }
                break
            case Stage.Shaping:
                switch (stage) {
                    case Stage.Slack:
                        if (prefs && prefs.adoptLengths) {
                            this.fabric.instance.fabric.adopt_lengths()
                            this.save()
                        }
                        return
                    case Stage.Realizing:
                        return
                }
                break
            case Stage.Slack:
                switch (stage) {
                    case Stage.Shaping:
                        return
                    case Stage.Realizing:
                        return
                }
                break
            case Stage.Realizing:
                switch (stage) {
                    case Stage.Realized:
                        return
                }
                break
            case Stage.Realized:
                switch (stage) {
                    case Stage.Slack:
                        if (prefs && prefs.strainToStiffness) {
                            const pushOverPull = this.numericFeature(FabricFeature.PushOverPull)
                            const {newStiffnesses, newLinearDensities} = adjustedStiffness(this.fabric, pushOverPull)
                            this.restore()
                            const instance = this.fabric.instance
                            newStiffnesses.forEach((value, index) => instance.floatView.stiffnesses[index] = value)
                            newLinearDensities.forEach((value, index) => instance.floatView.linearDensities[index] = value)
                            throw new Error("setting these values isn't going to work!")
                        }
                        if (prefs && prefs.adoptLengths) {
                            this.fabric.instance.fabric.adopt_lengths()
                            this.save()
                            return
                        } else {
                            this.restore()
                            return
                        }
                }
                break
        }
        throw new Error(`No transition ${Stage[this._stage]} to ${Stage[stage]}`)
    }

    private save(): void {
        // TODO
        // this.fabric.instance.engine.cloneInstance(this.fabric.instance.index, this.fabric.slackInstance.index)
        throw new Error("cannot save")
    }

    private restore(): void {
        // TODO
        // this.fabric.instance.engine.cloneInstance(this.fabric.slackInstance.index, this.fabric.instance.index)
        // FABRIC_FEATURES.forEach(fabricFeature => {
        //     this.fabric.instance.setFeatureValue(fabricFeature, this.numericFeature(fabricFeature))
        // })
        throw new Error("cannot restore")
    }
}

export function stiffnessToLinearDensity(stiffness: number): number {
    return Math.sqrt(stiffness)
}

function adjustedStiffness(fabric: TensegrityFabric, pushOverPull: number): {
    newStiffnesses: Float32Array,
    newLinearDensities: Float32Array,
} {
    const strains: Float32Array = fabric.instance.floatView.strains
    const existingStiffnesses = fabric.instance.floatView.stiffnesses
    const getAverageStrain = (toAverage: IInterval[]) => {
        const totalStrain = toAverage.reduce((sum, interval) => sum + strains[interval.index], 0)
        return totalStrain / toAverage.length
    }
    const intervals = fabric.intervals
    const pushes = intervals.filter(interval => interval.isPush)
    const averagePushStrain = getAverageStrain(pushes)
    const pulls = intervals.filter(interval => !interval.isPush)
    const averagePullStrain = getAverageStrain(pulls)
    const averageAbsoluteStrain = (-pushOverPull * averagePushStrain + averagePullStrain) / 2
    const changes = intervals.map(interval => {
        const absoluteStrain = strains[interval.index] * (interval.isPush ? -pushOverPull : 1)
        const normalizedStrain = absoluteStrain - averageAbsoluteStrain
        const strainFactor = normalizedStrain / averageAbsoluteStrain
        return 1 + strainFactor
    })
    const stiffness = existingStiffnesses.map((value, index) => value * changes[index])
    const linearDensities = stiffness.map(stiffnessToLinearDensity)
    return {newStiffnesses: stiffness, newLinearDensities: linearDensities}
}
