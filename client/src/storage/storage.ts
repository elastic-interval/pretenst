import {IGenomeData} from "../genetics/genome"
import {Hexalot} from "../island/hexalot"
import { Island, IslandPattern } from "../island/island"
import {Journey} from "../island/journey"

export interface IStorage {

    getIsland(island: Island): Promise<IslandPattern>

    claimHexalot(island: Island, hexalot: Hexalot, genomeData: IGenomeData): Promise<IslandPattern | undefined>

    getGenomeData(hexalot: Hexalot): Promise<IGenomeData | undefined>

    setGenomeData(hexalot: Hexalot, genomeData: IGenomeData): Promise<void>

    saveJourney(island: Island, hexalot: Hexalot): Promise<void>

    loadJourney(island: Island, hexalot: Hexalot): Promise<Journey | undefined>

    setRotation(hexalot: Hexalot, rotation: number): Promise<void>

    getRotation(hexalot: Hexalot): Promise<number>

}
