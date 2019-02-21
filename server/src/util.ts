import { HEXALOT_DEFAULT_NUM_LAYERS } from "./constants"
import { InvalidHexalotError } from "./store"
import { Hexalot } from "./types"

export function numHexTiles(nLayers: number): number {
    return 3 * nLayers * nLayers - 3 * nLayers + 1
}

export function hexalotToBits(
    lot: Hexalot,
    numLayers: number = HEXALOT_DEFAULT_NUM_LAYERS,
): boolean[] {
    const numTiles = numHexTiles(numLayers)
    const sizeBytes = Math.ceil(numTiles / 8)
    if (lot.length !== sizeBytes * 2) {
        throw new InvalidHexalotError(`Lot length incorrect: ${lot}`)
    }
    const bits: boolean[] = []
    for (let i = 0; i < sizeBytes; i++) {
        const byteStr = lot.slice(i * 2, (i + 1) * 2)
        let byte: number
        try {
            byte = parseInt(byteStr, 16)
        } catch (e) {
            throw new InvalidHexalotError(`Invalid byte at position ${i}: ${e}`)
        }
        for (let pos = 0; pos < 8; pos++) {
            const bitIndex = i * 8 + pos
            const bit = (byte & (0b1 << (7 - pos))) !== 0
            if (bitIndex <= numTiles - 1) {
                bits.push(bit)
            } else if (bit) {
                throw new InvalidHexalotError(`Unused bits must be zero: bit in position ${bitIndex}`)
            }
        }
    }
    return bits
}
