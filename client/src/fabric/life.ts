/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { FabricFeature, Stage } from "eig"

import { TensegrityFabric } from "./tensegrity-fabric"
import { TensegrityOptimizer } from "./tensegrity-optimizer"

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
                        this.fabric.save()
                        return
                }
                break
            case Stage.Shaping:
                switch (stage) {
                    case Stage.Slack:
                        if (prefs && prefs.adoptLengths) {
                            this.fabric.instance.fabric.adopt_lengths()
                            this.fabric.save()
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
                                new TensegrityOptimizer(this.fabric).stiffnessesFromStrains()
                                return
                            } else if (prefs.adoptLengths) {
                                this.fabric.instance.fabric.adopt_lengths()
                                this.fabric.save()
                                return
                            }
                        }
                }
                break
        }
        throw new Error(`No transition ${Stage[this._stage]} to ${Stage[stage]}`)
    }
}

