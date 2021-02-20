/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import * as React from "react"
import { FaArrowDown, FaArrowUp, FaHandPointUp } from "react-icons/all"
import { Button, ButtonGroup } from "reactstrap"

import { FaceAction } from "../fabric/tenscript"
import { Tensegrity } from "../fabric/tensegrity"
import { FaceSelection, ISelection, percentFromFactor } from "../fabric/tensegrity-types"

import { Grouping } from "./control-tabs"

export function ShapeTab({tensegrity, selection}: {
    tensegrity: Tensegrity,
    selection: ISelection,
}): JSX.Element {

    const adjustValue = (up: boolean) => () => {
        const factor = 1.03
        selection.intervals.forEach(interval => {
            tensegrity.changeIntervalScale(interval, up ? factor : (1 / factor))
        })
    }

    return (
        <div>
            <Grouping>
                <h6 className="w-100 text-center"><FaHandPointUp/> Manual</h6>
                <ButtonGroup size="sm" className="w-100 my-2">
                    <Button disabled={selection.intervals.length === 0} onClick={adjustValue(true)}>
                        <FaArrowUp/> Lengthen
                    </Button>
                    <Button disabled={selection.intervals.length === 0} onClick={adjustValue(false)}>
                        <FaArrowDown/> Shorten
                    </Button>
                </ButtonGroup>
                <ButtonGroup size="sm" className="w-100 my-2">
                    <Button
                        onClick={() => tensegrity.do(t => {
                            const faces = selection.faces.filter(({faceSelection}) => faceSelection === FaceSelection.Face)
                            return t.createRadialPulls(faces, FaceAction.Distance, percentFromFactor(0.75))
                        })}>
                        <span>Distance-75</span>
                    </Button>
                </ButtonGroup>
            </Grouping>
        </div>
    )
}
