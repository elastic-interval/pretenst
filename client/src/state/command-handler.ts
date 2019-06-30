/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { Vector3 } from "three"

import { freshGenome, fromGenomeData } from "../genetics/genome"
import { Jockey } from "../gotchi/jockey"
import { Hexalot } from "../island/hexalot"
import { Island } from "../island/island"
import { isIslandLegal, isSpotLegal, Surface } from "../island/island-logic"

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
        const islandData = appState.islandData

        if (!island) {
            return this.trans.appState
        }

        const homeHexalot = appState.homeHexalot
        const hexalot = appState.selectedHexalot
        const jockey = appState.jockey
        const spot = appState.selectedSpot
        const vacant = island.vacantHexalot
        const singleHexalot = island.hexalots.length === 1 ? island.hexalots[0] : undefined

        switch (command) {


            case Command.DiscardGenes:
                if (homeHexalot) {
                    homeHexalot.genome = freshGenome()
                }
                return appState


            case Command.Home:
                if (appState.jockey) {
                    const atJockeyHome = await trans.withSelectedSpot(appState.jockey.gotchi.home.centerSpot)
                    return atJockeyHome.withoutJockey.exploring.appState
                }
                if (homeHexalot) {
                    const withHomeSelected = await trans.withSelectedSpot(homeHexalot.centerSpot)
                    return withHomeSelected.withoutEvolution.exploring.appState
                }
                if (hexalot) {
                    const withUnselected = await trans.withSelectedSpot()
                    return withUnselected.withJourney().exploring.appState
                }
                return appState


            case Command.Ride:
                if (hexalot) {
                    const evolution = appState.evolution
                    if (evolution && homeHexalot) {
                        const fittest = evolution.extractFittest
                        if (fittest) {
                            const fittestData = fittest.genomeData
                            homeHexalot.genome = fromGenomeData(fittestData)
                            appState.storage.setGenomeData(homeHexalot, fittestData).then(() => {
                                console.log("genome saved")
                            })
                            return trans.withoutEvolution.withJockey(fittest).appState
                        }
                    }
                    const newbornGotchi = hexalot.createNativeGotchi()
                    if (newbornGotchi) {
                        const newJockey = new Jockey(newbornGotchi, hexalot.firstLeg)
                        return trans.withJockey(newJockey).appState
                    }
                }
                return appState


            case Command.Evolve:
                if (homeHexalot) {
                    if (jockey && !jockey.isResting) {
                        throw new Error("Cannot evolve")
                    }
                    return trans.withEvolution(homeHexalot).appState
                }
                return appState


            case Command.Start:
                if (jockey) {
                    jockey.startMoving()
                    return trans.withJockeyRiding.appState
                }
                return appState


            case Command.Stop:
                if (jockey) {
                    jockey.stopMoving()
                    return trans.withJockeyStopped.appState
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


            case Command.Cancel:
                const nonce = appState.nonce + 1
                if (!islandData) {
                    return appState
                }
                const originalIsland = new Island(islandData, island.gotchiFactory, appState.storage, nonce)
                const withIsland = await trans.withIsland(originalIsland, islandData)
                return withIsland.exploring.withRestructure.appState


            case Command.ClaimHexalot:
                if (!homeHexalot && hexalot && isIslandLegal(island) && (singleHexalot || vacant && vacant.id === hexalot.id)) {
                    const newState = await CommandHandler.claimHexalot(appState, hexalot)
                    if (newState) {
                        return newState
                    }
                }
                return appState


            case Command.Plan:
                return trans.planning.appState


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

