import { expect } from "chai"

import { hexalotToBits } from "../src/hexalot"

describe("Hexalot logic", () => {
    it("can parse correct hexalot strings", () => {
        const testLot = "fffffffffffffffffffffffffffffffe"
        const bits = hexalotToBits(testLot)
        for (const bit of bits) {
            expect(bit).to.be.true
        }
    })
})
