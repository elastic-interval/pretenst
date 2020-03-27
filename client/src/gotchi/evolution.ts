/*
 * Copyright (c) 2020. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { Vector3 } from "three"

import { CreateInstance } from "../fabric/fabric-instance"

import { fromGenomeData } from "./genome"
import { Gotchi, IGotchiSeed } from "./gotchi"

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
        this.currentMaxCycles = this.param.minCycleCount
        this.baseGotchi.instance.snapshot()
        const gotchis: Gotchi[] = []
        while (gotchis.length < this.param.maxPopulation) {
            const instance = this.createInstance(this.baseGotchi.instance.fabricClone)
            const muscles = this.baseGotchi.muscles
            const extremities = this.baseGotchi.extremities
            const gotchi = this.baseGotchi.hexalot.newGotchi({instance, muscles, extremities})
            if (!gotchi) {
                console.error("Unable to create gotchi")
                break
            }
            gotchis.push(gotchi)
        }
        this.evolvers = gotchis.map((gotchi, index) => <IEvolver>{index, gotchi, distanceFromTarget: 1000})
    }

    public get midpoint(): Vector3 {
        return this.evolvers.reduce((sum, evolver) => sum.add(evolver.gotchi.midpoint), new Vector3())
    }

    public iterate(): void {
        this.evolvers.forEach(({gotchi}) => gotchi.reorient())
        const moving = this.evolvers.filter(({gotchi}) => gotchi.cycleCount < this.currentMaxCycles)
        if (moving.length === 0) {
            this.adjustLimit()
            this.nextGenerationFromSurvival()
            return
        }
        moving.forEach(({gotchi}) => gotchi.iterate())
    }

    // Privates =============================================================

    private adjustLimit(): void {
        const {maxCycleCount} = this.param
        this.currentMaxCycles++
        if (this.currentMaxCycles >= maxCycleCount) {
            this.currentMaxCycles = this.param.minCycleCount
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
            const muscles = this.baseGotchi.muscles
            const extremities = this.baseGotchi.extremities
            if (evolverIndex < survivorCount) {
                const genome = evolver.gotchi.genome
                evolver.gotchi = this.newGotchi({genome, instance, muscles, extremities})
                return
            } else {
                const parentIndex = Math.floor(survivorCount * Math.random())
                const genome = fromGenomeData(this.evolvers[parentIndex].gotchi.mutatedGenome(mutationCount))
                console.log(`replacing ${evolver.index} with offspring from ${parentIndex}`, genome.toString())
                evolver.gotchi = this.newGotchi({genome, instance, muscles, extremities})
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
