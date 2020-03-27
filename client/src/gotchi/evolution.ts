/*
 * Copyright (c) 2020. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { Vector3 } from "three"

import { CreateInstance } from "../fabric/fabric-instance"

import { fromGenomeData } from "./genome"
import { Gotchi } from "./gotchi"

export interface IEvolutionParameters {
    maxPopulation: number
    minLifespan: number
    maxLifespan: number
    incrementLifespan: number
    survivalRate: number
    mutationCount: number
}

export interface IEvolver {
    index: number
    gotchi: Gotchi
    distanceFromTarget: number
}

export class Evolution {
    public evolvers: IEvolver[]
    private maxAge: number

    constructor(
        private createInstance: CreateInstance,
        private readonly baseGotchi: Gotchi,
        private param: IEvolutionParameters,
    ) {
        if (!baseGotchi.isMature) {
            throw new Error("Cannot create evolution from gotchi which is not mature")
        }
        this.baseGotchi.instance.snapshot()
        const gotchis: Gotchi[] = []
        while (gotchis.length < this.param.maxPopulation) {
            const instance = this.createInstance(this.baseGotchi.instance.fabricClone)
            const muscles = this.baseGotchi.muscles
            const extremities = this.baseGotchi.extremities
            const gotchi = this.baseGotchi.hexalot.newGotchi({instance, muscles, extremities})
            if (!gotchi) {
                console.error("Unable to create gotchi")
                break
            }
            gotchis.push(gotchi)
        }
        this.evolvers = gotchis.map((gotchi, index) => <IEvolver>{index, gotchi, distanceFromTarget: 1000})
        this.maxAge = this.baseGotchi.age + this.param.minLifespan
    }

    public get midpoint(): Vector3 {
        return this.evolvers.reduce((sum, evolver) => sum.add(evolver.gotchi.midpoint), new Vector3())
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
        const {incrementLifespan, minLifespan, maxLifespan} = this.param
        this.maxAge += incrementLifespan
        const startAge = this.baseGotchi.age
        const lifespan = this.maxAge - startAge
        if (lifespan > maxLifespan) {
            this.maxAge = startAge + minLifespan // start again
        }
        console.log(`Age: [${startAge} to ${this.maxAge}] ${lifespan}`)
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
        const {survivalRate, mutationCount} = this.param
        console.log("ranked", this.evolvers.map(({index, distanceFromTarget}) => `${index}: ${distanceFromTarget}`))
        const survivorCount = Math.floor(this.evolvers.length * survivalRate)
        const dead = this.evolvers.slice(survivorCount)
        dead.forEach(evolver => {
            const parentIndex = Math.floor(survivorCount * Math.random())
            const genome = fromGenomeData(this.evolvers[parentIndex].gotchi.mutatedGenome(mutationCount))
            console.log(`replacing ${evolver.index} with offspring from ${parentIndex}`, genome.toString())
            const instance = evolver.gotchi.instance.adoptFabric(this.baseGotchi.instance.fabricClone)
            const muscles = this.baseGotchi.muscles
            const extremities = this.baseGotchi.extremities
            const newGotchi = this.baseGotchi.hexalot.newGotchi({genome, instance, muscles, extremities})
            if (!newGotchi) {
                throw Error("Unable to create gotchi")
            }
            evolver.gotchi = newGotchi
        })
    }
}
