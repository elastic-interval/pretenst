/*
 * Copyright (c) 2020. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { GeneReader } from "./genome"
import { IMuscle, oppositeMuscleIndex } from "./gotchi"

export class TimeCycle {
    private slices: Record<number, ISlice> = {}

    constructor(geneReader: GeneReader, muscles: IMuscle[], twitchCount: number) {
        while (twitchCount-- > 0) {
            const twitch = geneReader.readMuscleTwitch(muscles.length)
            this.addTwitch(twitch.when, twitch)
            const oppositeTime = (twitch.when + 18) % 36
            const oppositeMuscle = oppositeMuscleIndex(twitch.whichMuscle, muscles)
            this.addTwitch(oppositeTime, {...twitch, whichMuscle: oppositeMuscle, when: oppositeTime})
        }
    }

    public activate(
        timeSlice: number,
        twitch: (face: number, attack: number, decay: number) => void,
    ): void {
        const slice = this.slices[timeSlice]
        if (!slice) {
            return
        }
        slice.twitches.forEach(({whichMuscle, attack, decay}) => twitch(whichMuscle, attack, decay))
    }

    private addTwitch(index: number, twitch: ITwitch): void {
        const slice = this.slices[index]
        if (slice) {
            slice.twitches.push(twitch)
        } else {
            this.slices[index] = {twitches: [twitch]}
        }
    }
}

export interface ITwitch {
    when: number,
    whichMuscle: number,
    attack: number,
    decay: number,
}

interface ISlice {
    twitches: ITwitch[]
}
