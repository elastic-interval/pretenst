import {IGenomeData} from "../genetics/genome"
import {Hexalot} from "../island/hexalot"
import {Island, IslandPattern} from "../island/island"
import {Journey} from "../island/journey"

export interface IStorage {

    getIsland(islandName: string): Promise<IslandPattern>

    claimHexalot(hexalot: Hexalot): Promise<string>

    getGenomeData(hexalot: Hexalot): Promise<IGenomeData | undefined>

    setGenome(hexalot: Hexalot, genomeData: IGenomeData): Promise<void>

    saveJourney(hexalot: Hexalot): Promise<void>

    loadJourney(hexalot: Hexalot, island: Island): Promise<Journey | undefined>

    setRotation(hexalot: Hexalot, rotation: number): Promise<void>

    getRotation(hexalot: Hexalot): Promise<number>

}
