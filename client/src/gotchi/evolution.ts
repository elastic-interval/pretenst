/*
 * Copyright (c) 2020. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { BehaviorSubject } from "rxjs"
import { Vector3 } from "three"

import { CreateInstance } from "../fabric/fabric-instance"

import { fromGeneData } from "./genome"
import { directionGene, Gotchi } from "./gotchi"

export interface IEvolutionParameters {
    maxPopulation: number
    survivalRate: number
}

const PARAM: IEvolutionParameters = {
    maxPopulation: 16,
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
    reachedTarget: boolean
}

export interface IEvolutionSnapshot {
    cyclePattern: number[]
    cycle: number
    cycleIndex: number
    competitors: ICompetitor[]
}

export class Evolution {
    public readonly snapshotsSubject = new BehaviorSubject<IEvolutionSnapshot[]>([])
    public evolvers: IEvolver[]
    public finished = false
    private cyclePatternIndex: number
    private cycleCount: number = 0
    private currentMaxCycles: number
    private readonly baseGotchi: Gotchi
    private survivorMidpoint: Vector3
    private gotchiMidpoint = new Vector3()

    constructor(
        private cyclePattern: number[],
        private reachedTarget: () => void,
        private createInstance: CreateInstance,
        gotchi: Gotchi,
    ) {
        if (gotchi.embryo) {
            throw new Error("Cannot create evolution from gotchi which is not pretenst")
        }
        this.survivorMidpoint = gotchi.getMidpoint()
        const storedGenes = gotchi.patch.storedGenes
        this.baseGotchi = gotchi.recycled(createInstance(false, gotchi.fabricClone), storedGenes[0])
        this.currentMaxCycles = this.cyclePattern[this.cyclePatternIndex = 0]
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
                genome.withMutations([directionGene(this.baseGotchi.direction)]).geneData
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
            const saved = index < storedGenes.length
            const name = `${letter(index)}${saved ? "" : letter(index - storedGenes.length)}`
            return <IEvolver>{index, name, gotchi: newborn, proximity, dead: false, saved}
        })
    }

    public iterate(): number {
        this.evolvers.forEach(({gotchi}) => gotchi.iterate())
        const completeGeneration = () => {
            this.sortEvolvers()
            this.markTheDead()
            const survivors = this.evolvers.filter(({dead}) => !dead)
            this.baseGotchi.patch.storedGenes = survivors.map(({gotchi}) => gotchi.genome.geneData)
            survivors.forEach(survivor => survivor.saved = true)
            this.evolvers.filter(({dead}) => dead).forEach(e => e.saved = false)
            this.takeSnapshot()
        }
        const evolverCycleCount = this.evolvers.reduce((min, {gotchi}) => Math.max(min, gotchi.cycleCount), 0)
        if (evolverCycleCount >= this.currentMaxCycles) {
            completeGeneration()
            this.nextGenerationFromSurvival()
            if (this.cyclePatternIndex === this.cyclePattern.length - 1) {
                this.finished = true
                this.cyclePatternIndex = 0
            } else {
                this.cyclePatternIndex++
                this.currentMaxCycles = this.cyclePattern[this.cyclePatternIndex]
            }
            this.cycleCount = -1
        } else if (evolverCycleCount > this.cycleCount) {
            const evolversAtTarget = this.evolvers.filter(({gotchi}) => gotchi.state.reachedTarget).length
            if (evolversAtTarget > this.survivorCount / 2) {
                completeGeneration()
                this.reachedTarget()
                this.finished = true
                return 0
            }
            this.cycleCount = evolverCycleCount
            this.sortEvolvers()
            this.takeSnapshot()
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

    private sortEvolvers(): void {
        this.evolvers.forEach(evolver => {
            evolver.proximity = evolver.gotchi.getMidpoint(this.gotchiMidpoint).distanceTo(evolver.gotchi.target)
        })
        this.evolvers.sort((a: IEvolver, b: IEvolver) => a.proximity - b.proximity)
    }

    private takeSnapshot(): void {
        const cycle = this.cycleCount
        const cycleIndex = this.cyclePatternIndex
        const competitors = this.evolvers.map(evolver => {
            const {name, proximity, gotchi, dead, saved} = evolver
            const tosses = gotchi.genome.tosses
            const reachedTarget = gotchi.state.reachedTarget
            const competitor: ICompetitor = {name, proximity, tosses, dead, saved, reachedTarget}
            return competitor
        })
        const cyclePattern = this.cyclePattern
        const snapshot = {cycle, cyclePattern, cycleIndex, competitors}
        const snapshots = this.snapshotsSubject.getValue()
        const alreadyHere = snapshots.findIndex(s => snapshot.cycleIndex === s.cycleIndex)
        if (alreadyHere < 0) {
            this.snapshotsSubject.next([...snapshots, snapshot])
        } else if (alreadyHere === snapshots.length - 1) {
            const copy = [...snapshots]
            copy[alreadyHere] = snapshot
            this.snapshotsSubject.next(copy)
        } else {
            this.snapshotsSubject.next([snapshot])
        }
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
        this.cycleCount = this.cyclePattern[this.cyclePatternIndex]
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

export function letter(index: number): string {
    return String.fromCharCode(65 + index)
}
