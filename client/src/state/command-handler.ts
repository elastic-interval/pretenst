/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { Vector3 } from "three"

import { freshGenome, fromGenomeData, IGenomeData } from "../genetics/genome"
import { Evolution } from "../gotchi/evolution"
import { Jockey } from "../gotchi/jockey"
import { Hexalot } from "../island/hexalot"
import { Island } from "../island/island"
import { extractIslandData, isIslandLegal, isSpotLegal, Surface } from "../island/island-logic"

import { AppMode, Command, IAppState } from "./app-state"
import { Transition } from "./transition"

export class CommandHandler {

    private trans: Transition

    constructor(appState: IAppState) {
        this.trans = new Transition(appState)
    }

    public async afterCommand(command: Command, location: Vector3): Promise<IAppState> {

        const trans = this.trans
        const appState = trans.appState
        const island = appState.island

        if (!island) {
            return this.trans.appState
        }

        const homeHexalot = appState.homeHexalot
        const hexalot = appState.selectedHexalot
        const jockey = appState.jockey
        const journey = appState.journey
        const spot = appState.selectedSpot
        const vacant = island.vacantHexalot
        const singleHexalot = island.hexalots.length === 1 ? island.hexalots[0] : undefined

        switch (command) {


            case Command.SaveGenome:
                if (homeHexalot && jockey) {
                    const genomeData = jockey.gotchi.genomeData
                    await appState.storage.setGenomeData(homeHexalot, genomeData)
                }
                return appState


            case Command.DiscardGenes:
                if (homeHexalot) {
                    homeHexalot.genome = freshGenome()
                }
                return appState


            case Command.Home:
                if (appState.jockey) {
                    const atJockeyHome = await trans.withSelectedSpot(appState.jockey.gotchi.home.centerSpot)
                    return atJockeyHome.cleared.withAppMode(AppMode.Approaching).appState
                }
                if (homeHexalot) {
                    const withHomeSelected = await trans.withSelectedSpot(homeHexalot.centerSpot)
                    return withHomeSelected.cleared.withAppMode(AppMode.Approaching).appState
                }
                return appState


            case Command.Ride:
                if (homeHexalot && journey) {
                    const firstLeg = journey.firstLeg
                    if (!firstLeg) {
                        return appState
                    }
                    const newbornGotchi = homeHexalot.createNativeGotchi()
                    if (newbornGotchi) {
                        const newJockey = new Jockey(newbornGotchi, firstLeg)
                        return trans.withJockey(newJockey).withAppMode(AppMode.Riding).appState
                    }
                }
                return appState


            case Command.Evolve:
                if (homeHexalot && journey) {
                    const firstLeg = journey.firstLeg
                    if (firstLeg) {
                        const saveGenome = (data: IGenomeData) => {
                            homeHexalot.genome = fromGenomeData(data)
                            appState.storage.setGenomeData(homeHexalot, data).then(() => {
                                console.log("genome saved")
                            })
                        }
                        const evolution = new Evolution(homeHexalot, firstLeg, saveGenome)
                        return trans.withEvolution(evolution).withAppMode(AppMode.Evolving).appState
                    }
                }
                return appState


            case Command.Start:
                if (jockey) {
                    jockey.startMoving()
                }
                return appState


            case Command.Stop:
                if (jockey) {
                    jockey.stopMoving()
                }
                return appState


            case Command.MakeLand:
                if (spot && spot.free) {
                    return (await trans.withSurface(Surface.Land)).withRestructure.appState
                }
                return appState


            case Command.MakeWater:
                if (spot && spot.free) {
                    return (await trans.withSurface(Surface.Water)).withRestructure.appState
                }
                return appState


            case Command.Terraform:
                const unknownSpot = island.spots.find(s => s.surface === Surface.Unknown)
                if (unknownSpot) {
                    return (await trans.withSelectedSpot(unknownSpot)).appState
                }
                const illegalSpot = island.spots.find(s => !isSpotLegal(s))
                if (illegalSpot) {
                    return (await trans.withSelectedSpot(illegalSpot)).appState
                }
                return appState


            case Command.AbandonFix:
                const nonce = appState.nonce + 1
                const orig = new Island(extractIslandData(island), island.gotchiFactory, appState.storage, nonce)
                return (await trans.withSelectedSpot()).withIsland(orig).withAppMode(AppMode.Exploring).withRestructure.appState


            case Command.ClaimHexalot:
                if (!homeHexalot && hexalot && isIslandLegal(island) && (singleHexalot || vacant && vacant.id === hexalot.id)) {
                    const newState = await CommandHandler.claimHexalot(appState, hexalot)
                    if (newState) {
                        return newState
                    }
                }
                return appState


            case Command.Plan:
                return trans.withAppMode(AppMode.Planning).appState


            default:
                throw new Error("Unknown command!")


        }
    }

    private static async claimHexalot(appState: IAppState, hexalot: Hexalot): Promise<IAppState | undefined> {
        const existingIsland = appState.island
        if (!existingIsland) {
            console.warn("No existing island")
            return undefined
        }
        const islandData = await appState.storage.claimHexalot(existingIsland, hexalot, freshGenome().genomeData)
        if (!islandData) {
            console.warn("No island data arrived")
            return undefined
        }
        const mode = AppMode.Exploring
        const islandIsLegal = false
        const island = new Island(islandData, existingIsland.gotchiFactory, appState.storage, appState.nonce)
        const appStateClone: IAppState = {...appState, nonce: appState.nonce + 1, island, appMode: mode, islandIsLegal}
        return (await new Transition(appStateClone).withHomeHexalot(hexalot)).withRestructure.appState
    }
}

