/*
 * Copyright (c) 2020. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { Vector3 } from "three"

import { FabricInstance } from "../fabric/fabric-instance"

import { emptyGenome, fromGenomeData, Genome } from "./genome"
import { CreateGotchi, Gotchi } from "./gotchi"
import { ICoords, IHexalot } from "./island-logic"
import { Spot } from "./spot"

export class Hexalot implements IHexalot {
    public id: string
    public childHexalots: Hexalot[] = []
    public nonce = 0
    public visited = false
    private _genome?: Genome

    constructor(public readonly parentHexalot: Hexalot | undefined,
                public readonly coords: ICoords,
                public readonly spots: Spot[],
                private createGotchi: CreateGotchi) {
        this.spots[0].centerOfHexalot = this
        for (let neighbor = 1; neighbor <= 6; neighbor++) {
            this.spots[neighbor].adjacentHexalots.push(this)
        }
        this.spots.forEach(p => p.memberOfHexalot.push(this))
        if (parentHexalot) {
            parentHexalot.childHexalots.push(this)
            this.nonce = parentHexalot.nonce + 1
        }
    }

    public get genome(): Genome {
        if (!this._genome) {
            const item = localStorage.getItem(this.id)
            this._genome = item ? fromGenomeData(JSON.parse(item)) : emptyGenome()
            console.log(`Loading genome from ${this.id}`, this._genome)
        }
        return fromGenomeData(this._genome.genomeData)
    }

    public set genome(genome: Genome) {
        this._genome = genome
        const data = genome.genomeData
        localStorage.setItem(this.id, JSON.stringify(data))
    }

    public createNewGotchi(instance: FabricInstance, genome?: Genome): Gotchi | undefined {
        if (!genome) {
            genome = this.genome
        }
        return this.createGotchi(this, instance, genome, this.rotation)
    }

    public get rotation(): number {
        return 1 // TODO
    }

    public get centerSpot(): Spot {
        return this.spots[0]
    }

    public get center(): Vector3 {
        return this.centerSpot.center
    }
}
