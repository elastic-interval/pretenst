/*
 * Copyright (c) 2020. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { GeneReader } from "./genome"
import { IMuscle, Limb } from "./gotchi"


export class TimeCycle {
    private slices: Record<number, ISlice> = {}

    constructor(geneReader: GeneReader, muscles: IMuscle[], graspCount: number, twitchCount: number) {
        while (graspCount-- > 0) {
            const grasp = geneReader.readGrasp()
            this.addGrasp(grasp.when, grasp)
        }
        while (twitchCount-- > 0) {
            const twitch = geneReader.readMuscleTwitch(muscles.length)
            this.addTwitch(twitch.when, twitch)
        }
    }

    public activate(
        timeSlice: number,
        grasp: (limb: Limb, howLong: number) => void,
        twitch: (face: number, attack: number, decay: number) => void,
    ): void {
        const slice = this.slices[timeSlice]
        if (!slice) {
            return
        }
        slice.grasps.forEach(({whichLimbs, howLong}) => whichLimbs.forEach(limb => grasp(limb, howLong)))
        slice.twitches.forEach(({whichMuscle, attack, decay}) => twitch(whichMuscle, attack, decay))
    }

    private addGrasp(index: number, grasp: IGrasp): void {
        const slice = this.slices[index]
        if (slice) {
            slice.grasps.push(grasp)
        } else {
            this.slices[index] = {grasps: [grasp], twitches: []}
        }
    }

    private addTwitch(index: number, twitch: ITwitch): void {
        const slice = this.slices[index]
        if (slice) {
            slice.twitches.push(twitch)
        } else {
            this.slices[index] = {grasps: [], twitches: [twitch]}
        }
    }
}

export interface ITwitch {
    when: number,
    whichMuscle: number,
    attack: number,
    decay: number,
}

export interface IGrasp {
    when: number
    whichLimbs: Limb[],
    howLong: number,
}

interface ISlice {
    grasps: IGrasp[]
    twitches: ITwitch[]
}
