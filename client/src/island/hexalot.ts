/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { Vector3 } from "three"

import { fromOptionalGenomeData, Genome } from "../genetics/genome"
import { Gotchi, IGotchiFactory } from "../gotchi/gotchi"
import { IStorage } from "../storage/storage"

import { Island } from "./island"
import { ICoords, IHexalot, spotsToHexalotId } from "./island-logic"
import { fromOptionalJourneyData, Journey } from "./journey"
import { Spot } from "./spot"

export enum LoadStatus {
    Pending,
    Busy,
    Loaded,
}

export class Hexalot implements IHexalot {
    public genomeStatus = LoadStatus.Pending
    public genome?: Genome
    public journeyStatus = LoadStatus.Pending
    public journey?: Journey
    public childHexalots: Hexalot[] = []
    public rotation = Math.floor(Math.random() * 6)
    public nonce = 0
    public visited = false
    private identifier?: string

    constructor(public parentHexalot: Hexalot | undefined,
                public coords: ICoords,
                public spots: Spot[],
                private gotchiFactory: IGotchiFactory) {
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

    public get id(): string {
        if (!this.identifier) {
            throw new Error("Should have refreshed fingerprint first")
        }
        return this.identifier
    }

    public refreshId(): void {
        this.identifier = spotsToHexalotId(this.spots)
    }

    public fetchGenome(storage: IStorage, loaded: () => void): boolean {
        switch (this.genomeStatus) {
            case LoadStatus.Pending:
                this.genomeStatus = LoadStatus.Busy
                storage.getGenomeData(this).then(genomeData => {
                    this.genome = fromOptionalGenomeData(genomeData)
                    console.log(`Genome data arrived for ${this.id}`, genomeData)
                    this.genomeStatus = LoadStatus.Loaded
                    loaded()
                })
                return false
            case LoadStatus.Busy:
                return false
            case LoadStatus.Loaded:
                return true
        }
    }

    public fetchJourney(storage: IStorage, island: Island, loaded: (journey: Journey) => void): boolean {
        switch (this.journeyStatus) {
            case LoadStatus.Pending:
                this.journeyStatus = LoadStatus.Busy
                storage.getJourneyData(this).then(journeyData => {
                    this.journey = fromOptionalJourneyData(island, journeyData)
                    console.log(`Journey data arrived for ${this.id}`, journeyData)
                    this.journeyStatus = LoadStatus.Loaded
                    if (this.journey) {
                        loaded(this.journey)
                    }
                })
                return false
            case LoadStatus.Busy:
                return false
            case LoadStatus.Loaded:
                return true
        }
    }

    public createNativeGotchi(): Gotchi | undefined {
        if (!this.genome) {
            return undefined
        }
        return this.gotchiFactory.createGotchiSeed(this, this.rotation, this.genome)
    }

    public createGotchiWithGenome(genome: Genome, rotation: number): Gotchi | undefined {
        return this.gotchiFactory.createGotchiSeed(this, rotation, genome)
    }

    public rotate(forward: boolean): number {
        let nextRotation = forward ? this.rotation + 1 : this.rotation - 1
        if (nextRotation < 0) {
            nextRotation = 5
        } else if (nextRotation > 5) {
            nextRotation = 0
        }
        this.rotation = nextRotation
        return this.rotation
    }

    get centerSpot(): Spot {
        return this.spots[0]
    }

    get center(): Vector3 {
        return this.centerSpot.center
    }
}
