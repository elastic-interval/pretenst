import { BigNumber } from "bignumber.js"

import { InvalidHexalotError } from "./store"
import { HexalotID } from "./types"
import { numHexalotTilesForRadius } from "./util"


type Vector = number[]

export enum Direction {
    E = 0,
    NE = 1,
    NW = 2,
    W = 3,
    SW = 4,
    SE = 5,
}

const DIRECTION_VECTORS: Vector[] = [
    [+1, -1, 0], [+1, 0, -1], [0, +1, -1],
    [-1, +1, 0], [-1, 0, +1], [0, -1, +1],
]

function v3dAdd([x1, y1, z1]: Vector, [x2, y2, z2]: Vector): Vector {
    return [
        x1 + x2,
        y1 + y2,
        z1 + z2,
    ]
}

function v3dMult([x, y, z]: Vector, f: number): Vector {
    return [
        x * f,
        y * f,
        z * f,
    ]
}

function v3dMinRadius([x, y, z]: Vector): number {
    return Math.max(
        Math.abs(x),
        Math.abs(y),
        Math.abs(z),
    )
}

function* genRing(radius: number): IterableIterator<Vector> {
    let pos = v3dMult(DIRECTION_VECTORS[4], radius)
    for (const dir of DIRECTION_VECTORS) {
        for (let j = 0; j < radius; j++) {
            yield pos
            pos = v3dAdd(pos, dir)
        }
    }
}

function* genSpiral(radius: number): IterableIterator<Vector> {
    yield [0, 0, 0]
    for (let ring = 1; ring <= radius; ring++) {
        yield* genRing(ring)
    }
}

export class Hexalot {
    public get id(): HexalotID {
        let sizeByte = this.radius.toString(16)
        if (sizeByte.length === 1) {
            sizeByte = "0" + sizeByte
        }
        const bits = this.bits
        const bytesLength = Math.ceil(bits.length / 8)
        while (bits.length < bytesLength * 8) {
            bits.push(false)
        }
        const bitsBinary = bits.map(b => b ? "1" : "0").join("")
        const bitsHex = new BigNumber(bitsBinary, 2)
            .toString(16)
        const leadingZeros = "0".repeat(bytesLength * 2 - bitsHex.length)
        return sizeByte + leadingZeros + bitsHex
    }

    private static TILE_INDEX_MEMO: { [tile: string]: number } = {
        [String([0, 0, 0])]: 0,
    }

    constructor(
        public readonly radius: number,
        public readonly bits: boolean[],
    ) {
    }

    public at([x, y, z]: Vector): boolean {
        if (x + y + z !== 0) {
            throw new Error(`Coordinates do not sum up to 0: ${x},${y},${z}`)
        }
        const index = Hexalot.indexForTile([x, y, z])
        if (index > this.bits.length - 1) {
            throw new Error(`Coordinates out of bounds: ${x},${z}`)
        }
        return this.bits[index]
    }

    public isChild(child: Hexalot, direction: Direction): boolean {
        if (this.radius !== child.radius) {
            return false
        }
        const delta = DIRECTION_VECTORS[direction]
        if (!delta) {
            throw new Error(`Direction has to be in [0,5]: ${direction}`)
        }
        const iter = genSpiral(this.radius)
        for (let cursor = iter.next(); !cursor.done; cursor = iter.next()) {
            const childPos = cursor.value
            const parentPos = v3dAdd(childPos, delta)
            if (v3dMinRadius(parentPos) > this.radius) {
                continue
            }
            if (child.at(childPos) !== this.at(parentPos)) {
                return false
            }
        }
        return true
    }

    public static fromID(id: HexalotID): Hexalot {
        if (id.length <= 2) {
            throw new InvalidHexalotError(`Hexalot too short: ${id}`)
        }
        const [lotRadius, bitsHex] = [id.slice(0, 2), id.slice(2)]
        const radius = parseInt(lotRadius, 16)
        const numTiles = numHexalotTilesForRadius(radius)
        const bits = Hexalot.parseBitsHex(bitsHex, numTiles)
        return new Hexalot(radius, bits)
    }

    private static parseBitsHex(bitsHex: string, numTiles: number): boolean[] {
        const bits: boolean[] = []
        const sizeBytes = Math.ceil(numTiles / 8)
        if (bitsHex.length !== sizeBytes * 2) {
            throw new InvalidHexalotError(`Lot length incorrect: ${bitsHex.length} =/= ${sizeBytes * 2}`)
        }
        const bitsStr = new BigNumber(bitsHex, 16).toString(2)
        const paddedBitsStr = "0".repeat(sizeBytes * 8 - bitsStr.length) + bitsStr
        paddedBitsStr.split("").forEach((c, i) => {
            const bit = (c === "1")
            if (i <= numTiles - 1) {
                bits.push(bit)
            } else if (bit) {
                throw new InvalidHexalotError(`Unused bits must be zero: bit in position ${i}`)
            }
        })
        return bits
    }

    private static indexForTile(v: Vector): number {
        const radius = v3dMinRadius(v)
        const key = String(v)
        if (!this.TILE_INDEX_MEMO[key]) {
            let i = 0
            const iter = genSpiral(radius)
            for (let cursor = iter.next(); !cursor.done; cursor = iter.next()) {
                const pos = cursor.value
                this.TILE_INDEX_MEMO[String(pos)] = i++
            }
        }
        return this.TILE_INDEX_MEMO[key]
    }
}
