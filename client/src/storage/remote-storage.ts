import Axios, { AxiosInstance } from "axios"

import { fromOptionalGenomeData, IGenomeData } from "../genetics/genome"
import { Hexalot } from "../island/hexalot"
import { Island, IslandData } from "../island/island"
import { IJourneyData } from "../island/journey"

import { IStorage } from "./storage"

export class RemoteStorage implements IStorage {
    private readonly client: AxiosInstance

    constructor(baseURL: string) {
        this.client = Axios.create({
            baseURL,
        })
        this.client.get("/")
            .catch((e) => {
                console.log(`ERROR: Cannot reach remote storage at ${baseURL}. Are you running the server? \n${e}`)
            })
    }

    public async getIslandData(islandName: string): Promise<IslandData> {
        return this.fetchResource(`/island/${islandName}`)
    }

    public async claimHexalot(island: Island, hexalot: Hexalot, genomeData: IGenomeData): Promise<IslandData> {
        hexalot.genome = fromOptionalGenomeData(genomeData)
        const response = await this.client.post(
            `/island/${island.name}/claim-lot`,
            {
                id: hexalot.id,
                x: hexalot.coords.x,
                y: hexalot.coords.y,
                genomeData: JSON.stringify(genomeData),
            },
        )
        return response.data as IslandData
    }

    public async getGenomeData(hexalot: Hexalot): Promise<IGenomeData | undefined> {
        return this.fetchResource(`/hexalot/${hexalot.id}/genome-data`)
    }

    public async setGenomeData(hexalot: Hexalot, genomeData: IGenomeData): Promise<void> {
        await this.client.post(`/hexalot/${hexalot.id}/genome-data`, {
            genomeData,
        })
    }

    public async getJourneyData(hexalot: Hexalot): Promise<IJourneyData | undefined> {
        return this.fetchResource(`/hexalot/${hexalot.id}/journey`)
    }

    public async setJourneyData(hexalot: Hexalot, journeyData: IJourneyData): Promise<void> {
        await this.client.post(`/hexalot/${hexalot.id}/journey`, {
            journeyData,
        })
    }

    private async fetchResource(resourcePath: string): Promise<any | undefined> {
        try {
            const response = await this.client.get(resourcePath)
            return response.data
        } catch (e) {
            if (e.response.status === 404) {
                return undefined
            }
            throw e
        }
    }
}
