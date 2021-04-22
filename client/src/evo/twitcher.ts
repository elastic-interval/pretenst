/*
 * Copyright (c) 2020. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { GeneName, GeneReader, Genome, ITwitch } from "./genome"
import { Direction, directionGene, DIRECTIONS, IMuscle, IRunnerState } from "./runner-logic"

export type Twitch = (muscle: IMuscle, attack: number, decay: number, twitchNuance: number) => void

const MUSCLE_PERIOD = 600
const TICKS_PER_SLICE = 4
const TWITCH_NUANCE = 0.3

interface ITwitchConfig {
    ticksPerSlice: number
    twitchNuance: number
    musclePeriod: number
    attackPeriod: number
    decayPeriod: number
}

function readTwichConfig(genome: Genome): ITwitchConfig {
    const musclePeriod = genome.createReader(GeneName.MusclePeriod).modifyFeature(MUSCLE_PERIOD)
    return <ITwitchConfig>{
        ticksPerSlice: genome.createReader(GeneName.TicksPerSlice).modifyFeature(TICKS_PER_SLICE),
        twitchNuance: genome.createReader(GeneName.TwitchNuance).modifyFeature(TWITCH_NUANCE),
        musclePeriod,
        attackPeriod: genome.createReader(GeneName.AttackPeriod).modifyFeature(musclePeriod),
        decayPeriod: genome.createReader(GeneName.DecayPeriod).modifyFeature(musclePeriod),
    }
}

export class Twitcher {
    public cycleCount = 0
    public twitchCount = 0
    private config: ITwitchConfig
    private ticks: number = 0
    private twitchCycles: Record<string, TwitchCycle> = {}

    constructor(private state: IRunnerState) {
        const genome = this.state.genome
        this.config = readTwichConfig(genome)
        const totalTwitches = genome.totalTwitches
        DIRECTIONS.filter(d => d !== Direction.Rest).forEach(direction => {
            const geneName = directionGene(direction)
            const reader = genome.createReader(geneName)
            this.twitchCycles[direction] = new TwitchCycle(reader, this.config, state.muscles, totalTwitches)
        })
    }

    public toString(): string {
        const cycles = Object.keys(this.twitchCycles)
            .map(k => this.twitchCycles[k]).map(c => c.toString()).join("\n")
        return `Twitcher(${cycles})`
    }

    public tick(twitch: Twitch): boolean {
        this.ticks--
        if (this.ticks < 0) {
            this.ticks = this.config.ticksPerSlice
            const state = this.state
            state.timeSlice++
            if (state.timeSlice >= 36) {
                state.timeSlice = 0
                this.cycleCount++
                return true
            }
            const twitchCycle = this.twitchCycles[state.direction]
            if (twitchCycle) {
                this.twitchCount += twitchCycle.activate(state.timeSlice, twitch)
            }
        }
        return false
    }
}

class TwitchCycle {
    private slices: Record<number, ITwitch[]> = {}

    constructor(geneReader: GeneReader, config: ITwitchConfig, muscles: IMuscle[], totalTwitches: number) {
        let remainingMuscles = [...muscles]
        const removeMuscle = (muscle: IMuscle) => {
            remainingMuscles = remainingMuscles.filter(({intervalIndex}) => muscle.intervalIndex !== intervalIndex)
        }
        while (totalTwitches-- > 0) {
            const {attackPeriod, decayPeriod, twitchNuance} = config
            const twitch = geneReader.readMuscleTwitch(remainingMuscles, attackPeriod, decayPeriod, twitchNuance)
            this.addTwitch(twitch.when, twitch)
            removeMuscle(twitch.muscle)
        }
    }

    public toString(): string {
        const twitches = Object.keys(this.slices)
            .map(k => this.slices[k])
            .map((twitchArray: ITwitch[]) => twitchArray
                .map(twitch => `${twitch.when}:${twitch.muscle.intervalIndex}`)
                .join(";"))
            .join(",")
        return `Cycle(${twitches})`
    }

    public activate(timeSlice: number, twitch: Twitch): number {
        const slice = this.slices[timeSlice]
        if (!slice) {
            return 0
        }
        slice.forEach(({muscle, attack, decay, twitchNuance}) => twitch(muscle, attack, decay, twitchNuance))
        return slice.length
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

