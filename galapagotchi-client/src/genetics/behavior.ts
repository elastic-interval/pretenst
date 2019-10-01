/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { FabricState } from "../fabric/fabric-engine"
import { GotchiBody, INTERVALS_RESERVED } from "../fabric/gotchi-body"

import { GeneReader } from "./gene-reader"

export class Behavior {
    constructor(private fabric: GotchiBody, private state: FabricState, private behaviorGene: GeneReader) {
    }

    public apply(): void {
        for (let intervalIndex = INTERVALS_RESERVED; intervalIndex < this.fabric.intervalCount; intervalIndex++) {
            const highLow = this.behaviorGene.chooseFrom(256)
            console.log(`NOT!! I[${intervalIndex}][${this.state}] = ${highLow}`)
        }
    }
}
