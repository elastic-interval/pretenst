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
    FaMinusSquare,
    FaParachuteBox,
    FaPlay,
    FaPlusSquare,
    FaSignOutAlt,
    FaSnowflake,
    FaSyncAlt,
} from "react-icons/all"
import { Button, ButtonDropdown, ButtonGroup, DropdownItem, DropdownMenu, DropdownToggle } from "reactstrap"
import { useRecoilState } from "recoil"

import {
    ADJUSTABLE_INTERVAL_ROLES,
    floatString,
    IntervalRole,
    intervalRoleName,
    roleDefaultLength,
    stageName,
} from "../fabric/eig-util"
import { Tensegrity } from "../fabric/tensegrity"
import { IInterval } from "../fabric/tensegrity-types"
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
import { STAGE_TRANSITIONS, StageButton } from "./stage-button"

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
    const [viewMode] = useRecoilState(viewModeAtom)
    return (
        <ButtonGroup>{
            STAGE_TRANSITIONS
                .map(stageTransition => (
                    <StageButton
                        key={`strans-${stageTransition}`}
                        tensegrity={tensegrity}
                        stageTransition={stageTransition}
                        disabled={viewMode === ViewMode.Frozen}/>
                ))
        }</ButtonGroup>
    )
}

export function TopRight({tensegrity}: { tensegrity: Tensegrity }): JSX.Element {
    const [viewMode] = useRecoilState(viewModeAtom)
    const [visibleRoles, updateVisibleRoles] = useRecoilState(visibleRolesAtom)
    const [currentRole, updateCurrentRole] = useState(IntervalRole.PullA)
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
        <div>
            <ButtonGroup className="my-2 w-100">{
                ADJUSTABLE_INTERVAL_ROLES
                    .map((intervalRole, index) => (
                        <Button key={`IntervalRole[${index}]`}
                                onClick={() => updateCurrentRole(intervalRole)}
                                color={currentRole === intervalRole ? "success" : "secondary"}
                        >
                            {intervalRoleName(intervalRole)}
                        </Button>
                    ))
            }</ButtonGroup>
            <RoleLengthAdjuster tensegrity={tensegrity} intervalRole={currentRole}/>
        </div>
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
                <>
                    <Button
                        disabled={stage !== Stage.Shaping}
                        onClick={() => tensegrity.do(t => t.triangulate((a, b, hasPush) => (
                            !hasPush || a !== IntervalRole.PullA || b !== IntervalRole.PullA
                        )))}>
                        <span>&#9653;</span>
                    </Button>
                    <Button disabled={stage !== Stage.Shaping}
                            onClick={() => tensegrity.fabric.centralize()}>
                        <FaCompressArrowsAlt/>
                    </Button>
                </>
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

function RoleLengthAdjuster({tensegrity, intervalRole, disabled}: {
    tensegrity: Tensegrity,
    intervalRole: IntervalRole,
    disabled?: boolean,
}): JSX.Element {

    function defaultLength(): number {
        return roleDefaultLength(intervalRole)
    }

    function intervals(): IInterval[] {
        return tensegrity.intervals.filter(interval => interval.intervalRole === intervalRole)
    }

    const adjustValue = (up: boolean, fine: boolean) => () => {
        function adjustment(): number {
            const factor = fine ? 1.01 : 1.05
            return up ? factor : (1 / factor)
        }

        intervals().forEach(interval => tensegrity.changeIntervalScale(interval, adjustment()))
    }

    return (
        <div className="text-right">
            <ButtonGroup>
                <Button disabled={disabled} onClick={adjustValue(true, false)}><FaPlusSquare/><FaPlusSquare/></Button>
                <Button disabled={disabled} onClick={adjustValue(true, true)}><FaPlusSquare/></Button>
                <Button disabled={disabled} onClick={adjustValue(false, true)}><FaMinusSquare/></Button>
                <Button disabled={disabled}
                        onClick={adjustValue(false, false)}><FaMinusSquare/><FaMinusSquare/></Button>
            </ButtonGroup>
            <br/>
            <ButtonGroup className="my-2">
                <Button>{intervalRoleName(intervalRole)} = [{floatString(defaultLength())}]</Button>
            </ButtonGroup>
        </div>
    )
}
