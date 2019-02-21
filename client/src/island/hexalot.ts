import {Vector3} from "three"

import {Genome} from "../genetics/genome"
import {Gotchi, IGotchiFactory} from "../gotchi/gotchi"

import {BRANCH_STEP, ERROR_STEP, HEXALOT_SHAPE, STOP_STEP} from "./shapes"
import {equals, ICoords, Spot, Surface} from "./spot"
import {Trip} from "./trip"

const padRightTo4 = (s: string): string => s.length < 4 ? padRightTo4(s + "0") : s

interface IHexalotIndexed {
    hexalot: Hexalot
    index: number
}

const spotsToHexFingerprint = (spots: Spot[]) => {
    const lit = spots.map(spot => spot.surface === Surface.Land ? "1" : "0")
    const nybbleStrings = lit.map((l, index, array) => (index % 4 === 0) ? array.slice(index, index + 4).join("") : null).filter(chunk => chunk)
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

export class Hexalot {
    public genome?: Genome
    public nonce = 0
    public visited = false
    public childHexalots: Hexalot[] = []

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

    public createStupidTrip(): Trip {
        const spots = this.centerSpot.adjacentSpots.filter(spot => spot.surface === Surface.Land)
        return new Trip([this.centerSpot, spots[0]])
    }

    public createGotchi(jointCount: number, mutatedGenome?: Genome): Promise<Gotchi> {
        const genome = mutatedGenome ? mutatedGenome : this.genome
        if (!genome) {
            throw new Error("Create gotchi but no genome")
        }
        return this.gotchiFactory.createGotchiAt(this.center, jointCount, genome)
    }

    get master(): string | undefined {
        return this.genome ? this.genome.master : undefined
    }

    get centerSpot(): Spot {
        return this.spots[0]
    }

    get center(): Vector3 {
        return this.centerSpot.center
    }

    get canBeSeeded(): boolean {
        if (this.genome) {
            return false
        }
        return !!this.centerSpot.adjacentHexalots.find(hexalot => !!hexalot.genome)
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

    public createFingerprint() {
        return spotsToHexFingerprint(this.spots)
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
        }
        else {
            steps.push(STOP_STEP)
        }
        this.visited = true
        return steps
    }
}

// export const fingerprintToSpots = (hexString: string, spots: Spot[]) => {
//     const numbers = hexString.split('').map(hexChar => parseInt(hexChar, 16));
//     const booleanArrays = numbers.map(nyb => {
//         const b0 = (nyb & 8) !== 0;
//         const b1 = (nyb & 4) !== 0;
//         const b2 = (nyb & 2) !== 0;
//         const b3 = (nyb & 1) !== 0;
//         return [b0, b1, b2, b3];
//     });
//     const landStack = [].concat.apply([], booleanArrays).reverse();
//     spots.forEach(spot => spot.land = landStack.pop());
// };
//
// export const hexalotFromFingerprint = (fingerprint: string, index: number, hexalotMasterLookup: (fingerprint: string) => string): Hexalot => {
//     const hexalot = new Hexalot(undefined, {x: 0, y: 0}, GOTCH_SHAPE.map(c => new Spot(c)));
//     fingerprintToSpots(fingerprint, hexalot.spots);
//     return hexalot;
// };
