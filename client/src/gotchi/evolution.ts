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
    challengerPopulation: number
}

export const EVO_PARAMETERS: IEvolutionParameters = {
    cyclePattern: [5, 6, 7, 8, 9, 10],
    persistentPopulation: 8,
    challengerPopulation: 8,
}

export enum EvolutionPhase {
    WinnersRun = "Winners run",
    ChallengersBorn = "Challengers born",
    ChallengersReborn = "Challengers reborn",
    ChallengersRun = "Challengers run",
    WinnersStored = "Winners stored",
    EvolutionAdvance = "Evolution advance",
    EvolutionDone = "Evolution done",
    EvolutionHarder = "Evolution harder",
}

export interface IEvolver {
    name: string
    gotchi: Gotchi
    proximityHistory: number[]
    persisted: boolean
}

export interface ISplit {
    cycleCount: number,
    winners: IEvolver[],
    losers: IEvolver[]
}

export interface IEvolverSnapshot {
    name: string,
    proximity: number
    tosses: number,
    reachedTarget: boolean,
    persisted: boolean
}

export interface IEvolutionSnapshot {
    cyclePattern: number[]
    cycle: number
    cycleIndex: number
    evolverSnapshots: IEvolverSnapshot[]
}

export class Evolution {
    public readonly snapshotsSubject = new BehaviorSubject<IEvolutionSnapshot[]>([])
    public winners: IEvolver[] = []
    public challengersVisible = false
    public challengers: IEvolver[] = []
    public phase = EvolutionPhase.WinnersRun
    private cyclePatternIndex: number
    private currentCycle: number = 0
    private currentMaxCycles: number
    private gotchiMidpoint = new Vector3()

    constructor(
        private evolvingGotchi: Gotchi,
        private createInstance: CreateInstance,
        private useTwitches: boolean,
        private cyclePattern: number[],
    ) {
        if (evolvingGotchi.embryo) {
            throw new Error("Cannot create evolution from gotchi which is not pretenst")
        }
        evolvingGotchi.checkDirection()
        this.currentMaxCycles = this.cyclePattern[this.cyclePatternIndex = 0]
        const winners: Gotchi[] = []
        const storedGenes = evolvingGotchi.patch.storedGenes
        while (winners.length < EVO_PARAMETERS.persistentPopulation) {
            winners.push(this.createAutoGotchi(fromGeneData(storedGenes[winners.length % storedGenes.length])))
        }
        this.winners = winners.map((gotchi, index) => ({
            gotchi,
            name: letter(index),
            proximityHistory: [],
            persisted: true,
        }))
    }

    public get withReducedCyclePattern(): Evolution | undefined {
        const cyclePattern = [...this.cyclePattern]
        cyclePattern.pop()
        if (cyclePattern.length < 3) {
            return undefined
        }
        return new Evolution(this.evolvingGotchi, this.createInstance, this.useTwitches, cyclePattern)
    }

    public iterate(): EvolutionPhase {
        switch (this.phase) {
            case EvolutionPhase.WinnersRun:
                let winnerMinCycles = 0
                let winnerMoved = false
                this.winners.forEach(({gotchi}) => {
                    const cycleCount = gotchi.getCycleCount(this.useTwitches)
                    if (cycleCount > winnerMinCycles) {
                        winnerMinCycles = cycleCount
                    }
                    if (cycleCount < this.currentMaxCycles) {
                        gotchi.iterate()
                        winnerMoved = true
                    }
                })
                if (winnerMinCycles > this.currentCycle) {
                    rankEvolvers(this.winners, this.currentCycle)
                    this.currentCycle = winnerMinCycles
                }
                if (!winnerMoved) {
                    const allWinnersReachedTarget = !this.winners.find(({gotchi}) => !gotchi.reachedTarget)
                    if (allWinnersReachedTarget) {
                        this.phase = EvolutionPhase.EvolutionDone
                    } else {
                        this.winners.forEach(winner => winner.gotchi.showFrozen())
                        this.phase = this.challengers.length === 0 ? EvolutionPhase.ChallengersBorn : EvolutionPhase.ChallengersReborn
                        this.currentCycle = 0
                    }
                }
                break
            case EvolutionPhase.ChallengersBorn:
                const challengers: Gotchi[] = []
                while (challengers.length < EVO_PARAMETERS.challengerPopulation) {
                    const genome = fromGeneData(this.winners[challengers.length % this.winners.length].gotchi.genome.geneData)
                    challengers.push(this.createAutoGotchi(genome.withMutations([directionGene(this.evolvingGotchi.direction)])))
                }
                this.challengers = challengers.map((challenger, index) => {
                    challenger.autopilot = true
                    const name = `${letter(index + this.winners.length)}${letter(index % this.winners.length)}`
                    return <IEvolver>{gotchi: challenger, name, proximityHistory: [], persisted: false}
                })
                this.phase = EvolutionPhase.ChallengersRun
                break
            case EvolutionPhase.ChallengersReborn:
                let parentIndex = 0
                this.challengers = this.challengers.map((challenger, index): IEvolver => {
                    const survivorIndex = parentIndex++ % this.winners.length
                    const parent = this.winners[survivorIndex]
                    const instance = challenger.gotchi.adoptFabric(this.evolvingGotchi.fabricClone)
                    const gotchi = challenger.gotchi.recycled(instance, parent.gotchi.mutatedGeneData())
                    const name = `${parent.name}${letter(index)}`
                    gotchi.autopilot = true
                    return {gotchi, name, proximityHistory: [], persisted: false}
                })
                this.phase = EvolutionPhase.ChallengersRun
                break
            case EvolutionPhase.ChallengersRun:
                this.challengersVisible = true
                let challengerMoved = false
                let challengerMinCycles = 0
                this.challengers.forEach(({gotchi, name}) => {
                    const cycleCount = gotchi.getCycleCount(this.useTwitches)
                    if (cycleCount > challengerMinCycles) {
                        challengerMinCycles = cycleCount
                    }
                    if (cycleCount < this.currentMaxCycles) {
                        gotchi.iterate()
                        challengerMoved = true
                    }
                })
                if (challengerMinCycles > this.currentCycle) {
                    const evolvers = [...this.winners, ...this.challengers]
                    rankEvolvers(evolvers, this.currentCycle)
                    this.broadcastSnapshot(evolvers.map(evolver => rankedToSnapshot(evolver, this.currentCycle)))
                    this.currentCycle = challengerMinCycles
                }
                if (!challengerMoved) {
                    this.phase = EvolutionPhase.WinnersStored
                }
                break
            case EvolutionPhase.WinnersStored:
                const {winners, losers} = this.splitEvolvers(this.currentCycle)
                this.evolvingGotchi.patch.storedGenes = winners.map(({gotchi}) => gotchi.genome.geneData)
                winners.forEach(winner => winner.persisted = true)
                losers.forEach(winner => winner.persisted = false)
                this.broadcastSnapshot(winners.map(evolver => rankedToSnapshot(evolver, this.currentCycle)))
                this.winners = winners
                this.challengers = losers
                this.challengersVisible = false
                this.phase = EvolutionPhase.EvolutionAdvance
                break
            case EvolutionPhase.EvolutionAdvance:
                if (this.cyclePatternIndex === this.cyclePattern.length - 1) {
                    const allReachedTarget = !this.winners.find(({gotchi}) => !gotchi.reachedTarget)
                    this.phase = allReachedTarget ? EvolutionPhase.EvolutionHarder : EvolutionPhase.EvolutionDone
                } else {
                    this.cyclePatternIndex++
                    this.currentMaxCycles = this.cyclePattern[this.cyclePatternIndex]
                    this.currentCycle = 0
                    this.phase = EvolutionPhase.WinnersRun
                    // todo: maybe they have all reached the target?
                }
                break
            case EvolutionPhase.EvolutionDone:
                break
            case EvolutionPhase.EvolutionHarder:
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
        return this.evolvingGotchi.target
    }

    // Privates =============================================================

    private splitEvolvers(cycleCount: number): ISplit {
        const winners: IEvolver[] = []
        const losers: IEvolver[] = []
        const evolvers = [...this.winners, ...this.challengers]
        rankEvolvers(evolvers, cycleCount)
        evolvers.forEach((rankedEvolver, index) => {
            if (index < EVO_PARAMETERS.persistentPopulation) {
                winners.push(rankedEvolver)
            } else {
                losers.push(rankedEvolver)
            }
        })
        return {cycleCount, winners, losers}
    }

    private broadcastSnapshot(evolverSnapshots: IEvolverSnapshot[]): void {
        const cycle = this.currentCycle
        const cycleIndex = this.cyclePatternIndex
        const cyclePattern = this.cyclePattern
        const snapshot = <IEvolutionSnapshot>{cycle, cyclePattern, cycleIndex, evolverSnapshots}
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

    private createAutoGotchi(genome: Genome): Gotchi {
        const instance = this.createInstance(false, this.evolvingGotchi.fabricClone)
        const gotchi = this.evolvingGotchi.recycled(instance, genome.geneData)
        gotchi.autopilot = true
        return gotchi
    }
}

function rankEvolvers(evolvers: IEvolver[], cycleCount: number): void {
    evolvers.forEach(evolver => {
        if (evolver.proximityHistory.length === cycleCount) {
            evolver.proximityHistory.push(evolver.gotchi.distanceFromTarget)
        }
    })
    evolvers.sort((a, b) => a.proximityHistory[cycleCount] - b.proximityHistory[cycleCount])
}

function rankedToSnapshot({gotchi, proximityHistory, persisted, name}: IEvolver, cycleCount: number): IEvolverSnapshot {
    const proximityForCycle = proximityHistory[cycleCount]
    if (proximityForCycle === undefined) {
        throw new Error("Cannot snapshot")
    }
    const tosses = gotchi.genome.tosses
    const reachedTarget = gotchi.reachedTarget
    return {name, proximity: proximityForCycle, reachedTarget, tosses, persisted}
}

export function letter(index: number): string {
    return String.fromCharCode(65 + index)
}
