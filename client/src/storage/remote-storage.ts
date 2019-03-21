import Axios, {AxiosInstance} from "axios"

import {IGenomeData} from "../genetics/genome"
import {Hexalot} from "../island/hexalot"
import {Island, IslandData} from "../island/island"
import {IJourneyData} from "../island/journey"

import {IStorage} from "./storage"

export class RemoteStorage implements IStorage {
    private readonly client: AxiosInstance

    constructor(baseURL: string = "http://localhost:8000/api") {
        this.client = Axios.create({
            baseURL,
        })
    }

    public async getIslandData(islandName: string): Promise<IslandData> {
        const response = await this.client.get(`/island/${islandName}`)
        if (response.status !== 200) {
            throw new Error(`Got HTTP response ${response.status}: ${response.statusText}`)
        }
        return response.data as IslandData
    }

    public async claimHexalot(island: Island, hexalot: Hexalot, genomeData: IGenomeData): Promise<IslandData> {
        const response = await this.client.post(
            `/island/${island.name}/claim-lot`,
            {
                id: hexalot.id,
                x: hexalot.coords.x,
                y: hexalot.coords.y,
                genomeData: JSON.stringify(genomeData),
            },
        )
        if (response.status !== 200) {
            throw new Error(`Got HTTP response ${response.status}: ${response.statusText}`)
        }
        return response.data as IslandData
    }

    public async getGenomeData(hexalot: Hexalot): Promise<IGenomeData | undefined> {
        const response = await this.client.get(`/hexalot/${hexalot.id}/genome-data`)
        if (response.status === 404) {
            return undefined
        } else if (response.status !== 200) {
            throw new Error(`Error fetching data: ${response.statusText}`)
        }
        return response.data as IGenomeData
    }

    public async setGenomeData(hexalot: Hexalot, genomeData: IGenomeData): Promise<void> {
        const response = await this.client.post(`/hexalot/${hexalot.id}/genome-data`, {
            genomeData,
        })
        if (response.status !== 200) {
            throw new Error(`Error fetching data: ${response.statusText}`)
        }
    }

    public async getJourneyData(hexalot: Hexalot): Promise<IJourneyData | undefined> {
        throw new Error("not implemented")
    }

    public async setJourneyData(hexalot: Hexalot, journeyData: IJourneyData): Promise<void> {
        throw new Error("not implemented")
    }
}
