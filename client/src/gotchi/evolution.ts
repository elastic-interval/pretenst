/*
 * Copyright (c) 2020. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { Vector3 } from "three"

import { InstanceFactory } from "../fabric/fabric-instance"

import { fromGenomeData } from "./genome"
import { Direction, Gotchi } from "./gotchi"
import { Hexalot } from "./hexalot"
import { Leg } from "./journey"

export const MAX_POPULATION = 10
const MUTATION_COUNT = 3
const SURVIVAL_RATE = 0.5
const MIN_LIFESPAN = 120000
const MAX_LIFESPAN = 240000
const INCREMENT_LIFESPAN = 10000

export interface IEvolver {
    index: number
    gotchi: Gotchi
    distanceFromTarget: number
}

export class Evolution {
    public evolvers: IEvolver[]
    private midpointVector = new Vector3()
    private rotation: number
    private maxAge: number

    constructor(
        public readonly home: Hexalot,
        private instanceFactory: InstanceFactory,
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
        const gotchis: Gotchi[] = []
        while (gotchis.length < MAX_POPULATION) {
            const instance = this.instanceFactory()
            const gotchi = this.home.createNativeGotchi(instance, this.rotation)
            if (!gotchi) {
                console.error("Unable to create gotchi")
                break
            }
            gotchis.push(gotchi)
        }
        this.evolvers = gotchis.map((gotchi, index) => <IEvolver>{index, gotchi, distanceFromTarget: 1000})
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
        this.evolvers.forEach(({gotchi}) => gotchi.reorient())
        const moving = this.evolvers.filter(({gotchi}) => gotchi.age < this.maxAge)
        if (moving.length === 0) {
            this.adjustAgeLimit()
            this.nextGenerationFromSurvival()
            return
        }
        moving.forEach(({gotchi}) => {
            if (gotchi.age % 10000 === 0) {
                console.log("iterate", gotchi.age, this.maxAge)
            }
            gotchi.iterate()
        })
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
        console.log("ranked", this.evolvers.map(({index, distanceFromTarget}) => `${index}: ${distanceFromTarget}`))
        const survivorCount = Math.floor(this.evolvers.length * SURVIVAL_RATE)
        this.evolvers = this.evolvers.map(({gotchi, index, distanceFromTarget}, evolverIndex) => {
            if (evolverIndex > survivorCount) {
                const parentIndex = Math.floor(survivorCount * Math.random())
                const offspringGenome = fromGenomeData(this.evolvers[parentIndex].gotchi.mutatedGenome(MUTATION_COUNT))
                console.log(`replacing ${evolverIndex} with offspring from ${parentIndex}`, offspringGenome.toString())
                return <IEvolver>{index, gotchi: this.home.createGotchiFromGenome(gotchi.instance, offspringGenome, this.rotation), distanceFromTarget}
            } else {
                return <IEvolver>{index, gotchi: this.home.createNativeGotchi(gotchi.instance, this.rotation), distanceFromTarget}
            }
        })
    }
}
