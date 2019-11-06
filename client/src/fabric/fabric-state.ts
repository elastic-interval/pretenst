/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { SurfaceCharacter } from "./fabric-engine"

export enum LifePhase {
    Growing = 0,
    Shaping = 1,
    Slack = 2,
    Pretensing = 3,
    Pretenst = 4,
}

export function doNotClick(lifePhase: LifePhase): boolean {
    return lifePhase === LifePhase.Growing || lifePhase === LifePhase.Slack
}

export function hideSurface(lifePhase: LifePhase): boolean {
    return lifePhase === LifePhase.Growing || lifePhase === LifePhase.Shaping || lifePhase === LifePhase.Slack
}

export enum GravityCharacter {
    Light,
    Heavy,
    Space,
}

export const GRAVITY = [
    0.00000005,
    0.0000001,
    0.0,
]

export enum DragCharacter {
    Light,
    Heavy,
    Free,
}

export const DRAG = [
    0.00001,
    0.001,
    0.0,
]

export enum ControlTab {
    Generate = "Generate",
    Pretense = "Pretense",
    Test = "Test",
    Features = "Features",
}

export function enumValues(e: object): number[] {
    return Object.keys(e).filter(k => k.length > 1).map(k => e[k])
}

export interface IFabricState {
    nonce: number
    gravityCharacter: GravityCharacter
    dragCharacter: DragCharacter
    surfaceCharacter: SurfaceCharacter
    rotating: boolean
    frozen: boolean
    showPushes: boolean
    showPulls: boolean
    fullScreen: boolean
}

const INITIAL_FABRIC_STATE: IFabricState = {
    nonce: 0,
    gravityCharacter: GravityCharacter.Light,
    dragCharacter: DragCharacter.Light,
    surfaceCharacter: SurfaceCharacter.Sticky,
    rotating: false,
    frozen: false,
    showPushes: true,
    showPulls: true,
    fullScreen: false,
}

const FABRIC_STATE_KEY = "FabricState"

export function saveFabricState(fabricState: IFabricState): void {
    localStorage.setItem(FABRIC_STATE_KEY, JSON.stringify(fabricState))
}

export function loadFabricState(): IFabricState {
    const item = localStorage.getItem(FABRIC_STATE_KEY)
    if (item) {
        return JSON.parse(item) as IFabricState
    }
    return INITIAL_FABRIC_STATE
}
