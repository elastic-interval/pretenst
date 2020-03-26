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
        switch (this._stage) {
            case Stage.Growing:
                switch (stage) {
                    case Stage.Shaping:
                        this.tensegrity.instance.snapshot()
                        return
                }
                break
            case Stage.Shaping:
                switch (stage) {
                    case Stage.Slack:
                        if (adoptLengths) {
                            this.tensegrity.fabric.adopt_lengths()
                            const faceIntervals = [...this.tensegrity.faceIntervals]
                            faceIntervals.forEach(interval => this.tensegrity.removeFaceInterval(interval))
                            this.tensegrity.instance.snapshot()
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
                            new TensegrityOptimizer(this.tensegrity).stiffnessesFromStrains()
                            return
                        }
                        if (adoptLengths) {
                            this.tensegrity.fabric.adopt_lengths()
                            this.tensegrity.instance.snapshot()
                            return
                        }
                }
                break
        }
        throw new Error(`No transition ${Stage[this._stage]} to ${Stage[stage]}`)
    }
}

