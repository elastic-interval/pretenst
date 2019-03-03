import { expect } from "chai"

import { Direction, Hexalot, overlap } from "../src/hexalot"

describe("Hexalot logic", () => {
    it("can parse correct hexalot ID", () => {
        const testId = "01" + (0b01010100).toString(16)
        const lot = Hexalot.fromID(testId)
        expect(lot.radius).to.eq(1)
        expect(lot.bits).to.deep.eq([
            false, true, false, true, false, true, false,
        ])
    })

    it("throws an error on incorrect hexalot ID", () => {
        const testId = "01" + (0b11111111).toString(16)
        expect(() => Hexalot.fromID(testId)).to.throw()
    })

    it("properly encodes a hexalot ID", () => {
        const testId = "01" + (0b11101100).toString(16)
        expect(Hexalot.fromID(testId).id).to.equal(testId)
    })

    it("returns the right bits at positions", () => {
        const lot = new Hexalot(1, [false, true, false, true, false, true, false])
        expect(lot.at([-1, 0, 1])).to.be.true
        expect(lot.at([0, -1, 1])).to.be.false
        expect(lot.at([-1, 1, 0])).to.be.false
        expect(() => lot.at([-1, -1])).to.throw()
    })

    it("can validate whether a hexalot is a child", () => {
        const parent = new Hexalot(1, [true, true, true, true, true, false, false])
        const child = new Hexalot(1, [true, false, false, true, true, false, false])
        expect(overlap(parent, child, Direction.NE)).to.be.true
        expect(overlap(parent, child, Direction.SW)).to.be.false
    })
})
