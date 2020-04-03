/*
 * Copyright (c) 2020. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { Vector3 } from "three"

import { CreateInstance } from "../fabric/fabric-instance"

import { fromGenomeData } from "./genome"
import { directionGene, Gotchi } from "./gotchi"

export interface IEvolutionParameters {
    maxPopulation: number
    minCycleCount: number
    cycleExtension: number
    survivalRate: number
}

const PARAM: IEvolutionParameters = {
    maxPopulation: 10,
    minCycleCount: 3,
    cycleExtension: 5,
    survivalRate: 0.5,
}

export interface IEvolver {
    index: number
    gotchi: Gotchi
    distanceFromTarget: number
}

export class Evolution {
    public evolvers: IEvolver[]
    private minCycleCount: number
    private currentMaxCycles: number
    private readonly baseGotchi: Gotchi
    private midpoint: Vector3

    constructor(
        private createInstance: CreateInstance,
        gotchi: Gotchi,
    ) {
        if (!gotchi.isMature) {
            throw new Error("Cannot create evolution from gotchi which is not mature")
        }
        this.midpoint = gotchi.getMidpoint()
        this.baseGotchi = gotchi.recycled(createInstance(gotchi.fabricClone), gotchi.genome)
        this.minCycleCount = this.currentMaxCycles = PARAM.minCycleCount
        this.baseGotchi.snapshot()
        this.baseGotchi.autopilot = true
        this.baseGotchi.reorient()
        const gotchis: Gotchi[] = []
        while (gotchis.length < PARAM.maxPopulation) {
            const genome = this.baseGotchi.genome.withDirectionMutation(directionGene(this.baseGotchi.direction))
            const instance = this.createInstance(this.baseGotchi.fabricClone)
            const newborn = this.baseGotchi.recycled(instance, genome)
            if (!newborn) {
                console.error("Unable to create gotchi")
                break
            }
            gotchis.push(newborn)
        }
        this.evolvers = gotchis.map((newborn, index) => <IEvolver>{
            index, gotchi: newborn, distanceFromTarget: 1000,
        })
    }

    public iterate(): number {
        const maxCycleCount = this.evolvers.reduce((min, {gotchi}) => Math.max(min, gotchi.cycleCount), 0)
        if (maxCycleCount >= this.currentMaxCycles) {
            this.nextGenerationFromSurvival()
            this.adjustLimit()
        }
        this.evolvers.forEach(({gotchi}) => {
            for (let tick = 0; tick < 5; tick++) {
                gotchi.iterate()
            }
        })
        return maxCycleCount
    }

    public getMidpoint(midpoint: Vector3): void {
        midpoint.copy(this.midpoint)
        // this.baseGotchi.state.leg.getMidpoint(midpoint)
    }

    // Privates =============================================================

    private adjustLimit(): void {
        const maxCycleCount = this.minCycleCount + PARAM.cycleExtension
        this.currentMaxCycles++
        if (this.currentMaxCycles >= maxCycleCount) {
            this.minCycleCount++
            this.currentMaxCycles = this.minCycleCount
            this.rankEvolvers()
            this.baseGotchi.saveGenome(this.evolvers[0].gotchi.genome)
            if (this.minCycleCount > PARAM.minCycleCount + PARAM.cycleExtension) {
                this.minCycleCount = PARAM.minCycleCount
            }
        }
        console.log(`Cycles:${this.currentMaxCycles}`)
    }

    private rankEvolvers(): void {
        this.evolvers.forEach(evolver => {
            const view = evolver.gotchi.view
            const midpoint = new Vector3(view.midpoint_x(), view.midpoint_y(), view.midpoint_z())
            evolver.distanceFromTarget = midpoint.distanceTo(evolver.gotchi.target)
        })
        this.evolvers.sort((a: IEvolver, b: IEvolver) => a.distanceFromTarget - b.distanceFromTarget)
    }

    private nextGenerationFromSurvival(): void {
        this.rankEvolvers()
        const {survivalRate} = PARAM
        const rankList = this.evolvers.map(({distanceFromTarget}) => distanceFromTarget.toFixed(1))
        console.log(`ranked: ${rankList}`, this.evolvers[0].gotchi.genome.toString())
        const survivorCount = Math.floor(this.evolvers.length * survivalRate)
        const survivorMidpoints: Vector3[] = []
        this.evolvers.forEach((evolver, evolverIndex) => {
            if (evolverIndex < survivorCount) {
                survivorMidpoints.push(evolver.gotchi.getMidpoint())
            }
            const instance = evolver.gotchi.adoptFabric(this.baseGotchi.fabricClone)
            if (evolverIndex < survivorCount) {
                evolver.gotchi = evolver.gotchi.recycled(instance, evolver.gotchi.genome)
            } else {
                const parentIndex = Math.floor(survivorCount * Math.random())
                const mutatedGenome = fromGenomeData(this.evolvers[parentIndex].gotchi.mutatedGenes())
                // console.log(`replacing ${evolver.index} with offspring from ${parentIndex}`, mutatedGenome.toString())
                evolver.gotchi = evolver.gotchi.recycled(instance, mutatedGenome)
            }
        })
        this.midpoint.set(0,0,0)
        survivorMidpoints.forEach(m => this.midpoint.add(m))
        this.midpoint.multiplyScalar(1.0 / survivorMidpoints.length)
    }
}
