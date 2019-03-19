import {IGenomeData} from "../genetics/genome"
import {Hexalot} from "../island/hexalot"
import {IslandPattern} from "../island/island"
import {Journey} from "../island/journey"

export interface IStorage {

    getIsland(islandName: string): Promise<IslandPattern>

    claimHexalot(islandName: string, hexalot: Hexalot, genomeData: IGenomeData): Promise<IslandPattern | undefined>

    getGenomeData(hexalot: Hexalot): Promise<IGenomeData | undefined>

    setGenomeData(hexalot: Hexalot, genomeData: IGenomeData): Promise<void>

    saveJourney(islandName: string, hexalot: Hexalot): Promise<void>

    loadJourney(islandName: string, hexalot: Hexalot): Promise<Journey | undefined>

    setRotation(hexalot: Hexalot, rotation: number): Promise<void>

    getRotation(hexalot: Hexalot): Promise<number>

}
