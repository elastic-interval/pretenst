/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { FabricFeature, Stage } from "eig"

import { Tensegrity } from "./tensegrity"
import { TensegrityOptimizer } from "./tensegrity-optimizer"

export interface ITransitionPrefs {
    strainToStiffness?: boolean
    adoptLengths?: boolean
}

export class Life {
    private _stage: Stage

    constructor(private numericFeature: (fabricFeature: FabricFeature) => number, private tensegrity: Tensegrity, stage: Stage) {
        this._stage = stage
    }

    public withStage(stage: Stage, prefs?: ITransitionPrefs): Life {
        this.transition(stage, prefs)
        this._stage = stage
        return new Life(this.numericFeature, this.tensegrity, stage)
    }

    public get stage(): Stage {
        return this._stage
    }

    private transition(stage: Stage, prefs?: ITransitionPrefs): void {
        switch (this._stage) {
            case Stage.Growing:
                switch (stage) {
                    case Stage.Shaping:
                        this.tensegrity.save()
                        return
                }
                break
            case Stage.Shaping:
                switch (stage) {
                    case Stage.Slack:
                        if (prefs && prefs.adoptLengths) {
                            this.tensegrity.instance.fabric.adopt_lengths()
                            const faceIntervals = [...this.tensegrity.faceIntervals]
                            faceIntervals.forEach(interval => this.tensegrity.removeFaceInterval(interval))
                            this.tensegrity.save()
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
                        if (prefs) {
                            if (prefs.strainToStiffness) {
                                new TensegrityOptimizer(this.tensegrity).stiffnessesFromStrains()
                                return
                            } else if (prefs.adoptLengths) {
                                this.tensegrity.instance.fabric.adopt_lengths()
                                this.tensegrity.save()
                                return
                            }
                        }
                }
                break
        }
        throw new Error(`No transition ${Stage[this._stage]} to ${Stage[stage]}`)
    }
}

