/*
 * Copyright (c) 2021. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import * as React from "react"
import { FaCamera, FaHandPointUp, FaPlay } from "react-icons/all"
import { Button, ButtonGroup } from "reactstrap"
import { useRecoilState } from "recoil"

import { ViewMode, viewModeAtom } from "../storage/recoil"

export function BottomLeft(): JSX.Element {
    const [viewMode, setViewMode] = useRecoilState(viewModeAtom)

    function ViewModeButton({item, children}: {
        item: ViewMode,
        children: JSX.Element | (JSX.Element[] | JSX.Element | undefined)[],
    }): JSX.Element {
        return (
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
            <ViewModeButton item={ViewMode.Time}>
                <FaPlay/><span> Time</span>
            </ViewModeButton>
            <ViewModeButton item={ViewMode.Select}>
                <FaHandPointUp/><span> Select</span>
            </ViewModeButton>
            <ViewModeButton item={ViewMode.Look}>
                <FaCamera/><span> Look</span>
            </ViewModeButton>
        </ButtonGroup>
    )
}
