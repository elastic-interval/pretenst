/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { IntervalRole, SurfaceCharacter, WorldFeature } from "eig"

import { ADJUSTABLE_INTERVAL_ROLES, FABRIC_FEATURES } from "../fabric/eig-util"
import { IFeatureConfig } from "../fabric/float-feature"
import { codeToTenscript, ITenscript } from "../fabric/tenscript"
import { IInterval } from "../fabric/tensegrity-types"

export enum ControlTab {
    Grow = "Grow",
    Shape = "Shape",
    Live = "Live",
    Realize = "Realize",
    Frozen = "Frozen",
}

const VERSION = "2020-06-03"

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
    polygons: boolean
    rotating: boolean
    visibleRoles: IntervalRole[]
    pushBottom: number
    pushTop: number
    pullBottom: number
    pullTop: number
}

export function addRecentCode(state: IStoredState, {code, name}: ITenscript): IStoredState {
    const recentCode = {...state.recentCode}
    recentCode[name] = code
    return transition(state, {recentCode})
}

export function getRecentTenscript(state: IStoredState): ITenscript[] {
    return Object.keys(state.recentCode).map(key => {
        const code = state.recentCode[key]
        const tenscript = codeToTenscript(error => console.error(error), false, code)
        if (!tenscript) {
            throw new Error(`Unable to read recent tenscript code: ${code}`)
        }
        return tenscript
    })
}

export function roleLengthFeature(intervalRole: IntervalRole): WorldFeature {
    switch (intervalRole) {
        case IntervalRole.NexusPush:
            return WorldFeature.NexusPushLength
        case IntervalRole.ColumnPush:
            return WorldFeature.ColumnPushLength
        case IntervalRole.Triangle:
            return WorldFeature.TriangleLength
        case IntervalRole.Ring:
            return WorldFeature.RingLength
        case IntervalRole.Cross:
            return WorldFeature.CrossLength
        case IntervalRole.BowMid:
            return WorldFeature.BowMidLength
        case IntervalRole.BowEnd:
            return WorldFeature.BowEndLength
        case IntervalRole.RibbonPush:
            return WorldFeature.RibbonPushLength
        case IntervalRole.RibbonShort:
            return WorldFeature.RibbonShortLength
        case IntervalRole.RibbonLong:
            return WorldFeature.RibbonLongLength
        case IntervalRole.RibbonHanger:
            return WorldFeature.RibbonHangerLength
        default:
            throw new Error("role?")
    }
}

export function roleDefaultFromFeatures(featureNumeric: (feature: WorldFeature) => number, intervalRole: IntervalRole): number {
    if (intervalRole === IntervalRole.FaceConnector || intervalRole === IntervalRole.FaceDistancer || intervalRole === IntervalRole.FaceAnchor) {
        throw new Error()
    }
    return featureNumeric(roleLengthFeature(intervalRole))
}

export function transition(state: IStoredState, partial: Partial<IStoredState>): IStoredState {
    return {...state, nonce: state.nonce + 1, ...partial}
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
        fullScreen: true,
        polygons: false,
        rotating: false,
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
    const strainNuance = interval.strainNuance()
    if (interval.isPush) {
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
