import Axios, { AxiosInstance } from "axios"

import { IGenomeData } from "../genetics/genome"
import { Hexalot } from "../island/hexalot"
import { Island, IslandPattern } from "../island/island"
import { Journey } from "../island/journey"

import { IStorage } from "./storage"

export class RemoteStorage implements IStorage {
    private readonly client: AxiosInstance

    constructor(baseURL: string = "http://localhost:8000/api") {
        this.client = Axios.create({
            baseURL,
        })
    }

    public async getIsland(island: Island): Promise<IslandPattern> {
        const response = await this.client.get(`/island/${island.islandName}`)
        if (response.status !== 200) {
            throw new Error(`Got HTTP response ${response.status}: ${response.statusText}`)
        }
        return response.data as IslandPattern
    }

    public async claimHexalot(island: Island, hexalot: Hexalot, genomeData: IGenomeData): Promise<IslandPattern> {
        const response = await this.client.post(
            `/island/${island.islandName}/claim-lot`,
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
        return response.data as IslandPattern
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

    public async getRotation(hexalot: Hexalot): Promise<number> {
        const response = await this.client.get(`/hexalot/${hexalot.id}/rotation`)
        if (response.status !== 200) {
            throw new Error(`Error fetching data: ${response.statusText}`)
        }
        return response.data as number
    }

    public async setRotation(hexalot: Hexalot, rotation: number): Promise<void> {
        const response = await this.client.post(`/hexalot/${hexalot.id}/rotation`, {
            rotation,
        })
        if (response.status !== 200) {
            throw new Error(`Error fetching data: ${response.statusText}`)
        }
    }

    public async loadJourney(island: Island, hexalot: Hexalot): Promise<Journey | undefined> {
        throw new Error("not implemented")
    }

    public async saveJourney(island: Island, hexalot: Hexalot): Promise<void> {
        throw new Error("not implemented")
    }
}
