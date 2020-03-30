/*
 * Copyright (c) 2020. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { Vector3 } from "three"

import { CreateInstance } from "../fabric/fabric-instance"

import { fromGenomeData } from "./genome"
import { Direction, directionGene, Gotchi, IGotchiSeed } from "./gotchi"

export interface IEvolutionParameters {
    maxPopulation: number
    minCycleCount: number
    maxCycleCount: number
    survivalRate: number
    mutationCount: number
}

export interface IEvolver {
    index: number
    gotchi: Gotchi
    distanceFromTarget: number
}

export class Evolution {
    public evolvers: IEvolver[]
    private currentMaxCycles: number

    constructor(
        private createInstance: CreateInstance,
        private readonly baseGotchi: Gotchi,
        private param: IEvolutionParameters,
    ) {
        if (!baseGotchi.isMature) {
            throw new Error("Cannot create evolution from gotchi which is not mature")
        }
        if (baseGotchi.direction === Direction.Rest) {
            throw new Error("Cannot create evolution from gotchi which is not at rest")
        }
        this.currentMaxCycles = this.param.minCycleCount
        this.baseGotchi.instance.snapshot()
        const gotchis: Gotchi[] = []
        let genome = this.baseGotchi.hexalot.genome
        while (gotchis.length < this.param.maxPopulation) {
            genome = genome.withMutations(directionGene(this.baseGotchi.direction), param.mutationCount)
            const instance = this.createInstance(this.baseGotchi.instance.fabricClone)
            const muscles = this.baseGotchi.muscles
            const extremities = this.baseGotchi.extremities
            const timeSlice = this.baseGotchi.timeSlice
            const autopilot = true
            const direction = baseGotchi.direction
            const gotchi = this.baseGotchi.hexalot.newGotchi({instance, timeSlice, autopilot, direction, genome, muscles, extremities})
            if (!gotchi) {
                console.error("Unable to create gotchi")
                break
            }
            gotchis.push(gotchi)
        }
        this.evolvers = gotchis.map((gotchi, index) => <IEvolver>{index, gotchi, distanceFromTarget: 1000})
    }

    public iterate(midpoint: Vector3): number {
        // this.evolvers.forEach(({gotchi}) => gotchi.reorient())
        const maxCycleCount = this.evolvers.reduce((min, {gotchi}) => Math.max(min, gotchi.cycleCount), 0)
        if (maxCycleCount >= this.currentMaxCycles) {
            this.nextGenerationFromSurvival()
            this.adjustLimit()
        }
        midpoint.set(0, 0, 0)
        const gotchiMidpoint = new Vector3()
        this.evolvers.forEach(({gotchi}) => {
            for (let tick = 0; tick < 5; tick++) {
                gotchi.iterate(gotchiMidpoint)
            }
            midpoint.add(gotchiMidpoint)
        })
        midpoint.multiplyScalar(1.0 / this.evolvers.length)
        return maxCycleCount
    }

    // Privates =============================================================

    private adjustLimit(): void {
        const {maxCycleCount} = this.param
        this.currentMaxCycles++
        if (this.currentMaxCycles >= maxCycleCount) {
            this.currentMaxCycles = this.param.minCycleCount
            this.rankEvolvers()
            this.baseGotchi.hexalot.genome = this.evolvers[0].gotchi.genome
        }
        console.log(`Cycles:${this.currentMaxCycles}`)
    }

    private rankEvolvers(): void {
        this.evolvers.forEach(evolver => {
            const view = evolver.gotchi.instance.view
            const midpoint = new Vector3(view.midpoint_x(), view.midpoint_y(), view.midpoint_z())
            evolver.distanceFromTarget = midpoint.distanceTo(evolver.gotchi.target)
        })
        this.evolvers.sort((a: IEvolver, b: IEvolver) => a.distanceFromTarget - b.distanceFromTarget)
    }

    private nextGenerationFromSurvival(): void {
        this.rankEvolvers()
        const {survivalRate, mutationCount} = this.param
        console.log(`ranked: ${this.evolvers.map(({distanceFromTarget}) => distanceFromTarget.toFixed(1))}`)
        const survivorCount = Math.floor(this.evolvers.length * survivalRate)
        this.evolvers.forEach((evolver, evolverIndex) => {
            const instance = evolver.gotchi.instance.adoptFabric(this.baseGotchi.instance.fabricClone)
            const timeSlice = evolver.gotchi.timeSlice
            const autopilot = true
            const direction = this.baseGotchi.direction
            const muscles = this.baseGotchi.muscles
            const extremities = this.baseGotchi.extremities
            if (evolverIndex < survivorCount) {
                const genome = evolver.gotchi.genome
                evolver.gotchi = this.newGotchi({genome, instance, timeSlice, direction, autopilot, muscles, extremities})
                return
            } else {
                const parentIndex = Math.floor(survivorCount * Math.random())
                const genome = fromGenomeData(this.evolvers[parentIndex].gotchi.mutatedGenome(mutationCount))
                console.log(`replacing ${evolver.index} with offspring from ${parentIndex}`, genome.toString())
                evolver.gotchi = this.newGotchi({genome, instance, timeSlice, direction, autopilot, muscles, extremities})
            }
        })
    }

    private newGotchi(seed: IGotchiSeed): Gotchi {
        const gotchi = this.baseGotchi.hexalot.newGotchi(seed)
        if (!gotchi) {
            throw Error("Unable to create gotchi")

        }
        return gotchi
    }
}
