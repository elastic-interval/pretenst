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

import { INITIAL_DISTANCE, MINIMUM_DISTANCE, polarAngle } from "./flight"

export interface IFlightState {
    readonly target: Vector3
    readonly tooFar: number
    readonly tooClose: number
    readonly towardsDistance: number
    readonly tooVertical: number
    readonly tooHorizontal: number
    readonly towardsPolarAngle: number
    readonly appMode: AppMode
}

export function JockeyTarget(jockey: Jockey): IFlightState {
    return <IFlightState>{
        get target(): Vector3 {
            return jockey.fabric.midpoint
        },
        tooFar: MINIMUM_DISTANCE * 1.4,
        tooClose: MINIMUM_DISTANCE * 1.2,
        towardsDistance: 0.04,
        tooVertical: polarAngle(0.1),
        tooHorizontal: polarAngle(0),
        towardsPolarAngle: 0.005,
        appMode: AppMode.Riding,
    }
}

export function EvolutionTarget(evolution: Evolution): IFlightState {
    return <IFlightState>{
        get target(): Vector3 {
            return evolution.midpoint
        },
        tooFar: 35,
        tooClose: 25,
        towardsDistance: 0.1,
        tooVertical: polarAngle(0.1),
        tooHorizontal: polarAngle(0),
        towardsPolarAngle: 0.005,
        appMode: AppMode.Evolving,
    }
}

const HEXALOT_DISTANCE = 450

export function HexalotTarget(hexalot: Hexalot, appMode: AppMode): IFlightState {
    return <IFlightState>{
        get target(): Vector3 {
            return hexalot.genome ? hexalot.seed : hexalot.center
        },
        tooFar: HEXALOT_DISTANCE * 1.05,
        tooClose: HEXALOT_DISTANCE * 0.95,
        towardsDistance: 0.08,
        tooVertical: polarAngle(1),
        tooHorizontal: polarAngle(0.9),
        towardsPolarAngle: 0.008,
        appMode,
    }
}

export function WithHexalot(flightState: IFlightState, hexalot: Hexalot): IFlightState {
    return <IFlightState>{
        ...flightState,
        get target(): Vector3 {
            return hexalot.genome ? hexalot.seed : hexalot.center
        },
    }
}

export function IslandTarget(island: Island, appMode: AppMode): IFlightState {
    return <IFlightState>{
        get target(): Vector3 {
            return island.midpoint
        },
        tooFar: 105,
        tooClose: 95,
        towardsDistance: 0.1,
        tooVertical: polarAngle(1),
        tooHorizontal: polarAngle(0.9),
        towardsPolarAngle: 0.01,
        appMode,
    }
}

export function WithSpot(flightState: IFlightState, spot: Spot): IFlightState {
    return <IFlightState>{...flightState, target: spot.center}
}

export function InitialFlightState(): IFlightState {
    return <IFlightState>{
        target: new Vector3(),
        tooFar: INITIAL_DISTANCE + 1,
        tooClose: INITIAL_DISTANCE - 1,
        towardsDistance: 0.5,
        tooVertical: polarAngle(0),
        tooHorizontal: polarAngle(0.1),
        towardsPolarAngle: 0.01,
        appMode: AppMode.Flying,
    }
}

export function TensegrityFlightState(): IFlightState {
    return <IFlightState>{
        target: new Vector3(0, 3.4, 0),
        tooFar: 12,
        tooClose: 11,
        towardsDistance: 0.04,
        tooVertical: polarAngle(0.98),
        tooHorizontal: polarAngle(0.94),
        towardsPolarAngle: 0.005,
        appMode: AppMode.Riding,
    }
}
