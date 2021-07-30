/*
 * Copyright (c) 2021. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import * as React from "react"
import { FaHandPointUp, FaPlay, FaSnowflake } from "react-icons/all"
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
