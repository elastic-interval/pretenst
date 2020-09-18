/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { SurfaceCharacter, WorldFeature } from "eig"
import { BehaviorSubject } from "rxjs"

import { ADJUSTABLE_INTERVAL_ROLES, FABRIC_FEATURES, IntervalRole, isPushRole } from "../fabric/eig-util"
import { IFeatureConfig } from "../fabric/float-feature"
import { codeToTenscript, ITenscript } from "../fabric/tenscript"
import { IInterval, intervalStrainNuance } from "../fabric/tensegrity-types"

export enum ControlTab {
    Grow = "Grow",
    Shape = "Shape",
    Live = "Live",
    Realize = "Realize",
    Frozen = "Frozen",
}

const VERSION = "2020-09-18"

export interface IFeatureValue {
    numeric: number
    percent: number
}

export interface IStoredState {
    version: string
    nonce: number
    surfaceCharacter: SurfaceCharacter
    featureValues: Record<WorldFeature, IFeatureValue>
    recentCode: Record<string, string>
    controlTab: ControlTab
    fullScreen: boolean
    demoCount: number
    polygons: boolean
    rotating: boolean
    visibleRoles: IntervalRole[]
    pushBottom: number
    pushTop: number
    pullBottom: number
    pullTop: number
}

function extractTenscriptArray(record: Record<string, string>): ITenscript[] {
    return Object.keys(record).map(key => {
        const code = record.recentCode[key]
        const tenscript = codeToTenscript(error => console.error(error), false, code)
        if (!tenscript) {
            throw new Error(`Unable to read recent tenscript code: ${code}`)
        }
        return tenscript
    })
}

export function addRecentCode(state$: BehaviorSubject<IStoredState>, {code, name}: ITenscript): ITenscript[] {
    const state = state$.getValue()
    const recentCode = {...state.recentCode}
    recentCode[name] = code
    transition(state$, {recentCode})
    return extractTenscriptArray(recentCode)
}

export function getRecentTenscript(state: IStoredState): ITenscript[] {
    return extractTenscriptArray(state.recentCode)
}

export function transition(state$: BehaviorSubject<IStoredState>, partial: Partial<IStoredState>): void {
    const state = state$.getValue()
    return state$.next({...state, nonce: state.nonce + 1, ...partial})
}

function initialStoredState(toConfig: (feature: WorldFeature) => IFeatureConfig, defaultValue: (feature: WorldFeature) => number): IStoredState {
    const DEFAULT_FEATURE_VALUES = FABRIC_FEATURES.map(toConfig)
        .reduce((record, config) => {
            record[config.feature] = ({percent: 100, numeric: defaultValue(config.feature)})
            return record
        }, {} as Record<WorldFeature, IFeatureValue>)

    return ({
        version: VERSION,
        nonce: 0,
        surfaceCharacter: SurfaceCharacter.Frozen,
        featureValues: DEFAULT_FEATURE_VALUES,
        recentCode: {},
        controlTab: ControlTab.Grow,
        demoCount: 0,
        fullScreen: true,
        polygons: false,
        rotating: true,
        visibleRoles: ADJUSTABLE_INTERVAL_ROLES,
        pushBottom: 0,
        pushTop: 1,
        pullBottom: 0,
        pullTop: 1,
    })
}

export function isIntervalVisible(interval: IInterval, storedState: IStoredState): boolean {
    if (storedState.visibleRoles.find(r => r === interval.intervalRole) === undefined) {
        return false
    }
    const strainNuance = intervalStrainNuance(interval)
    if (isPushRole(interval.intervalRole)) {
        return strainNuance >= storedState.pushBottom && strainNuance <= storedState.pushTop
    } else {
        return strainNuance >= storedState.pullBottom && strainNuance <= storedState.pullTop
    }
}

const STORED_STATE_KEY = "State"

export function saveState(storedState: IStoredState): void {
    localStorage.setItem(STORED_STATE_KEY, JSON.stringify(storedState))
}

export function loadState(toConfig: (feature: WorldFeature) => IFeatureConfig, defaultValue: (feature: WorldFeature) => number): IStoredState {
    const item = localStorage.getItem(STORED_STATE_KEY)
    if (item) {
        const storedState = JSON.parse(item) as IStoredState
        if (storedState.version === VERSION) {
            return storedState
        }
    }
    return initialStoredState(toConfig, defaultValue)
}
