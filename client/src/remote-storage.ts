import Axios from "axios"
import { Hexalot } from "./island/hexalot"

import { IslandPattern } from "./island/island"

class RemoteStorage {
    public async getIsland(islandName: string): Promise<IslandPattern | undefined> {
        const response = await Axios.get(`/island/${islandName}`)
        if (response.status === 404) {
            return undefined
        }
        return response.data as IslandPattern
    }

    public async claimHexalot(hexalot: Hexalot, islandName: string): Promise<IslandPattern> {
        const response = await Axios.post(
            `/island/${islandName}/hexalot/${hexalot.id}/claim`,
            {
                x: hexalot.coords.x,
                y: hexalot.coords.y,
                genomeData: hexalot.genome && hexalot.genome.genomeData,
            },
        )
        if (response.status !== 200) {
            throw new Error(`Got HTTP response ${response.status}: ${response.statusText}`)
        }
        return response.data as IslandPattern
    }
}
