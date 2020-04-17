/*
 * Copyright (c) 2020. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { BehaviorSubject } from "rxjs"
import { Vector3 } from "three"

import { CreateInstance } from "../fabric/fabric-instance"

import { fromGeneData, GeneName } from "./genome"
import { directionGene, Gotchi } from "./gotchi"

export const CYCLE_PATTERN = [5, 6, 7, 8, 9]

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
    proximity: number
    dead: boolean
    saved: boolean
}

export interface ICompetitor {
    name: string
    tosses: number,
    proximity: number
    dead: boolean
    saved: boolean
}

export interface IEvolutionSnapshot {
    cycle: number
    cycleIndex: number
    competitors: ICompetitor[]
}

export class Evolution {
    public readonly snapshotsSubject: BehaviorSubject<IEvolutionSnapshot>
    public evolvers: IEvolver[]
    public finished = false
    private cyclePatternIndex: number
    private cycleCount: number = 0
    private currentMaxCycles: number
    private readonly baseGotchi: Gotchi
    private survivorMidpoint: Vector3
    private gotchiMidpoint = new Vector3()

    constructor(
        private createInstance: CreateInstance,
        gotchi: Gotchi,
    ) {
        if (gotchi.embryo) {
            throw new Error("Cannot create evolution from gotchi which is not pretenst")
        }
        this.survivorMidpoint = gotchi.getMidpoint()
        const storedGenes = gotchi.patch.storedGenes
        this.baseGotchi = gotchi.recycled(createInstance(false, gotchi.fabricClone), storedGenes[0])
        this.currentMaxCycles = CYCLE_PATTERN[this.cyclePatternIndex = 0]
        this.baseGotchi.snapshot()
        this.baseGotchi.autopilot = true
        const gotchis: Gotchi[] = []
        while (gotchis.length < PARAM.maxPopulation) {
            const storedIndex = gotchis.length % storedGenes.length
            const survivor = gotchis.length < storedGenes.length
            const genome = fromGeneData(storedGenes[storedIndex])
            const instance = this.createInstance(false, this.baseGotchi.fabricClone)
            const geneData = survivor ?
                genome.geneData :
                genome.withDirectionMutations([directionGene(this.baseGotchi.direction)]).geneData
            const newborn = this.baseGotchi.recycled(instance, geneData)
            if (!newborn) {
                console.error("Unable to create gotchi")
                break
            }
            gotchis.push(newborn)
        }
        const proximity = this.baseGotchi.distanceFromTarget
        this.evolvers = gotchis.map((newborn, index) => {
            newborn.autopilot = true
            const name = index < storedGenes.length ?
                `${index}` :
                `${index}${letter(index - storedGenes.length)}`
            return <IEvolver>{
                index, name, gotchi: newborn, proximity, dead: false,
            }
        })
        this.snapshotsSubject = new BehaviorSubject<IEvolutionSnapshot>(this.snapshot)
    }

    public iterate(): number {
        this.evolvers.forEach(({gotchi}) => gotchi.iterate())
        const evolverCycleCount = this.evolvers.reduce((min, {gotchi}) => Math.max(min, gotchi.cycleCount), 0)
        if (evolverCycleCount >= this.currentMaxCycles) {
            this.sortEvolvers()
            this.markTheDead()
            const survivors = this.evolvers.filter(({dead}) => !dead)
            this.baseGotchi.patch.storedGenes = survivors.map(({gotchi}) => gotchi.genome.geneData)
            survivors.forEach(survivor => survivor.saved = true)
            this.evolvers.filter(({dead}) => dead).forEach(e => e.saved = false)
            this.snapshotsSubject.next(this.snapshot)
            this.nextGenerationFromSurvival()
            this.adjustLimit()
            this.cycleCount = -1
        } else if (evolverCycleCount > this.cycleCount) {
            this.cycleCount = evolverCycleCount
            this.sortEvolvers()
            this.snapshotsSubject.next(this.snapshot)
        }
        return evolverCycleCount
    }

    public getMidpoint(midpoint: Vector3): Vector3 {
        midpoint.copy(this.survivorMidpoint)
        return midpoint
    }

    public get target(): Vector3 {
        return this.baseGotchi.target
    }

    // Privates =============================================================

    private adjustLimit(): void {
        if (this.cyclePatternIndex === CYCLE_PATTERN.length - 1) {
            this.finished = true
            this.cyclePatternIndex = 0
            return
        }
        this.cyclePatternIndex++
        this.currentMaxCycles = CYCLE_PATTERN[this.cyclePatternIndex]
    }

    private sortEvolvers(): void {
        this.evolvers.forEach(evolver => {
            evolver.proximity = evolver.gotchi.getMidpoint(this.gotchiMidpoint).distanceTo(evolver.gotchi.target)
        })
        this.evolvers.sort((a: IEvolver, b: IEvolver) => a.proximity - b.proximity)
    }

    private get snapshot(): IEvolutionSnapshot {
        const cycle = this.cycleCount
        const cycleIndex = this.cyclePatternIndex
        const competitors = this.evolvers.map(evolver => {
            const {name, proximity, gotchi, dead, saved} = evolver
            const tosses = gotchi.genome.tosses
            const competitor: ICompetitor = {name, proximity, tosses, dead, saved}
            return competitor
        })
        return {cycle, cycleIndex, competitors}
    }

    private markTheDead(): void {
        const survivorCount = this.survivorCount
        this.survivorMidpoint.set(0, 0, 0)
        this.evolvers.forEach((evolver, evolverIndex) => {
            if (evolverIndex >= survivorCount) {
                evolver.dead = true
            } else {
                this.survivorMidpoint.add(evolver.gotchi.getMidpoint(this.gotchiMidpoint))
            }
        })
        this.cycleCount = CYCLE_PATTERN[this.cyclePatternIndex]
        this.survivorMidpoint.multiplyScalar(1.0 / survivorCount)
    }

    private nextGenerationFromSurvival(): void {
        const survivors = this.evolvers.filter(({dead}) => !dead)
        const perished = this.evolvers.filter(({dead}) => dead)
        survivors.forEach(evolver => {
            const instance = evolver.gotchi.adoptFabric(this.baseGotchi.fabricClone)
            evolver.gotchi = evolver.gotchi.recycled(instance, evolver.gotchi.genome.geneData)
            evolver.gotchi.autopilot = true
        })
        let parentIndex = 0
        perished.forEach((evolver, deadIndex) => {
            const survivorIndex = parentIndex % survivors.length
            const parent = survivors[survivorIndex]
            const instance = evolver.gotchi.adoptFabric(this.baseGotchi.fabricClone)
            evolver.gotchi = evolver.gotchi.recycled(instance, parent.gotchi.mutatedGeneData())
            evolver.name = `${parent.name}${letter(deadIndex)}`
            evolver.dead = false
            evolver.gotchi.autopilot = true
            parentIndex++
        })
    }

    private get survivorCount(): number {
        const {survivalRate} = PARAM
        return Math.ceil(this.evolvers.length * survivalRate)
    }
}

function letter(index: number): string {
    return String.fromCharCode(65 + index)
}
