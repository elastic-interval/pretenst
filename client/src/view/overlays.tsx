/*
 * Copyright (c) 2021. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { Stage, WorldFeature } from "eig"
import * as React from "react"
import { useEffect, useState } from "react"
import {
    FaCircle,
    FaCompressArrowsAlt,
    FaHandPointUp,
    FaHandRock,
    FaParachuteBox,
    FaPlay,
    FaSignOutAlt,
    FaSnowflake,
    FaSyncAlt,
} from "react-icons/all"
import { Button, ButtonDropdown, ButtonGroup, DropdownItem, DropdownMenu, DropdownToggle } from "reactstrap"
import { useRecoilState } from "recoil"

import { ADJUSTABLE_INTERVAL_ROLES, intervalRoleName, stageName } from "../fabric/eig-util"
import { Tensegrity } from "../fabric/tensegrity"
import {
    demoModeAtom,
    FEATURE_VALUES,
    featureFilter,
    rotatingAtom,
    ViewMode,
    viewModeAtom,
    visibleRolesAtom,
} from "../storage/recoil"

import { FeatureSlider } from "./feature-slider"
import { roleColorString } from "./materials"

export function TopMiddle({tensegrity}: { tensegrity: Tensegrity }): JSX.Element {
    const [stage, updateStage] = useState(tensegrity.stage$.getValue())
    useEffect(() => {
        const sub = tensegrity.stage$.subscribe(updateStage)
        return () => sub.unsubscribe()
    }, [tensegrity])
    return (
        <div>
            <span>{stageName(stage)}</span> <i>"{tensegrity.name}"</i>
        </div>
    )
}

export function TopLeft({tensegrity}: { tensegrity: Tensegrity }): JSX.Element {
    return (
        <div>
            <Button>Growth</Button>
        </div>
    )
}

export function TopRight(): JSX.Element {
    const [visibleRoles, updateVisibleRoles] = useRecoilState(visibleRolesAtom)
    const [viewMode] = useRecoilState(viewModeAtom)
    return viewMode === ViewMode.Frozen ? (
        <div>
            <ButtonGroup className="w-100">
                {ADJUSTABLE_INTERVAL_ROLES.map(intervalRole => (
                    <Button key={`viz${intervalRole}`} onClick={() => {
                        if (visibleRoles.indexOf(intervalRole) < 0) {
                            updateVisibleRoles([...visibleRoles, intervalRole])
                        } else {
                            const nextRoles = visibleRoles.filter(role => role !== intervalRole)
                            updateVisibleRoles(nextRoles.length > 0 ? nextRoles : ADJUSTABLE_INTERVAL_ROLES)
                        }
                    }}
                            color={visibleRoles.some(role => role === intervalRole) ? "success" : "secondary"}
                    >
                        {intervalRoleName(intervalRole)}
                        <FaCircle
                            style={{color: roleColorString(intervalRole)}}
                        />
                    </Button>
                ))}
            </ButtonGroup>
        </div>
    ) : (
        <Button>Not frozen</Button>
    )
}

export function BottomLeft(): JSX.Element {
    const [demoMode] = useRecoilState(demoModeAtom)
    const [viewMode, setViewMode] = useRecoilState(viewModeAtom)

    function ViewModeButton({item, children}: {
        item: ViewMode,
        children: JSX.Element | (JSX.Element[] | JSX.Element | undefined)[],
    }): JSX.Element {
        return demoMode ? <div/> : (
            <Button
                disabled={item === viewMode}
                color={item === viewMode ? "success" : "secondary"}
                onClick={() => setViewMode(item)}
            >
                {children}
            </Button>
        )
    }

    return (
        <ButtonGroup>
            <ViewModeButton item={ViewMode.Lines}>
                <FaPlay/>
            </ViewModeButton>
            <ViewModeButton item={ViewMode.Selecting}>
                <FaHandPointUp/>
            </ViewModeButton>
            <ViewModeButton item={ViewMode.Frozen}>
                <FaSnowflake/>
            </ViewModeButton>
        </ButtonGroup>
    )
}

export function BottomMiddle({tensegrity}: { tensegrity: Tensegrity }): JSX.Element {
    const [stage, updateStage] = useState(tensegrity.stage$.getValue())
    useEffect(() => {
        const sub = tensegrity.stage$.subscribe(updateStage)
        return () => sub.unsubscribe()
    }, [tensegrity])
    const [open, setOpen] = useState(false)
    const [featureValue, setFeatureValue] = useState(FEATURE_VALUES[WorldFeature.VisualStrain])
    return (
        <div className="w-100 d-flex">
            <ButtonDropdown isOpen={open} toggle={() => setOpen(!open)}>
                <DropdownToggle>Choose</DropdownToggle>
                <DropdownMenu>{
                    FEATURE_VALUES
                        .filter(featureFilter(stage))
                        .map((value) => (
                            <DropdownItem key={`fitem-${value.mapping.feature}`} onClick={() => setFeatureValue(value)}>
                                {value.mapping.name}
                            </DropdownItem>
                        ))
                }</DropdownMenu>
            </ButtonDropdown>
            <FeatureSlider
                featureValue={featureValue}
                apply={(feature, percent, value) => {
                    tensegrity.instance.applyFeature(feature, percent, value)
                }}
            />
        </div>
    )
}

export function BottomRight({tensegrity}: { tensegrity: Tensegrity }): JSX.Element {
    const [stage, updateStage] = useState(tensegrity.stage$.getValue())
    useEffect(() => {
        const sub = tensegrity.stage$.subscribe(updateStage)
        return () => sub.unsubscribe()
    }, [tensegrity])
    const [demoMode, setDemoMode] = useRecoilState(demoModeAtom)
    const [rotating, setRotating] = useRecoilState(rotatingAtom)
    return demoMode ? (
        <ButtonGroup>
            <Button
                color="success"
                onClick={() => {
                    setDemoMode(false)
                    setRotating(false)
                }}
            >
                <FaSignOutAlt/> Exit demo
            </Button>
        </ButtonGroup>
    ) : (
        <ButtonGroup>
            {stage < Stage.Slack ? (
                <Button disabled={stage !== Stage.Shaping}
                        onClick={() => tensegrity.fabric.centralize()}>
                    <FaCompressArrowsAlt/>
                </Button>
            ) : stage > Stage.Slack ? (
                <>
                    <Button disabled={stage !== Stage.Pretenst}
                            onClick={() => tensegrity.fabric.set_altitude(1)}>
                        <FaHandRock/>
                    </Button>
                    <Button disabled={stage !== Stage.Pretenst}
                            onClick={() => tensegrity.fabric.set_altitude(10)}>
                        <FaParachuteBox/>
                    </Button>
                </>
            ) : undefined}
            <Button
                color={rotating ? "warning" : "secondary"}
                onClick={() => setRotating(!rotating)}
            >
                <FaSyncAlt/>
            </Button>
        </ButtonGroup>
    )
}
