/*
 * Copyright (c) 2021. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { Stage, SurfaceCharacter } from "eig"
import { atom, RecoilState } from "recoil"
import { recoilPersist } from "recoil-persist"

import { ADJUSTABLE_INTERVAL_ROLES, IntervalRole, WORLD_FEATURES } from "../fabric/eig-util"
import { ITenscript } from "../fabric/tenscript"
import { PostGrowthOp } from "../fabric/tensegrity"
import { featureMapping, FeatureStage, IFeatureMapping } from "../view/feature-mapping"

export const STORAGE_KEY = "pretenst-2021-02-27"
const DEFAULT_BOOTSTRAP = 0

const {persistAtom} = recoilPersist({
    key: STORAGE_KEY,
    storage: localStorage,
})

// eslint-disable-next-line @typescript-eslint/tslint/config
const effects_UNSTABLE = [persistAtom]

export const demoModeAtom = atom({
    key: "demoMode",
    default: true,
    effects_UNSTABLE,
})

export const startDemoAtom = atom({
    key: "startDemo",
    default: false,
})

export const endDemoAtom = atom({
    key: "endDemo",
    default: false,
})

export const postGrowthAtom = atom({
    key: "postGrowth",
    default: PostGrowthOp.NoOop,
    effects_UNSTABLE,
})

export const bootstrapIndexAtom = atom({
    key: "bootstrapIndex",
    default: DEFAULT_BOOTSTRAP,
    effects_UNSTABLE,
})

export const tenscriptAtom = atom<ITenscript | undefined>({
    key: "tenscript",
    default: undefined,
    effects_UNSTABLE,
})

function createWorldFeatureValues(): IWorldFeatureValue[] {
    return WORLD_FEATURES.map(feature => {
        const mapping = featureMapping(feature)
        const percentAtom = atom({
            key: mapping.name,
            default: 100,
            effects_UNSTABLE,
        })
        return <IWorldFeatureValue>{mapping, percentAtom}
    })
}

export const rotatingAtom = atom({
    key: "rotating",
    default: false,
})

export enum ViewMode {
    Lines = "Lines",
    Selecting = "Selecting",
    Frozen = "Frozen",
}

export const viewModeAtom = atom<ViewMode>({
    key: "viewMode",
    default: ViewMode.Lines,
})

export const surfaceCharacterAtom = atom({
    key: "surfaceCharacter",
    default: SurfaceCharacter.Frozen,
})

export const visibleRolesAtom = atom<IntervalRole[]>({
    key: "visibleRoles",
    default: ADJUSTABLE_INTERVAL_ROLES,
})

export interface IWorldFeatureValue {
    mapping: IFeatureMapping
    percentAtom: RecoilState<number>
}

export const FEATURE_VALUES = createWorldFeatureValues()

export function featureFilter(stage: Stage): (value: IWorldFeatureValue) => boolean {
    return value => {
        const {mapping} = value
        if (mapping.name.startsWith("-")) {
            return false
        }
        switch (mapping.featureStage) {
            case FeatureStage.Preslack:
                return stage < Stage.Slack
            case FeatureStage.Postslack:
                return stage >= Stage.Slack
            default:
                return true
        }
    }
}

