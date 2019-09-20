/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import Axios, { AxiosInstance } from "axios"

import { fromOptionalGenomeData, IGenomeData } from "../genetics/genome"
import { Hexalot } from "../island/hexalot"
import { Island } from "../island/island"
import { IIslandData } from "../island/island-logic"
import { IJourneyData } from "../island/journey"

interface IUserProfile {
    username: string
    displayName: string
    photos?: {value: string}[]
}

export interface IUser {
    ownedLots: {id: string}[]
    profile: IUserProfile
}

export class RemoteStorage {
    private readonly client: AxiosInstance

    constructor(baseURL: string) {
        this.client = Axios.create({
            baseURL,
            withCredentials: true,
        })
        this.client.get("/")
            .catch((e) => {
                console.log(`ERROR: Cannot reach remote storage at ${baseURL}. Are you running the server? \n${e}`)
            })
    }

    public async getIslandData(islandName: string): Promise<IIslandData | undefined> {
        return this.fetchResource<IIslandData>(`/island/${islandName}`)
    }

    public async claimHexalot(island: Island, hexalot: Hexalot, genomeData: IGenomeData): Promise<IIslandData> {
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
        return response.data as IIslandData
    }

    public async getUser(): Promise<IUser | undefined> {
        try {
            return (await this.fetchResource<IUser>("/me"))
        } catch (e) {
            console.log(`Could not get user:`, e)
            return undefined
        }
    }

    public async getGenomeData(hexalot: Hexalot): Promise<IGenomeData | undefined> {
        return this.fetchResource<IGenomeData>(`/hexalot/${hexalot.id}/genome-data`)
    }

    public async setGenomeData(hexalot: Hexalot, genomeData: IGenomeData): Promise<void> {
        await this.client.post(`/hexalot/${hexalot.id}/genome-data`, {
            genomeData,
        })
    }

    public async getJourneyData(hexalot: Hexalot): Promise<IJourneyData | undefined> {
        return this.fetchResource<IJourneyData>(`/hexalot/${hexalot.id}/journey`)
    }

    public async setJourneyData(hexalot: Hexalot, journeyData: IJourneyData): Promise<void> {
        await this.client.post(`/hexalot/${hexalot.id}/journey`, {journeyData})
    }

    public async getLotOwner(hexalot: Hexalot): Promise<string | undefined> {
        return this.fetchResource<string>(`/hexalot/${hexalot.id}/owner`)
    }

    private async fetchResource<T>(resourcePath: string): Promise<T | undefined> {
        try {
            const response = await this.client.get(resourcePath)
            return response.data
        } catch (e) {
            console.error("network problem", e)
            return undefined
        }
    }
}
