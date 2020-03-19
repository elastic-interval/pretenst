/*
 * Copyright (c) 2020. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { BehaviorSubject } from "rxjs/BehaviorSubject"
import { Vector3 } from "three"

import { fromGenomeData, Genome } from "./genome"
import { Direction, Gotchi, IEvaluatedGotchi } from "./gotchi"
import { Hexalot } from "./hexalot"
import { Leg } from "./journey"

export const INITIAL_JOINT_COUNT = 47
export const MAX_POPULATION = 24
const MUTATION_COUNT = 5
const SURVIVAL_RATE = 0.66
const MIN_LIFESPAN = 15000
const MAX_LIFESPAN = 25000
const INCREMENT_LIFESPAN = 1000

export class Evolution {
    public currentGotchis: BehaviorSubject<Gotchi[]> = new BehaviorSubject<Gotchi[]>([])
    private midpointVector = new Vector3()
    private rebooting = false
    private rotation: number
    private maxAge: number

    constructor(
        public readonly home: Hexalot,
        private readonly prototypeGotchi?: Gotchi,
    ) {
        const rotateToLeg = this.leg
        if (prototypeGotchi && prototypeGotchi.nextDirection !== Direction.Rest) {
            throw new Error("Cannot create evolution from gotchi which is not resting")
        }
        home.centerSpot.adjacentSpots.forEach((spot, index) => {
            const hexalot = spot.centerOfHexalot
            if (hexalot && rotateToLeg.goTo.id === hexalot.id) {
                this.rotation = index
            }
        })
        this.currentGotchis.next(this.createPopulation())
        this.maxAge = this.startAge + MIN_LIFESPAN
    }

    public get leg(): Leg {
        return this.prototypeGotchi ? this.prototypeGotchi.leg : this.home.firstLeg
    }

    public get startAge(): number {
        return this.prototypeGotchi ? this.prototypeGotchi.age : 0
    }

    public get midpoint(): Vector3 {
        return this.midpointVector // TODO: calculate it on the fly
    }

    public iterate(): void {
        const gotchis = this.currentGotchis.getValue()
        if (gotchis.length === 0 || this.rebooting) {
            return
        }
        gotchis.forEach(gotchi => gotchi.reorient())
        const moving = gotchis.filter(gotchi => gotchi.age < this.maxAge)
        if (moving.length === 0) {
            this.adjustAgeLimit()
            this.nextGenerationFromSurvival()
            return
        }
        moving.forEach(gotchi => {
            gotchi.iterate() // TODO: all fucked up behind > ITERATIONS_PER_TICK ? ITERATIONS_PER_TICK : behind
            // if (appEvent === AppEvent.Cycle) {
            //     console.log("mutate")
            //     gotchi.mutateGenome(1)
            // }
        })
    }

    public recycle(): void {
        this.currentGotchis.getValue().forEach(gotchi => gotchi.recycle())
        if (this.prototypeGotchi) {
            this.prototypeGotchi.recycle()
        }
    }

    public get extractFittest(): Gotchi | undefined {
        const strongest = this.strongest
        if (!strongest) {
            return undefined
        }
        const exceptIndex = strongest.gotchi.index
        this.currentGotchis.next(this.currentGotchis.getValue().filter(gotchi => gotchi.index !== exceptIndex))
        return strongest.gotchi
    }

    // Privates =============================================================

    private adjustAgeLimit(): void {
        this.maxAge += INCREMENT_LIFESPAN
        const lifespan = this.maxAge - this.startAge
        if (lifespan > MAX_LIFESPAN) {
            this.maxAge = this.startAge + MIN_LIFESPAN // start again
        }
        console.log(`Age: [${this.startAge} to ${this.maxAge}] ${lifespan}`)
    }

    private get rankedGotchis(): IEvaluatedGotchi[] {
        let gotchis = this.currentGotchis.getValue()
        const frozenHero = this.prototypeGotchi
        if (frozenHero) {
            gotchis = gotchis.filter(e => e.index !== frozenHero.index)
        }
        const evaluated = gotchis.map(gotchi => gotchi.evaluated)
        return evaluated.sort((a: IEvaluatedGotchi, b: IEvaluatedGotchi) => a.distanceFromTarget - b.distanceFromTarget)
    }

    private get strongest(): IEvaluatedGotchi | undefined {
        return this.rankedGotchis[0]
    }

    private nextGenerationFromSurvival(): void {
        this.rebooting = true
        const ranked: IEvaluatedGotchi[] = this.rankedGotchis
        const dead = ranked.splice(Math.ceil(ranked.length * SURVIVAL_RATE))
        // dead.forEach(e => console.log(`Dead ${e.gotchi.index}:  ${e.distanceFromTarget}`))
        // ranked.forEach(e => console.log(`Ranked ${e.gotchi.index}:  ${e.distanceFromTarget}`))
        this.currentGotchis.next(ranked.map(e => e.gotchi))
        dead.forEach(e => e.gotchi.recycle())
        setTimeout(() => {
            const nextGeneration: Gotchi[] = []
            dead.map(e => e.gotchi).forEach(() => {
                const luckyParent = ranked[Math.floor(ranked.length * Math.random())].gotchi
                const offspring = this.createOffspring(luckyParent)
                if (offspring) {
                    nextGeneration.push(offspring)
                }
            })
            this.currentGotchis.next([])
            setTimeout(() => {
                ranked.forEach(e => e.gotchi.recycle())
                ranked.map(e => e.gotchi).forEach(gotchi => {
                    const reborn = this.createGotchi(gotchi.leg, fromGenomeData(gotchi.genomeData))
                    if (reborn) {
                        nextGeneration.push(reborn)
                    }
                })
                this.currentGotchis.next(nextGeneration)
                this.rebooting = false
            }, 500)
        }, 500)
    }

    private createPopulation(): Gotchi[] {
        const genome = this.home.genome
        if (!genome) {
            throw new Error("No genome!")
        }
        let mutatingGenome: Genome | undefined = fromGenomeData(genome.genomeData)
        const gotchis: Gotchi[] = []
        while (true) {
            const evolvingGotchi = this.createGotchi(this.leg, mutatingGenome)
            if (!evolvingGotchi) {
                break
            }
            gotchis.push(evolvingGotchi)
            mutatingGenome = mutatingGenome.withMutatedBehavior(evolvingGotchi.nextDirection, MUTATION_COUNT)
        }
        return gotchis
    }

    private createOffspring(parent: Gotchi): Gotchi | undefined {
        const offspringGenome = fromGenomeData(parent.offspringGenome)
        return this.createGotchi(parent.leg, offspringGenome)
    }

    private createGotchi(leg: Leg, genome: Genome): Gotchi | undefined {
        if (this.prototypeGotchi) {
            return this.home.createGotchiFromPrototype(this.prototypeGotchi, this.rotation, genome)
        } else {
            return this.home.createGotchiFromGenome(0, this.rotation, genome) // TODO
        }
    }
}
