/*
 * Copyright (c) 2020. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { Stage } from "eig"

import { Tensegrity } from "../fabric/tensegrity"

export class SatoshiTree {
    constructor(private tensegrity: Tensegrity) {
    }

    public iterate(): boolean {
        return this.tensegrity.iterate() !== Stage.Pretenst
    }
}
