/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { BehaviorSubject } from "rxjs/BehaviorSubject"
import { Vector3 } from "three"

import { NORMAL_TICKS } from "../body/fabric"
import { fromGenomeData, Genome, IGenomeData } from "../genetics/genome"
import { Hexalot } from "../island/hexalot"
import { Leg } from "../island/journey"

import { IEvaluatedJockey, Jockey } from "./jockey"

export const INITIAL_JOINT_COUNT = 47
export const MAX_POPULATION = 24
const MUTATION_COUNT = 5
const SURVIVAL_RATE = 0.66
const MIN_LIFESPAN = 15000
const LIFESPAN_INCREASE = 1000
const MAX_LIFESPAN_INCREASE = 10 * LIFESPAN_INCREASE

export class Evolution {
    public currentJockeys: BehaviorSubject<Jockey[]> = new BehaviorSubject<Jockey[]>([])
    private midpointVector = new Vector3()
    private rebooting = false
    private frozenHero?: Jockey
    private leg: Leg
    private rotation: number
    private minAge = 0
    private maxAge = MIN_LIFESPAN

    constructor(readonly home: Hexalot, firstLeg: Leg, private saveGenome: (genome: IGenomeData) => void) {
        this.leg = firstLeg
        home.centerSpot.adjacentSpots.forEach((spot, index) => {
            const hexalot = spot.centerOfHexalot
            if (hexalot && firstLeg.goTo.id === hexalot.id) {
                this.rotation = index
            }
        })
        this.currentJockeys.next(this.createPopulation())
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
        const heroEvolver = jockeys.find(jockey => jockey.touchedDestination)
        if (heroEvolver) {
            console.log("next generation from hero", heroEvolver)
            this.nextGenerationFromHero(heroEvolver)
            return
        }
        const moving = jockeys.filter(jockey => jockey.age < this.maxAge)
        if (moving.length === 0) {
            this.saveStrongest()
            this.adjustAgeLimit()
            this.nextGenerationFromSurvival()
            return
        }
        moving.forEach(jockey => {
            const behind = this.maxAge - jockey.age
            const timeSweepTick = jockey.iterate(behind > NORMAL_TICKS ? NORMAL_TICKS : behind)
            if (timeSweepTick && !jockey.gestating) {
                jockey.mutateGenome(1)
                jockey.adjustDirection()
            }
        })
    }

    public recycle(): void {
        this.currentJockeys.getValue().forEach(jockey => jockey.recycle())
    }

    // Privates =============================================================

    private saveStrongest(): void {
        const toSave = this.strongest
        if (toSave) {
            console.log("saved genome")
            this.saveGenome(toSave.jockey.genomeData)
        } else {
            console.log("no strongest?")
        }
    }

    private adjustAgeLimit(): void {
        this.maxAge += LIFESPAN_INCREASE
        const lifespan = this.maxAge - this.minAge
        if (lifespan > MIN_LIFESPAN + MAX_LIFESPAN_INCREASE) {
            this.maxAge = this.minAge + MIN_LIFESPAN
        }
        console.log(`MaxAge=${this.maxAge}`)
    }

    private get rankedEvolvers(): IEvaluatedJockey[] {
        let jockeys = this.currentJockeys.getValue()
        const frozenHero = this.frozenHero
        if (frozenHero) {
            jockeys = jockeys.filter(e => e.index !== frozenHero.index)
        }
        const evaluated = jockeys.map(jockey => jockey.evaluated)
        return evaluated.sort((a: IEvaluatedJockey, b: IEvaluatedJockey) => a.distanceFromTarget - b.distanceFromTarget)
    }

    private get strongest(): IEvaluatedJockey | undefined {
        return this.rankedEvolvers[0]
    }

    private nextGenerationFromHero(heroEvolver: Jockey): void {
        this.rebooting = true
        this.frozenHero = heroEvolver
        const nextLeg = this.leg.nextLeg
        if (!nextLeg) {
            console.warn("Evolution is over")
            return // todo: evolution is over
        }
        this.leg = heroEvolver.leg = nextLeg
        this.minAge = heroEvolver.age
        this.maxAge = this.minAge + MIN_LIFESPAN
        const jockeys = this.currentJockeys.getValue()
        this.currentJockeys.next([heroEvolver])
        setTimeout(() => {
            const otherEvolvers = jockeys.filter(jockey => jockey.index !== heroEvolver.index)
            otherEvolvers.forEach(jockey => jockey.recycle())
            this.currentJockeys.next(this.createPopulation())
            this.rebooting = false
        }, 500)
    }

    private nextGenerationFromSurvival(): void {
        this.rebooting = true
        const ranked: IEvaluatedJockey[] = this.rankedEvolvers
        const dead = ranked.splice(Math.ceil(ranked.length * SURVIVAL_RATE))
        dead.forEach(e => console.log(`Dead ${e.jockey.index}:  ${e.distanceFromTarget}`))
        ranked.forEach(e => console.log(`Ranked ${e.jockey.index}:  ${e.distanceFromTarget}`))
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
                    const reborn = this.createEvolver(fromGenomeData(jockey.genomeData))
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
            const jockey = this.createEvolver(mutatingGenome)
            if (!jockey) {
                break
            }
            jockeys.push(jockey)
            mutatingGenome = mutatingGenome.withMutatedBehavior(jockey.direction, MUTATION_COUNT)
        }
        return jockeys
    }

    private createOffspring(parent: Jockey): Jockey | undefined {
        const offspringGenome = fromGenomeData(parent.offspringGenome)
        return this.createEvolver(offspringGenome)
    }

    private createEvolver(genome: Genome): Jockey | undefined {
        const frozenHero = this.frozenHero
        const gotchi = frozenHero ? frozenHero.gotchiWithGenome(genome) : this.home.createGotchiWithGenome(genome, this.rotation)
        if (!gotchi) {
            return undefined
        }
        return new Jockey(gotchi, this.leg, fromGenomeData(gotchi.genomeData))
    }
}
