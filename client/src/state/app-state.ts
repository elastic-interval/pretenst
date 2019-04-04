/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { IFabricExports } from "../body/fabric-exports"
import { Evolution } from "../gotchi/evolution"
import { Gotchi } from "../gotchi/gotchi"
import { Jockey } from "../gotchi/jockey"
import { Hexalot } from "../island/hexalot"
import { Island } from "../island/island"
import { Journey } from "../island/journey"
import { Spot } from "../island/spot"
import { IStorage } from "../storage/storage"
import { FlightMode } from "../view/flight"

export interface IAppProps {
    fabricExports: IFabricExports
    storage: IStorage
    userId?: string
}

export type AppTransition = () => (Pick<IAppState, keyof IAppState>)
// export type AppTransition = (prevState: Readonly<IAppState>, props: Readonly<IAppProps>) => (Pick<IAppState, keyof IAppState>)

export interface IAppState {

    readonly width: number
    readonly height: number
    readonly left: number
    readonly top: number
    readonly showInfo: boolean
    readonly nonce: number
    readonly storage: IStorage
    readonly appMode: AppMode
    readonly islandIsLegal: boolean

    readonly flightMode: FlightMode
    readonly island?: Island
    readonly homeHexalot?: Hexalot
    readonly ownedLots?: string[]
    readonly journey?: Journey
    readonly selectedSpot?: Spot
    readonly selectedHexalot?: Hexalot
    readonly gotchi?: Gotchi
    readonly jockey?: Jockey
    readonly evolution?: Evolution

    updateState(appState: IAppState): void

    transitionState(transition: AppTransition): void
}

export enum Command {
    AbandonFix = "Abandon fix",
    ClaimHexalot = "Claim hexalot",
    ComeHere = "Come here",
    RideFree = "Ride free",
    RideJourney = "Ride your journey",
    Evolve = "Evolve",
    ForgetJourney = "Forget journey",
    GoThere = "Go there",
    Terraform = "Terraform",
    MakeLand = "Make into land",
    MakeWater = "Make into water",
    PlanJourney = "Plan your journey",
    PrepareToRide = "Prepare to ride",
    RandomGenome = "Random genome",
    Return = "Return",
    RotateLeft = "Rotate left",
    RotateRight = "Rotate right",
    SaveGenome = "Save genome",
    StopMoving = "Stop moving",
}

export enum AppMode {
    RidingFree = "Riding free",
    RidingJourney = "Riding journey",
    Evolving = "Evolving",
    FixingIsland = "Fixing island",
    Landed = "Landed",
    PlanningJourney = "Planning journey",
    PreparingRide = "Preparing ride",
    Visiting = "Visiting",
}

export function homeHexalotSelected(appState: IAppState): boolean {
    return !!appState.homeHexalot && !!appState.selectedHexalot
        && appState.homeHexalot.id === appState.selectedHexalot.id
}

export function logString(appState: IAppState): string {
    const legal = appState.islandIsLegal
    const home = !!appState.homeHexalot
    const spot = appState.selectedSpot ? JSON.stringify(appState.selectedSpot.coords) : "-"
    const lot = appState.selectedHexalot ? JSON.stringify(appState.selectedHexalot.coords) : "-"
    return `${appState.nonce}:${appState.appMode}: legal=${legal} home=${home} spot=${spot} lot=${lot}`
}

export function updateDimensions(): object {
    return {
        width: window.innerWidth,
        height: window.innerHeight,
        left: window.screenLeft,
        top: window.screenTop,
    }
}

