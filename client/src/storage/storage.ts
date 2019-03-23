/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { IGenomeData } from "../genetics/genome"
import { Hexalot } from "../island/hexalot"
import { Island } from "../island/island"
import { IslandData } from "../island/island-logic"
import { IJourneyData } from "../island/journey"

export interface IStorage {

    getIslandData(islandName: string): Promise<IslandData | undefined>

    claimHexalot(island: Island, hexalot: Hexalot, genomeData: IGenomeData): Promise<IslandData | undefined>

    getGenomeData(hexalot: Hexalot): Promise<IGenomeData | undefined>

    setGenomeData(hexalot: Hexalot, genomeData: IGenomeData): Promise<void>

    getJourneyData(hexalot: Hexalot): Promise<IJourneyData | undefined>

    setJourneyData(hexalot: Hexalot, journeyData: IJourneyData): Promise<void>

}
