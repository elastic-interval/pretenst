/*
 * Copyright (c) 2020. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { GeneName, GeneReader, Genome, ITwitch } from "./genome"
import { Direction, directionGene, DIRECTIONS, IGotchiState, IMuscle, oppositeMuscleIndex } from "./gotchi"

export type Twitch = (face: number, attack: number, decay: number, intensity: number) => void

interface ITwitchConfig {
    ticksPerSlice: number
    twitchIntensity: number
    musclePeriod: number
    attackPeriod: number
    decayPeriod: number
}

function readTwichConfig(genome: Genome): ITwitchConfig {
    const generation = genome.generation
    const musclePeriod = genome.createReader(GeneName.MusclePeriod).modifyFeature(400, generation)
    return <ITwitchConfig>{
        ticksPerSlice: genome.createReader(GeneName.TicksPerSlice).modifyFeature(5, generation),
        twitchIntensity: genome.createReader(GeneName.TwitchIntensity).modifyFeature(0.5, generation),
        musclePeriod,
        attackPeriod: genome.createReader(GeneName.AttackPeriod).modifyFeature(musclePeriod, generation),
        decayPeriod: genome.createReader(GeneName.DecayPeriod).modifyFeature(musclePeriod, generation),
    }
}

export class Twitcher {
    public cycleCount = 0
    private config: ITwitchConfig
    private ticks: number = 0
    private twitchCycles: Record<string, TwitchCycle> = {}

    constructor(private state: IGotchiState) {
        const genome = this.state.genome
        this.config = readTwichConfig(genome)
        const generation = genome.generation
        const twitchCount = 1 + generation
        console.log("twitch config: ", JSON.stringify(this.config, (key, val) => (
            val.toFixed ? Number(val.toFixed(2)) : val
        )))
        DIRECTIONS.filter(d => d !== Direction.Rest).forEach(direction => {
            const geneName = directionGene(direction)
            const reader = genome.createReader(geneName)
            this.twitchCycles[direction] = new TwitchCycle(reader, this.config, state.muscles, twitchCount)
        })
    }

    public tick(twitch: Twitch, endCycle: () => void): void {
        this.ticks -= 1
        if (this.ticks < 0) {
            this.ticks = this.config.ticksPerSlice
            const state = this.state
            state.timeSlice++
            if (state.timeSlice >= 36) {
                state.timeSlice = 0
                this.cycleCount++
                endCycle()
            }
            const twitchCycle = this.twitchCycles[state.direction]
            if (twitchCycle) {
                twitchCycle.activate(state.timeSlice, twitch)
            }
        }
    }
}

class TwitchCycle {
    private slices: Record<number, ITwitch[]> = {}

    constructor(geneReader: GeneReader, config: ITwitchConfig, muscles: IMuscle[], twitchCount: number) {
        while (twitchCount-- > 0) {
            const {attackPeriod, decayPeriod, twitchIntensity} = config
            const twitch = geneReader.readMuscleTwitch(muscles.length, attackPeriod, decayPeriod, twitchIntensity)
            this.addTwitch(twitch.when, twitch)
            const oppositeMuscle = oppositeMuscleIndex(twitch.whichMuscle, muscles)
            const when = twitch.alternating ? (twitch.when + 18) % 36 : twitch.when
            this.addTwitch(when, {...twitch, whichMuscle: oppositeMuscle, when})
        }
    }

    public activate(timeSlice: number, twitch: Twitch): void {
        const slice = this.slices[timeSlice]
        if (!slice) {
            return
        }
        slice.forEach(({whichMuscle, attack, decay, intensity}) => twitch(whichMuscle, attack, decay, intensity))
    }

    private addTwitch(index: number, twitch: ITwitch): void {
        const slice = this.slices[index]
        if (slice) {
            slice.push(twitch)
        } else {
            this.slices[index] = [twitch]
        }
    }
}

