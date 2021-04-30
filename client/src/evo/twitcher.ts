/*
 * Copyright (c) 2020. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { GeneName, GeneReader, ITwitch } from "./genome"
import { Direction, directionGene, DIRECTIONS, IMuscle, IRunnerState } from "./runner-logic"

export type TwitchFunction = (muscle: IMuscle, attack: number, decay: number, twitchNuance: number) => void

export interface ITwitchConfig {
    ticksPerSlice: number
    twitchNuance: number
    musclePeriod: number
    attackPeriod: number
    decayPeriod: number
}

export class Twitcher {
    public cycleCount = 0
    public twitchCount = 0
    private config: ITwitchConfig
    private ticks: number = 0
    private twitchCycles: Record<string, TwitchCycle> = {}

    constructor(private state: IRunnerState) {
        const genome = this.state.genome
        const readTwitchConfig = (): ITwitchConfig => {
            const reader = genome.createReader(GeneName.TwitchConfig)
            const musclePeriod = reader.readFeatureValue(600, 800)
            return <ITwitchConfig>{
                ticksPerSlice: reader.readFeatureValue(1, 3),
                twitchNuance: reader.readFeatureValue(0.1, 0.3),
                musclePeriod,
                attackPeriod: reader.readFeatureValue(0.5, 1) * musclePeriod,
                decayPeriod: reader.readFeatureValue(0.5, 1) * musclePeriod,
            }
        }
        this.config = readTwitchConfig()
        const totalTwitches = genome.totalTwitches
        DIRECTIONS.filter(d => d !== Direction.Rest).forEach(direction => {
            const geneName = directionGene(direction)
            const reader = genome.createReader(geneName)
            this.twitchCycles[direction] = new TwitchCycle(reader, this.config, this.state.loopMuscles, totalTwitches)
        })
    }

    public toString(): string {
        const cycles = Object.keys(this.twitchCycles)
            .map(k => this.twitchCycles[k]).map(c => c.toString()).join("\n")
        return `Twitcher(${cycles})`
    }

    public tick(twitch: TwitchFunction): boolean {
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

    constructor(reader: GeneReader, config: ITwitchConfig, loopMuscles: IMuscle[][], totalTwitches: number) {
        const loops = [...loopMuscles]
        while (totalTwitches-- > 0) {
            const chosen = reader.chooseFrom(loops.length)
            const twitch = reader.readMuscleTwitch(loops[chosen], config)
            loops.splice(chosen, 1)
            this.addTwitch(twitch.when, twitch)
        }
    }

    public toString(): string {
        const twitches = Object.keys(this.slices)
            .map(k => this.slices[k])
            .map((twitchArray: ITwitch[]) => twitchArray
                .map(twitch => `${twitch.when}:${twitch.muscle.interval.index}`)
                .join(";"))
            .join(",")
        return `Cycle(${twitches})`
    }

    public activate(timeSlice: number, twitch: TwitchFunction): number {
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

