import { expect } from "chai"

import { Hexalot } from "../src/hexalot"

describe("Hexalot logic", () => {
    it("yolo", () => {
        const id = "02" + (0b01010101010101010100000).toString(16)
        const lot = new Hexalot(id)
        expect(lot)
    })

    it("can parse correct hexalot strings", () => {
        const testId = "01" + (0b01010100).toString(16)
        const lot = new Hexalot(testId)
        expect(lot.radius).to.eq(1)
        expect(lot.numTiles).to.eq(7)
        expect(lot.bits).to.deep.eq([
            false, true, false, true, false, true, false,
        ])
    })

    it("returns the right bits at axial positions", () => {
        const testId = "01" + (0b01010100).toString(16)
        const lot = new Hexalot(testId)
        expect(lot.at([-1, 0, 1])).to.be.true
        expect(lot.at([0, -1, 1])).to.be.false
        expect(lot.at([-1, 1, 0])).to.be.false
        expect(() => lot.at([-1, -1])).to.throw()
    })
})
