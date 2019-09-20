/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { Spot } from "../island/spot"
import { IUser } from "../storage/remote-storage"

import { AppMode, IAppState } from "./app-state"
import { Transition } from "./transition"

export class ClickHandler {

    private trans: Transition

    constructor(appState: IAppState, private user?: IUser) {
        this.trans = new Transition(appState)
    }

    public async stateAfterClick(spot: Spot): Promise<IAppState> {

        const trans = this.trans
        const hexalot = spot.centerOfHexalot
        const appState = trans.appState
        const homeHexalot = appState.homeHexalot
        const island = appState.island
        if (!island) {
            return appState
        }

        const vacant = island.vacantHexalot

        switch (appState.appMode) {


            case AppMode.Terraforming: // ===========================================================================
                return (await trans.withSelectedSpot(spot)).appState


            case AppMode.Exploring: // ===============================================================================
                if (this.user && !homeHexalot && appState.islandIsLegal && spot.isCandidateHexalot(vacant)) {
                    island.vacantHexalot = island.createHexalot(spot)
                    return (await trans.withSelectedSpot(spot)).terraforming.withRestructure.appState
                }
                if (hexalot) {
                    return (await trans.withSelectedSpot(hexalot.centerSpot)).appState
                }
                return appState


            case AppMode.Planning: // ========================================================================
                if (!homeHexalot) {
                    throw new Error("No home hexalot")
                }
                if (hexalot) {
                    const journey = homeHexalot.adjustedJourney(hexalot)
                    homeHexalot.journey = journey
                    appState.storage.setJourneyData(homeHexalot, journey.data).then(() => {
                        console.log("saved journey")
                    })
                    return trans.withJourney(journey).appState
                }
                return appState


            // =========================================================================================================
            case AppMode.Flying:
            case AppMode.Evolving:
            case AppMode.Riding:
                return appState


            default: // ================================================================================================
                return appState


        }
    }
}

