import Axios from "axios"

import { IGenomeData } from "./genetics/genome"
import { Hexalot } from "./island/hexalot"
import { IslandPattern } from "./island/island"
import { Journey } from "./island/journey"
import { IStorage } from "./storage/storage"

class RemoteStorage implements IStorage {
    public async getIsland(islandName: string): Promise<IslandPattern> {
        const response = await Axios.get(`/island/${islandName}`)
        if (response.status !== 200 ) {
            throw new Error(`Got HTTP response ${response.status}: ${response.statusText}`)
        }
        return response.data as IslandPattern
    }

    public async claimHexalot(islandName: string, hexalot: Hexalot, genomeData: IGenomeData): Promise<IslandPattern> {
        const response = await Axios.post(
            `/island/${islandName}/hexalot/${hexalot.id}/claim`,
            {
                x: hexalot.coords.x,
                y: hexalot.coords.y,
                genomeData,
            },
        )
        if (response.status !== 200) {
            throw new Error(`Got HTTP response ${response.status}: ${response.statusText}`)
        }
        return response.data as IslandPattern
    }

    public getGenomeData(hexalot: Hexalot): Promise<IGenomeData | undefined> {
        const response = await Axios.get(`/island/`)
    }

    public getRotation(hexalot: Hexalot): Promise<number> {
        return undefined
    }

    public loadJourney(hexalot: Hexalot): Promise<Journey | undefined> {
        return undefined
    }

    public saveJourney(hexalot: Hexalot): Promise<void> {
        return undefined
    }

    public setGenome(hexalot: Hexalot, genomeData: IGenomeData): Promise<void> {
        return undefined
    }

    public setRotation(hexalot: Hexalot, rotation: number): Promise<void> {
        return undefined
    }
}
