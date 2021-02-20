/*
 * Copyright (c) 2021. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { Stage, SurfaceCharacter } from "eig"
import { atom, RecoilState } from "recoil"
import { recoilPersist } from "recoil-persist"

import { ADJUSTABLE_INTERVAL_ROLES, IntervalRole, WORLD_FEATURES } from "../fabric/eig-util"
import { ITenscript } from "../fabric/tenscript"
import { featureMapping, FeatureStage, IFeatureMapping } from "../view/feature-mapping"

const {persistAtom} = recoilPersist()
const persist = [persistAtom]

const defaultBootstrap = 3

export const demoModeAtom = atom({
    key: "demoMode",
    default: false,
    effects_UNSTABLE: persist,
})

export const bootstrapIndexAtom = atom({
    key: "bootstrapIndex",
    default: defaultBootstrap,
    effects_UNSTABLE: persist,
})

export const tenscriptAtom = atom<ITenscript | undefined>({
    key: "tenscript",
    default: undefined,
    effects_UNSTABLE: persist,
})

export enum ControlTab {
    Script = "Script",
    Phase = "Phase",
}

export const controlTabAtom = atom({
    key: "controlTab",
    default: ControlTab.Script,
    effects_UNSTABLE: persist,
})

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

function createWorldFeatureValues(): IWorldFeatureValue[] {
    return WORLD_FEATURES.map(feature => {
        const mapping = featureMapping(feature)
        const percentAtom = atom({
            key: mapping.name,
            default: 100,
            effects_UNSTABLE: persist,
        })
        return <IWorldFeatureValue>{mapping, percentAtom}
    })
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

