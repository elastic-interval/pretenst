/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { BehaviorSubject } from "rxjs/BehaviorSubject"
import { Vector3 } from "three"

import { AppEvent } from "../app-event"
import { Direction } from "../fabric/fabric-exports"
import { ITERATIONS_PER_TICK } from "../fabric/gotchi-body"
import { fromGenomeData, Genome } from "../genetics/genome"
import { Hexalot } from "../island/hexalot"
import { Leg } from "../island/journey"

import { IEvaluatedJockey, Jockey } from "./jockey"

export const INITIAL_JOINT_COUNT = 47
export const MAX_POPULATION = 24
const MUTATION_COUNT = 5
const SURVIVAL_RATE = 0.66
const MIN_LIFESPAN = 15000
const MAX_LIFESPAN = 25000
const INCREMENT_LIFESPAN = 1000

export class Evolution {
    public currentJockeys: BehaviorSubject<Jockey[]> = new BehaviorSubject<Jockey[]>([])
    private midpointVector = new Vector3()
    private rebooting = false
    private rotation: number
    private maxAge: number

    constructor(
        readonly home: Hexalot,
        private readonly prototypeJockey?: Jockey,
    ) {
        const rotateToLeg = this.leg
        if (prototypeJockey && prototypeJockey.nextDirection !== Direction.REST) {
            throw new Error("Cannot create evolution from jockey which is not resting")
        }
        home.centerSpot.adjacentSpots.forEach((spot, index) => {
            const hexalot = spot.centerOfHexalot
            if (hexalot && rotateToLeg.goTo.id === hexalot.id) {
                this.rotation = index
            }
        })
        this.currentJockeys.next(this.createPopulation())
        this.maxAge = this.startAge + MIN_LIFESPAN
    }

    public get leg(): Leg {
        return this.prototypeJockey ? this.prototypeJockey.leg : this.home.firstLeg
    }

    public get startAge(): number {
        return this.prototypeJockey ? this.prototypeJockey.age : 0
    }

    public get midpoint(): Vector3 {
        const jockeys = this.currentJockeys.getValue()
        if (jockeys.length === 0) {
            return this.midpointVector
        }
        const vectors = jockeys.map(jockey => jockey.vectors)
        const sumFromArray = (prev: Vector3, [x, y, z]: Float32Array) => {
            prev.x += x
            prev.y += y
            prev.z += z
            return prev
        }
        this.midpointVector.set(0, 0, 0)
        return vectors.reduce(sumFromArray, this.midpointVector).multiplyScalar(1 / jockeys.length)
    }

    public iterate(): void {
        const jockeys = this.currentJockeys.getValue()
        if (jockeys.length === 0 || this.rebooting) {
            return
        }
        jockeys.forEach(jockey => jockey.reorient())
        const moving = jockeys.filter(jockey => jockey.age < this.maxAge)
        if (moving.length === 0) {
            this.adjustAgeLimit()
            this.nextGenerationFromSurvival()
            return
        }
        moving.forEach(jockey => {
            const behind = this.maxAge - jockey.age
            const appEvent = jockey.iterate(behind > ITERATIONS_PER_TICK ? ITERATIONS_PER_TICK : behind)
            if (appEvent === AppEvent.Cycle) {
                console.log("mutate")
                jockey.mutateGenome(1)
            }
        })
    }

    public recycle(): void {
        this.currentJockeys.getValue().forEach(jockey => jockey.recycle())
        if (this.prototypeJockey) {
            this.prototypeJockey.recycle()
        }
    }

    public get extractFittest(): Jockey | undefined {
        const strongest = this.strongest
        if (!strongest) {
            return undefined
        }
        const exceptIndex = strongest.jockey.gotchi.index
        this.currentJockeys.next(this.currentJockeys.getValue().filter(jockey => jockey.gotchi.index !== exceptIndex))
        return strongest.jockey
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

    private get rankedJockeys(): IEvaluatedJockey[] {
        let jockeys = this.currentJockeys.getValue()
        const frozenHero = this.prototypeJockey
        if (frozenHero) {
            jockeys = jockeys.filter(e => e.index !== frozenHero.index)
        }
        const evaluated = jockeys.map(jockey => jockey.evaluated)
        return evaluated.sort((a: IEvaluatedJockey, b: IEvaluatedJockey) => a.distanceFromTarget - b.distanceFromTarget)
    }

    private get strongest(): IEvaluatedJockey | undefined {
        return this.rankedJockeys[0]
    }

    private nextGenerationFromSurvival(): void {
        this.rebooting = true
        const ranked: IEvaluatedJockey[] = this.rankedJockeys
        const dead = ranked.splice(Math.ceil(ranked.length * SURVIVAL_RATE))
        // dead.forEach(e => console.log(`Dead ${e.jockey.index}:  ${e.distanceFromTarget}`))
        // ranked.forEach(e => console.log(`Ranked ${e.jockey.index}:  ${e.distanceFromTarget}`))
        this.currentJockeys.next(ranked.map(e => e.jockey))
        dead.forEach(e => e.jockey.recycle())
        setTimeout(() => {
            const nextGeneration: Jockey[] = []
            dead.map(e => e.jockey).forEach(() => {
                const luckyParent = ranked[Math.floor(ranked.length * Math.random())].jockey
                const offspring = this.createOffspring(luckyParent)
                if (offspring) {
                    nextGeneration.push(offspring)
                }
            })
            this.currentJockeys.next([])
            setTimeout(() => {
                ranked.forEach(e => e.jockey.recycle())
                ranked.map(e => e.jockey).forEach(jockey => {
                    const reborn = this.createJockey(jockey.leg, fromGenomeData(jockey.genomeData))
                    if (reborn) {
                        nextGeneration.push(reborn)
                    }
                })
                this.currentJockeys.next(nextGeneration)
                this.rebooting = false
            }, 500)
        }, 500)
    }

    private createPopulation(): Jockey[] {
        const genome = this.home.genome
        if (!genome) {
            throw new Error("No genome!")
        }
        let mutatingGenome: Genome | undefined = fromGenomeData(genome.genomeData)
        const jockeys: Jockey[] = []
        while (true) {
            const evolvingJockey = this.createJockey(this.leg, mutatingGenome)
            if (!evolvingJockey) {
                break
            }
            jockeys.push(evolvingJockey)
            mutatingGenome = mutatingGenome.withMutatedBehavior(evolvingJockey.nextDirection, MUTATION_COUNT)
        }
        return jockeys
    }

    private createOffspring(parent: Jockey): Jockey | undefined {
        const offspringGenome = fromGenomeData(parent.offspringGenome)
        return this.createJockey(parent.leg, offspringGenome)
    }

    private createJockey(leg: Leg, genome: Genome): Jockey | undefined {
        const prototype = this.prototypeJockey
        const gotchi = prototype ? prototype.createGotchi(genome) : this.home.createGotchi(genome, this.rotation)
        if (!gotchi) {
            return undefined
        }
        return new Jockey(gotchi, leg, fromGenomeData(gotchi.genomeData))
    }
}
