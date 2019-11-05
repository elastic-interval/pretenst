/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

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
    0.0000005,
    0.0,
]

export enum DragCharacter {
    Light,
    Heavy,
    Free,
}

export const DRAG = [
    0.00001,
    0.0001,
    0.0,
]

export enum DensityCharacter {
    Push5Pull1,
    Push2Pull1,
    Push1Pull1,
}

export const DENSITY = [
    {push: 5, pull: 1},
    {push: 3, pull: 1},
    {push: 1, pull: 1},
]

export function enumValues(e: object): number[] {
    return Object.keys(e).filter(k => k.length > 1).map(k => e[k])
}

export interface IFabricState {
    lifePhase: LifePhase
    gravityCharacter: GravityCharacter
    dragCharacter: DragCharacter
    densityCharacter: DensityCharacter
    rotating: boolean
    frozen: boolean
    showPushes: boolean
    showPulls: boolean
}