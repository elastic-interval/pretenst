/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { FabricFeature, Stage } from "eig"

import { Tensegrity } from "./tensegrity"
import { TensegrityOptimizer } from "./tensegrity-optimizer"

export interface ILifeTransition {
    stage: Stage
    strainToStiffness?: boolean
    adoptLengths?: boolean
}

export class Life {
    private _stage: Stage

    constructor(private numericFeature: (fabricFeature: FabricFeature) => number, private tensegrity: Tensegrity, stage: Stage) {
        this._stage = stage
    }

    public executeTransition(tx: ILifeTransition): Life {
        this.transition(tx)
        this._stage = tx.stage
        return new Life(this.numericFeature, this.tensegrity, tx.stage)
    }

    public get stage(): Stage {
        return this._stage
    }

    private transition({stage, adoptLengths, strainToStiffness}: ILifeTransition): void {
        const tensegrity = this.tensegrity
        switch (this._stage) {
            case Stage.Growing:
                switch (stage) {
                    case Stage.Shaping:
                        return
                }
                break
            case Stage.Shaping:
                switch (stage) {
                    case Stage.Slack:
                        if (adoptLengths) {
                            tensegrity.fabric.adopt_lengths()
                            const faceIntervals = [...tensegrity.faceIntervals]
                            faceIntervals.forEach(interval => tensegrity.removeFaceInterval(interval))
                            tensegrity.instance.snapshot()
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
                        if (strainToStiffness) {
                            new TensegrityOptimizer(tensegrity).stiffnessesFromStrains()
                            return
                        }
                        if (adoptLengths) {
                            tensegrity.fabric.adopt_lengths()
                            tensegrity.instance.snapshot()
                            return
                        }
                }
                break
        }
        throw new Error(`No transition ${Stage[this._stage]} to ${Stage[stage]}`)
    }
}

