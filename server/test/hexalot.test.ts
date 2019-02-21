import { expect } from "chai"

import { hexalotToBits } from "../src/util"

describe("Hexalot logic", () => {
    it("can parse correct hexalot strings", () => {
        const testLot = (0b01010100).toString(16)
        const bits = hexalotToBits(testLot, 2)
        expect(bits).to.deep.eq([
            false, true, false, true, false, true, false,
        ])
    })
})
