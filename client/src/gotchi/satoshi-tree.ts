/*
 * Copyright (c) 2020. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { Stage } from "eig"

import { FabricInstance } from "../fabric/fabric-instance"
import { Tensegrity } from "../fabric/tensegrity"
import { IInterval } from "../fabric/tensegrity-types"

export class SatoshiTree {
    private shapingTime = 60
    private deadInterval?: IInterval

    constructor(public readonly name: string, private tensegrity: Tensegrity) {
    }

    public get instance(): FabricInstance {
        return this.tensegrity.instance
    }

    public removeRandomInterval(): void {
        if (!this.deadInterval && this.tensegrity.life$.getValue().stage === Stage.Pretenst) {
            this.deadInterval = this.tensegrity.intervals[Math.floor(Math.random() * this.tensegrity.intervals.length)]
        }
    }

    public iterate(): void {
        const stage = this.tensegrity.life$.getValue().stage
        const nextStage = this.tensegrity.iterate()
        if (stage === Stage.Pretensing && nextStage === Stage.Pretenst) {
            this.tensegrity.transition = {stage: Stage.Pretenst}
        } else if (nextStage !== undefined && nextStage !== stage && stage !== Stage.Pretensing) {
            this.tensegrity.transition = {stage: nextStage}
        }
        if (nextStage === Stage.Shaping) {
            if (this.shapingTime <= 0) {
                const instance = this.instance
                instance.fabric.adopt_lengths()
                instance.iterate(Stage.Slack)
                instance.iterate(Stage.Pretensing)
            } else {
                this.shapingTime--
                // console.log("shaping", this.shapingTime)
            }
        }
        if (this.deadInterval) {
            this.tensegrity.removeInterval(this.deadInterval)
            this.deadInterval = undefined
        }
    }
}
