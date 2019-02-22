import { InvalidHexalotError } from "./store"
import { HexalotID } from "./types"
import { numHexalotTilesForRadius } from "./util"

const DIRECTIONS = [
    [+1, -1, 0], [+1, 0, -1], [0, +1, -1],
    [-1, +1, 0], [-1, 0, +1], [0, -1, +1],
]

function cubeAdd(v1: number[], v2: number[]): number[] {
    return [
        v1[0] + v2[0],
        v1[1] + v2[1],
        v1[2] + v2[2],
    ]
}

function cubeMult(v: number[], f: number): number[] {
    return [
        v[0] * f,
        v[1] * f,
        v[2] * f,
    ]
}

export class Hexalot {
    private static TILE_INDEX_MEMO: { [tile: string]: number } = {
        [String([0, 0, 0])]: 0,
    }
    public readonly bits: boolean[]
    public readonly radius: number
    public readonly numTiles: number

    constructor(
        readonly id: HexalotID,
    ) {
        if (id.length <= 2) {
            throw new InvalidHexalotError(`Hexalot too short: ${id}`)
        }
        const [lotRadius, lotBits] = [id.slice(0, 2), id.slice(2)]
        this.radius = parseInt(lotRadius, 16)
        this.numTiles = numHexalotTilesForRadius(this.radius)
        this.bits = []
        this.populateBits(lotBits)
    }

    public at([x, y, z]: number[]): boolean {
        if (x + y + z !== 0) {
            throw new Error(`Coordinates do not sum up to 0: ${x},${y},${z}`)
        }
        const index = Hexalot.indexForTile([x, y, z])
        if (index > this.bits.length - 1) {
            throw new Error(`Coordinates out of bound: ${x},${z}`)
        }
        return this.bits[index]
    }

    private populateBits(lotBits: string): void {
        const sizeBytes = Math.ceil(this.numTiles / 8)
        if (lotBits.length !== sizeBytes * 2) {
            throw new InvalidHexalotError(`Lot length incorrect: ${lotBits.length} =/= ${sizeBytes*2}`)
        }
        for (let i = 0; i < sizeBytes; i++) {
            const byteStr = lotBits.slice(i * 2, (i + 1) * 2)
            let byte: number
            try {
                byte = parseInt(byteStr, 16)
            } catch (e) {
                throw new InvalidHexalotError(`Invalid byte at position ${i}: ${e}`)
            }
            for (let pos = 0; pos < 8; pos++) {
                const bitIndex = i * 8 + pos
                const bit = (byte & (0b1 << (7 - pos))) !== 0
                if (bitIndex <= this.numTiles - 1) {
                    this.bits.push(bit)
                } else if (bit) {
                    throw new InvalidHexalotError(`Unused bits must be zero: bit in position ${bitIndex}`)
                }
            }
        }
    }

    private static indexForTile([x, y, z]: number[]): number {
        const radius = Math.max(
            Math.abs(x),
            Math.abs(y),
            Math.abs(z),
        )
        const key = String([x, y, z])
        if (!this.TILE_INDEX_MEMO[key]) {
            let i = 1
            for (let ring = 1; ring <= radius; ring++) {
                let pos = cubeMult(DIRECTIONS[4], ring)
                for (const dir of DIRECTIONS) {
                    for (let j = 0; j < ring; j++) {
                        this.TILE_INDEX_MEMO[String(pos)] = i++
                        pos = cubeAdd(pos, dir)
                    }
                }
            }
            console.log(JSON.stringify(this.TILE_INDEX_MEMO))
        }
        return this.TILE_INDEX_MEMO[key]
    }
}
