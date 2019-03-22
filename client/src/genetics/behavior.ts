/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { Fabric, INTERVALS_RESERVED } from "../body/fabric"
import { Direction } from "../body/fabric-exports"

import { GeneReader } from "./gene-reader"

export class Behavior {
    constructor(private fabric: Fabric, private direction: Direction, private behaviorGene: GeneReader) {
    }

    public apply(): void {
        for (let intervalIndex = INTERVALS_RESERVED; intervalIndex < this.fabric.intervalCount; intervalIndex++) {
            const highLow = this.behaviorGene.chooseFrom(256)
            // console.log(`I[${intervalIndex}][${this.direction}] = ${highLow}`);
            this.fabric.setIntervalHighLow(intervalIndex, this.direction, highLow)
        }
    }
}
