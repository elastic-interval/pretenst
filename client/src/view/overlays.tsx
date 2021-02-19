/*
 * Copyright (c) 2021. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { WorldFeature } from "eig"
import * as React from "react"
import { useEffect, useState } from "react"
import { FaHandPointUp, FaPlay, FaSignOutAlt, FaSnowflake, FaSyncAlt } from "react-icons/all"
import { Button, ButtonDropdown, ButtonGroup, DropdownItem, DropdownMenu, DropdownToggle } from "reactstrap"
import { useRecoilState } from "recoil"

import { stageName } from "../fabric/eig-util"
import { Tensegrity } from "../fabric/tensegrity"
import { demoModeAtom, FEATURE_VALUES, rotatingAtom, ViewMode, viewModeAtom } from "../storage/recoil"

import { FeatureSlider } from "./feature-slider"

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
    const [open, setOpen] = useState(false)
    const [featureValue, setFeatureValue] = useState(FEATURE_VALUES[WorldFeature.VisualStrain])
    return (
        <div className="w-100 d-flex">
            <ButtonDropdown isOpen={open} toggle={() => setOpen(!open)}>
                <DropdownToggle>Choose</DropdownToggle>
                <DropdownMenu>{FEATURE_VALUES.map((value) => (
                    <DropdownItem key={`fitem-${value.mapping.feature}`} onClick={() => setFeatureValue(value)}>
                        {value.mapping.name}
                    </DropdownItem>
                ))}</DropdownMenu>
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

export function BottomRight(): JSX.Element {
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
            <Button
                color={rotating ? "warning" : "secondary"}
                onClick={() => setRotating(!rotating)}
            >
                <FaSyncAlt/>
            </Button>
        </ButtonGroup>
    )
}

