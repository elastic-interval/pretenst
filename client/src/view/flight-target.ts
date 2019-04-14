/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { Vector3 } from "three"

import { Evolution } from "../gotchi/evolution"
import { Jockey } from "../gotchi/jockey"
import { Hexalot } from "../island/hexalot"
import { Island } from "../island/island"
import { Spot } from "../island/spot"
import { AppMode } from "../state/app-state"

import { INITIAL_DISTANCE } from "./flight"

export interface IFlightTarget {
    readonly location: Vector3
    readonly distance: number
    readonly tooFar: number
    readonly tooClose: number
    readonly height: number
    readonly tooHigh: number
    readonly tooLow: number
    readonly appMode: AppMode
}

export function JockeyTarget(jockey: Jockey): IFlightTarget {
    return <IFlightTarget>{
        get location(): Vector3 {
            return jockey.fabric.midpoint
        },
        distance: 20,
        tooFar: 26,
        tooClose: 14,
        get height(): number {
            return jockey.height
        },
        get tooHigh(): number {
            return jockey.height + 5
        },
        get tooLow(): number {
            return jockey.height - 3
        },
        appMode: AppMode.Riding,
    }
}

export function EvolutionTarget(evolution: Evolution): IFlightTarget {
    return <IFlightTarget>{
        get location(): Vector3 {
            return evolution.midpoint
        },
        distance: 30,
        tooFar: 35,
        tooClose: 25,
        get height(): number {
            return evolution.midpoint.y
        },
        get tooHigh(): number {
            return evolution.midpoint.y + 10
        },
        get tooLow(): number {
            return evolution.midpoint.y - 1
        },
        appMode: AppMode.Evolving,
    }
}

const HEXALOT_DISTANCE = 450

export function HexalotTarget(hexalot: Hexalot, appMode: AppMode): IFlightTarget {
    return <IFlightTarget>{
        get location(): Vector3 {
            return hexalot.genome ? hexalot.seed : hexalot.center
        },
        distance: HEXALOT_DISTANCE,
        tooFar: HEXALOT_DISTANCE * 1.05,
        tooClose: HEXALOT_DISTANCE * 0.95,
        height: HEXALOT_DISTANCE,
        tooHigh: HEXALOT_DISTANCE * 1.1,
        tooLow: HEXALOT_DISTANCE * 0.9,
        appMode,
    }
}

export function WithHexalot(flightTarget: IFlightTarget, hexalot: Hexalot): IFlightTarget {
    return <IFlightTarget>{
        ...flightTarget,
        get location(): Vector3 {
            return hexalot.genome ? hexalot.seed : hexalot.center
        },
    }
}

const SEED_DISTANCE = 100
const SEED_HEIGHT = 30

export function SeedTarget(hexalot: Hexalot, appMode: AppMode): IFlightTarget {
    return <IFlightTarget>{
        get location(): Vector3 {
            return hexalot.seed
        },
        distance: SEED_DISTANCE,
        tooFar: SEED_DISTANCE + 1,
        tooClose: SEED_DISTANCE - 1,
        height: SEED_HEIGHT,
        tooHigh: SEED_HEIGHT + 1,
        tooLow: SEED_HEIGHT - 1,
        appMode,
    }
}

export function IslandTarget(island: Island, appMode: AppMode): IFlightTarget {
    return <IFlightTarget>{
        get location(): Vector3 {
            return island.midpoint
        },
        distance: SEED_DISTANCE,
        tooFar: SEED_DISTANCE + 1,
        tooClose: SEED_DISTANCE - 1,
        height: SEED_HEIGHT,
        tooHigh: SEED_HEIGHT + 1,
        tooLow: SEED_HEIGHT - 1,
        appMode,
    }
}

export function WithSpot(flightTarget: IFlightTarget, spot: Spot): IFlightTarget {
    return <IFlightTarget>{...flightTarget, location: spot.center}
}

export function UnknownTarget(): IFlightTarget {
    return <IFlightTarget>{
        location: new Vector3(),
        distance: INITIAL_DISTANCE,
        tooFar: INITIAL_DISTANCE * 2,
        tooClose: INITIAL_DISTANCE / 2,
        height: INITIAL_DISTANCE,
        tooHigh: INITIAL_DISTANCE * 2,
        tooLow: INITIAL_DISTANCE / 2,
        appMode: AppMode.Flying,
    }
}
