/*
 * Copyright (c) 2020. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { GeneReader, ITwitch } from "./genome"
import { IMuscle, oppositeMuscleIndex } from "./gotchi"

export class TimeCycle {
    private slices: Record<number, ISlice> = {}

    constructor(geneReader: GeneReader, muscles: IMuscle[], twitchCount: number, attackPeriod: number, decayPeriod: number) {
        while (twitchCount-- > 0) {
            const twitch = geneReader.readMuscleTwitch(muscles.length, attackPeriod, decayPeriod)
            this.addTwitch(twitch.when, twitch)
            const oppositeMuscle = oppositeMuscleIndex(twitch.whichMuscle, muscles)
            const when = twitch.alternating ? (twitch.when + 18) % 36 : twitch.when
            this.addTwitch(twitch.when, {...twitch, whichMuscle: oppositeMuscle, when})
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

interface ISlice {
    twitches: ITwitch[]
}
