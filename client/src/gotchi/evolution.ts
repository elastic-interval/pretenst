/*
 * Copyright (c) 2020. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { BehaviorSubject } from "rxjs"
import { Vector3 } from "three"

import { CreateInstance } from "../fabric/fabric-instance"

import { fromGenomeData, Genome } from "./genome"
import { directionGene, Gotchi } from "./gotchi"

export const CYCLE_PATTERN = [
    3, 4, 5, 6,
    4, 5, 6, 7,
    5, 6, 7, 8,
]

export interface IEvolutionParameters {
    maxPopulation: number
    survivalRate: number
}

const PARAM: IEvolutionParameters = {
    maxPopulation: 10,
    survivalRate: 0.5,
}

export interface IEvolver {
    index: number
    name: string
    gotchi: Gotchi
    distanceFromTarget: number
    dead: boolean
    saved?: Genome
}

export interface ICompetitor {
    name: string
    generation: number,
    distanceFromTarget: number
    dead: boolean
    saved?: Genome
}

export interface IEvolutionSnapshot {
    cyclePatternIndex: number
    nextMaxCycles: number,
    competitors: ICompetitor[]
}

export class Evolution {
    public readonly snapshotSubject = new BehaviorSubject<IEvolutionSnapshot | undefined>(undefined)
    public evolvers: IEvolver[]
    public finished = false
    private cyclePatternIndex: number
    private currentMaxCycles: number
    private readonly baseGotchi: Gotchi
    private midpoint: Vector3

    constructor(
        private createInstance: CreateInstance,
        gotchi: Gotchi,
    ) {
        if (gotchi.embryo) {
            throw new Error("Cannot create evolution from gotchi which is not mature")
        }
        this.midpoint = gotchi.getMidpoint()
        this.baseGotchi = gotchi.recycled(createInstance(gotchi.fabricClone), gotchi.genome)
        this.currentMaxCycles = CYCLE_PATTERN[this.cyclePatternIndex = 0]
        this.baseGotchi.snapshot()
        this.baseGotchi.autopilot = true
        const gotchis: Gotchi[] = []
        const baseGenome = this.baseGotchi.genome
        while (gotchis.length < PARAM.maxPopulation) {
            const genome = gotchis.length === 0 ? baseGenome : baseGenome.withDirectionMutation(directionGene(this.baseGotchi.direction))
            const instance = this.createInstance(this.baseGotchi.fabricClone)
            const newborn = this.baseGotchi.recycled(instance, genome)
            if (!newborn) {
                console.error("Unable to create gotchi")
                break
            }
            gotchis.push(newborn)
        }
        const distanceFromTarget = this.baseGotchi.distanceFromTarget
        this.evolvers = gotchis.map((newborn, index) => <IEvolver>{
            index, name: index.toString(), gotchi: newborn, distanceFromTarget, dead: false,
        })
    }

    public iterate(): number {
        const maxCycleCount = this.evolvers.reduce((min, {gotchi}) => Math.max(min, gotchi.cycleCount), 0)
        if (maxCycleCount >= this.currentMaxCycles) {
            this.nextGenerationFromSurvival()
            this.adjustLimit()
        }
        this.evolvers.forEach(({gotchi}) => gotchi.iterate())
        return maxCycleCount
    }

    public getMidpoint(midpoint: Vector3): Vector3 {
        midpoint.copy(this.midpoint)
        // this.baseGotchi.state.leg.getMidpoint(midpoint)
        return midpoint
    }

    public get target(): Vector3 {
        return this.baseGotchi.target
    }

    // Privates =============================================================

    private get snapshot(): IEvolutionSnapshot {
        return {
            cyclePatternIndex: this.cyclePatternIndex,
            nextMaxCycles: this.cyclePatternIndex < CYCLE_PATTERN.length - 1 ? CYCLE_PATTERN[this.cyclePatternIndex + 1] : 0,
            competitors: this.evolvers.map(({name, distanceFromTarget, gotchi, dead, saved}) => {
                const generation = gotchi.genome.generation
                return ({name, distanceFromTarget, generation, dead, saved})
            }),
        }
    }

    private adjustLimit(): void {
        const previousMaxCycles = CYCLE_PATTERN[this.cyclePatternIndex]
        if (this.cyclePatternIndex === CYCLE_PATTERN.length - 1) {
            this.finished = true
            this.cyclePatternIndex = 0
            this.baseGotchi.saveGenome(this.evolvers[0].gotchi.genome)
            return
        }
        this.cyclePatternIndex++
        this.currentMaxCycles = CYCLE_PATTERN[this.cyclePatternIndex]
        if (this.currentMaxCycles < previousMaxCycles) {
            this.evolvers.forEach((evolver, index) => {
                if (index === 0) {
                    this.baseGotchi.saveGenome(evolver.gotchi.genome)
                    evolver.saved = evolver.gotchi.genome
                } else {
                    evolver.saved = undefined
                }
            })
        }
    }

    private nextGenerationFromSurvival(): void {
        const gotchiMidpoint = new Vector3()
        this.evolvers.forEach(evolver => {
            evolver.distanceFromTarget = evolver.gotchi.getMidpoint(gotchiMidpoint).distanceTo(evolver.gotchi.target)
        })
        this.evolvers.sort((a: IEvolver, b: IEvolver) => a.distanceFromTarget - b.distanceFromTarget)
        const survivorCount = this.survivorCount
        this.midpoint.set(0, 0, 0)
        this.evolvers.forEach((evolver, evolverIndex) => {
            if (evolverIndex >= survivorCount) {
                evolver.dead = true
            } else {
                this.midpoint.add(evolver.gotchi.getMidpoint(gotchiMidpoint))
            }
        })
        this.midpoint.multiplyScalar(1.0 / survivorCount)
        this.snapshotSubject.next(this.snapshot)
        this.evolvers.forEach((evolver, evolverIndex) => {
            const instance = evolver.gotchi.adoptFabric(this.baseGotchi.fabricClone)
            if (evolver.dead) {
                const parent = this.evolvers[Math.floor(survivorCount * Math.random())]
                const mutatedGenome = fromGenomeData(parent.gotchi.mutatedGenes())
                evolver.gotchi = evolver.gotchi.recycled(instance, mutatedGenome)
                evolver.name = `${parent.name}${String.fromCharCode(65 + evolverIndex - survivorCount)}`
                evolver.dead = false
            } else {
                evolver.gotchi = evolver.gotchi.recycled(instance, evolver.gotchi.genome)
            }
            evolver.gotchi.instance.refreshFloatView()
            evolver.gotchi.reorient()
        })
    }

    private get survivorCount(): number {
        const {survivalRate} = PARAM
        return Math.ceil(this.evolvers.length * survivalRate)
    }
}
