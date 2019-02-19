import { Hexalot } from "./types"

export class InvalidHexalotError extends Error {
}

export function hexalotToBits(lot: Hexalot): boolean[] {
    if (lot.length !== 32) {
        throw new InvalidHexalotError(`Lot length incorrect: ${lot}`)
    }
    const bits: boolean[] = []
    for (let i = 0; i < 16; i++) {
        const byteStr = lot.slice(i * 2, (i + 1) * 2)
        let byte: number
        try {
            byte = parseInt(byteStr, 16)
        } catch (e) {
            throw new InvalidHexalotError(`Invalid byte at position ${i}: ${e}`)
        }
        if (i === 15) {
            if ((byte & 0b1) !== 0) {
                throw new InvalidHexalotError(`Last bit of hexalot representation must be zero: ${lot}`)
            }
        }
        for (let pos = 7; pos >= 0; pos--) {
            const bit = (byte & (0b1 << pos)) !== 0
            bits.push(bit)
        }
    }
    bits.splice(127,1)
    return bits
}

export function checkHexalotLegal(newLotStr: Hexalot, parentLotStr: Hexalot) {
    const newLot = hexalotToBits(newLotStr)
    const parentLot = hexalotToBits(parentLotStr)
    newLot.push(parentLot[0])
}
