import { FabricState } from "../fabric/fabric-exports"

import { DICE, diceToNuance } from "./dice"
import { GeneReader } from "./gene-reader"
import { Genome } from "./genome"

describe("Genetics", () => {

    describe("Dice in general", () => {

        it("should be able to produce the right nuances", () => {
            expect(diceToNuance([DICE[0]])).toBe(0.5 / 6)
            expect(diceToNuance([DICE[5]])).toBe(5.5 / 6)
            expect(diceToNuance([DICE[0], DICE[0]])).toBe(0.5 / 36)
            expect(diceToNuance([DICE[5], DICE[5]])).toBe(35.5 / 36)
        })

    })

    describe("Gene reader", () => {

        const reader = (dots: number) => new GeneReader({
            state: FabricState.Forward,
            mutationCount: 0,
            dice: [],
        }, () => DICE[dots - 1])

        it("should make the right choices given trivial dice sequences", () => {

            expect(reader(1).chooseFrom(2)).toBe(0)
            expect(reader(6).chooseFrom(2)).toBe(1)

            expect(reader(1).chooseFrom(3)).toBe(0)
            expect(reader(2).chooseFrom(3)).toBe(0)
            expect(reader(3).chooseFrom(3)).toBe(1)
            expect(reader(4).chooseFrom(3)).toBe(1)
            expect(reader(5).chooseFrom(3)).toBe(2)
            expect(reader(6).chooseFrom(3)).toBe(2)

            expect(reader(1).chooseFrom(4)).toBe(0)
            expect(reader(2).chooseFrom(4)).toBe(1)
            expect(reader(3).chooseFrom(4)).toBe(1)
            expect(reader(4).chooseFrom(4)).toBe(2)
            expect(reader(5).chooseFrom(4)).toBe(3)
            expect(reader(6).chooseFrom(4)).toBe(3)

            expect(reader(1).chooseFrom(5)).toBe(0)
            expect(reader(2).chooseFrom(5)).toBe(1)
            expect(reader(3).chooseFrom(5)).toBe(2)
            expect(reader(4).chooseFrom(5)).toBe(2)
            expect(reader(5).chooseFrom(5)).toBe(3)
            expect(reader(6).chooseFrom(5)).toBe(4)

            expect(reader(1).chooseFrom(6)).toBe(0)
            expect(reader(2).chooseFrom(6)).toBe(1)
            expect(reader(3).chooseFrom(6)).toBe(2)
            expect(reader(4).chooseFrom(6)).toBe(3)
            expect(reader(5).chooseFrom(6)).toBe(4)
            expect(reader(6).chooseFrom(6)).toBe(5)

            expect(reader(1).chooseFrom(6 * 6 * 6 * 6)).toBe(0)
            expect(reader(6).chooseFrom(6 * 6 * 6 * 6)).toBe(6 * 6 * 6 * 6 - 1)
        })

        it("should grow appropriately in number of dice", () => {

            const readerSize = (choices: number) => {
                const r = reader(1)
                r.chooseFrom(choices)
                return r.size
            }

            expect(readerSize(2)).toBe(1)
            expect(readerSize(36)).toBe(2)
            expect(readerSize(35)).toBe(2)
            expect(readerSize(217)).toBe(4)
            expect(readerSize(100000)).toBe(5)
        })

    })

    describe("Genome", () => {

        it("should hold state genes", () => {
            const genome = new Genome([], () => DICE[0])
            expect(genome.createReader(FabricState.Rest).chooseFrom(2)).toBe(0)
        })

    })

})

