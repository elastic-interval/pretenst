/*
 * Copyright (c) 2020. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { BehaviorSubject } from "rxjs"
import { Vector3 } from "three"

import { CreateInstance } from "../fabric/fabric-instance"

import { fromGeneData, Genome } from "./genome"
import { directionGene, Gotchi } from "./gotchi"

export interface IEvolutionParameters {
    cyclePattern: number[]
    persistentPopulation: number
    candidatePopulation: number
}

export const EVO_PARAMETERS: IEvolutionParameters = {
    cyclePattern: [5, 6, 7, 8, 9, 10],
    persistentPopulation: 8,
    candidatePopulation: 8,
}

export enum EvolutionPhase {
    WinnersAdvance,
    CandidatesBorn,
    CandidatesReborn,
    CandidatesAdvance,
    WinnersPersist,
    EvolutionAdvance,
    EvolutionComplete,
}

export interface IEvolverState {
    index: number
    name: string
    tosses: number,
    proximity: number
    reachedTarget?: boolean,
    persisted?: boolean
}

export interface IEvolver {
    gotchi: Gotchi
    state: IEvolverState
}

export interface IEvolutionSnapshot {
    cyclePattern: number[]
    cycle: number
    cycleIndex: number
    evolverStates: IEvolverState[]
}

export class Evolution {
    public readonly snapshotsSubject = new BehaviorSubject<IEvolutionSnapshot[]>([])
    public winners: IEvolver[] = []
    public candidates: IEvolver[] = []
    public phase = EvolutionPhase.WinnersAdvance
    private cyclePatternIndex: number
    private cycleCount: number = 0
    private currentMaxCycles: number
    private readonly baseGotchi: Gotchi
    private gotchiMidpoint = new Vector3()

    constructor(
        private cyclePattern: number[],
        private createInstance: CreateInstance,
        gotchi: Gotchi,
    ) {
        if (gotchi.embryo) {
            throw new Error("Cannot create evolution from gotchi which is not pretenst")
        }
        const storedGenes = gotchi.patch.storedGenes
        this.baseGotchi = gotchi.recycled(createInstance(true, gotchi.fabricClone), storedGenes[0])
        this.baseGotchi.snapshot()
        this.baseGotchi.autopilot = true
        this.currentMaxCycles = this.cyclePattern[this.cyclePatternIndex = 0]
        const winners: Gotchi[] = []
        while (winners.length < EVO_PARAMETERS.persistentPopulation) {
            winners.push(this.createGotchi(fromGeneData(storedGenes[winners.length % storedGenes.length])))
        }
        this.winners = winners.map((winner, index) => {
            winner.autopilot = true
            const name = letter(index)
            const tosses = winner.genome.tosses
            const proximity = this.baseGotchi.distanceFromTarget
            const state: IEvolverState = {index, name, proximity, tosses, persisted: true, reachedTarget: false}
            return <IEvolver>{gotchi: winner, state}
        })
    }

    public get withReducedCyclePattern(): Evolution {
        const reduced = [...this.cyclePattern]
        reduced.pop()
        return new Evolution(reduced, this.createInstance, this.baseGotchi)
    }

    public iterate(): EvolutionPhase {
        switch (this.phase) {
            case EvolutionPhase.WinnersAdvance:
                let winnerMoved = false
                this.winners.forEach(({gotchi, state}) => {
                    if (!state.reachedTarget && gotchi.cycleCount < this.currentMaxCycles) {
                        gotchi.iterate()
                        winnerMoved = true
                    }
                })
                if (!winnerMoved) {
                    this.winners.forEach(winner => winner.gotchi.showFrozen())
                    this.phase = EvolutionPhase.CandidatesBorn
                }
                break
            case EvolutionPhase.CandidatesBorn:
                this.candidates = []
                const candidates: Gotchi[] = []
                while (candidates.length < EVO_PARAMETERS.candidatePopulation) {
                    const genome = fromGeneData(this.winners[candidates.length % this.winners.length].gotchi.genome.geneData)
                    candidates.push(this.createGotchi(genome.withMutations([directionGene(this.baseGotchi.direction)])))
                }
                this.candidates = candidates.map((candidate, index) => {
                    candidate.autopilot = true
                    const name = `${letter(index + this.winners.length)}${letter(index % this.winners.length)}`
                    const tosses = candidate.genome.tosses
                    const proximity = this.baseGotchi.distanceFromTarget
                    const state: IEvolverState = {index, name, proximity, tosses}
                    return <IEvolver>{gotchi: candidate, state}
                })
                this.phase = EvolutionPhase.CandidatesAdvance
                break
            case EvolutionPhase.CandidatesReborn:
                let parentIndex = 0
                this.candidates = this.candidates.map((candidate, index) => {
                    const survivorIndex = parentIndex++ % this.winners.length
                    const parent = this.winners[survivorIndex]
                    const instance = candidate.gotchi.adoptFabric(this.baseGotchi.fabricClone)
                    const gotchi = candidate.gotchi.recycled(instance, parent.gotchi.mutatedGeneData())
                    const name = `${parent.state.name}${letter(index)}`
                    const state = {...candidate.state, name}
                    gotchi.autopilot = true
                    return {gotchi, state}
                })
                this.phase = EvolutionPhase.WinnersAdvance
                break
            case EvolutionPhase.CandidatesAdvance:
                let candidateMoved = false
                this.candidates.forEach(({gotchi, state}) => {
                    if (!state.reachedTarget && gotchi.cycleCount < this.currentMaxCycles) {
                        gotchi.iterate()
                        candidateMoved = true
                    }
                })
                if (!candidateMoved) {
                    this.phase = EvolutionPhase.WinnersPersist
                }
                break
            case EvolutionPhase.WinnersPersist:
                const {winners, losers} = this.splitEvolvers()
                this.baseGotchi.patch.storedGenes = winners.map(({gotchi}) => gotchi.genome.geneData)
                winners.forEach(winner => winner.state.persisted = true)
                losers.forEach(loser => loser.state.persisted = false)
                this.broadcastSnapshot([...winners, ...losers].map(({state}) => state))
                this.winners = winners
                this.candidates = []
                this.phase = EvolutionPhase.EvolutionAdvance
                break
            case EvolutionPhase.EvolutionAdvance:
                this.cycleCount = -1
                if (this.cyclePatternIndex === this.cyclePattern.length - 1) {
                    this.phase = EvolutionPhase.EvolutionComplete
                } else {
                    this.cyclePatternIndex++
                    this.currentMaxCycles = this.cyclePattern[this.cyclePatternIndex]
                    this.phase = EvolutionPhase.WinnersAdvance
                    // todo: maybe they have all reached the target?
                }
                break
            case EvolutionPhase.EvolutionComplete:
                break
        }
        return this.phase
    }

    public getMidpoint(midpoint: Vector3): Vector3 {
        this.winners.forEach(({gotchi}) => midpoint.add(gotchi.getMidpoint(this.gotchiMidpoint)))
        midpoint.multiplyScalar(1.0 / this.winners.length)
        return midpoint
    }

    public get target(): Vector3 {
        return this.baseGotchi.target
    }

    // Privates =============================================================

    private splitEvolvers(): { winners: IEvolver[], losers: IEvolver[] } {
        const all = [...this.winners, ...this.candidates]
        all.forEach(({state, gotchi}) => {
            state.proximity = gotchi.getMidpoint(this.gotchiMidpoint).distanceTo(gotchi.target)
        })
        all.sort((a: IEvolver, b: IEvolver) => a.state.proximity - b.state.proximity)
        const winners: IEvolver[] = []
        const losers: IEvolver[] = []
        all.forEach((evolver, index) => {
            if (index < EVO_PARAMETERS.persistentPopulation) {
                winners.push(evolver)
            } else {
                losers.push(evolver)
            }
        })
        return {winners, losers}
    }

    private broadcastSnapshot(evolverStates: IEvolverState[]): void {
        const cycle = this.cycleCount
        const cycleIndex = this.cyclePatternIndex
        const cyclePattern = this.cyclePattern
        const snapshot = {cycle, cyclePattern, cycleIndex, evolverStates}
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

    private createGotchi(genome: Genome): Gotchi {
        const instance = this.createInstance(false, this.baseGotchi.fabricClone)
        return this.baseGotchi.recycled(instance, genome.geneData)
    }
}

export function letter(index: number): string {
    return String.fromCharCode(65 + index)
}
