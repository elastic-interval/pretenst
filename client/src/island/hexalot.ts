import {Vector3} from "three"

import {fromOptionalGenomeData, Genome} from "../genetics/genome"
import {Gotchi, IGotchiFactory} from "../gotchi/gotchi"
import {IStorage} from "../storage/storage"

import {Island} from "./island"
import {fromOptionalJourneyData, Journey} from "./journey"
import {BRANCH_STEP, ERROR_STEP, HEXALOT_SHAPE, STOP_STEP} from "./shapes"
import {equals, ICoords, Spot, Surface} from "./spot"

const padRightTo4 = (s: string): string => s.length < 4 ? padRightTo4(s + "0") : s

interface IHexalotIndexed {
    hexalot: Hexalot
    index: number
}

const spotsToHexFingerprint = (spots: Spot[]): string => {
    const lit = spots.map(spot => spot.surface === Surface.Land ? "1" : "0")
    const nybbleStrings = lit
        .map((l, index, array) => (index % 4 === 0) ? array.slice(index, index + 4).join("") : undefined)
        .filter(chunk => chunk)
    const nybbleChars = nybbleStrings.map((s: string) => parseInt(padRightTo4(s), 2).toString(16))
    return nybbleChars.join("")
}

const ringIndex = (coords: ICoords, origin: ICoords): number => {
    const ringCoords: ICoords = {x: coords.x - origin.x, y: coords.y - origin.y}
    for (let index = 1; index <= 6; index++) {
        if (ringCoords.x === HEXALOT_SHAPE[index].x && ringCoords.y === HEXALOT_SHAPE[index].y) {
            return index
        }
    }
    return 0
}

export const hexalotTreeString = (hexalots: Hexalot[]) => {
    const root = hexalots.find(hexalot => hexalot.nonce === 0)
    if (!root) {
        console.error("No root hexalot found")
        return ""
    }
    hexalots.forEach(hexalot => hexalot.visited = false)
    return root.generateOctalTreePattern([]).join("")
}

export enum LoadStatus {
    Pending,
    Busy,
    Loaded,
}

export class Hexalot {
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

    public get isLegal(): boolean {
        return this.spots.every(spot => spot.isLegal)
    }

    public refreshId(): void {
        this.identifier = spotsToHexFingerprint(this.spots)
    }

    public get vacant(): boolean {
        return this.genomeStatus === LoadStatus.Loaded && !this.genome
    }

    public fetchGenome(storage: IStorage): boolean {
        switch (this.genomeStatus) {
            case LoadStatus.Pending:
                this.genomeStatus = LoadStatus.Busy
                storage.getGenomeData(this).then(genomeData => {
                    this.genome = fromOptionalGenomeData(genomeData)
                    console.log(`Genome data arrived for ${this.id}`, genomeData)
                    this.genomeStatus = LoadStatus.Loaded
                })
                return false
            case LoadStatus.Busy:
                return false
            case LoadStatus.Loaded:
                return true
        }
    }

    public fetchJourney(storage: IStorage, island: Island, loaded: () => void): boolean {
        switch (this.journeyStatus) {
            case LoadStatus.Pending:
                this.journeyStatus = LoadStatus.Busy
                storage.getJourneyData(this).then(journeyData => {
                    this.journey = fromOptionalJourneyData(island, journeyData)
                    console.log(`Journey data arrived for ${this.id}`, journeyData)
                    this.journeyStatus = LoadStatus.Loaded
                    loaded()
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

    public destroy(): Spot[] {
        if (this.spots.length === 0) {
            return []
        }
        if (this.parentHexalot) {
            this.parentHexalot.childHexalots = this.parentHexalot.childHexalots.filter(hexalot => !equals(this.coords, hexalot.coords))
        }
        this.spots[0].centerOfHexalot = undefined
        for (let neighbor = 1; neighbor <= 6; neighbor++) {
            this.spots[neighbor].adjacentHexalots = this.spots[neighbor].adjacentHexalots.filter(hexalot => !equals(this.coords, hexalot.coords))
        }
        this.spots.forEach(p => p.memberOfHexalot = p.memberOfHexalot.filter(hexalot => !equals(this.coords, hexalot.coords)))
        const lightsToRemove = this.spots.filter(p => p.memberOfHexalot.length === 0)
        this.spots = []
        return lightsToRemove
    }

    public generateOctalTreePattern(steps: number[]): number[] {
        const remainingChildren = this.childHexalots.filter(hexalot => !hexalot.visited)
            .map(hexalot => {
                const index = ringIndex(hexalot.coords, this.coords)
                return {index, hexalot} as IHexalotIndexed
            })
            .sort((a, b) => a.index < b.index ? 1 : a.index > b.index ? -1 : 0)
        if (remainingChildren.length > 0) {
            for (let child = remainingChildren.pop(); child; child = remainingChildren.pop()) {
                if (remainingChildren.length > 0) {
                    steps.push(BRANCH_STEP)
                }
                steps.push(child.index > 0 ? child.index : ERROR_STEP)
                child.hexalot.generateOctalTreePattern(steps)
            }
        } else {
            steps.push(STOP_STEP)
        }
        this.visited = true
        return steps
    }
}
