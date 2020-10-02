/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { WorldFeature } from "eig"
import * as React from "react"
import { useEffect, useState } from "react"
import {
    FaArrowDown,
    FaArrowUp,
    FaCompressArrowsAlt,
    FaHandPointUp,
    FaList,
    FaMagic,
    FaMinusSquare,
    FaPlusSquare,
    FaTools,
} from "react-icons/all"
import { Button, ButtonGroup } from "reactstrap"
import { BehaviorSubject } from "rxjs"

import {
    ADJUSTABLE_INTERVAL_ROLES,
    floatString,
    IntervalRole,
    intervalRoleName,
    roleDefaultLength,
} from "../fabric/eig-util"
import { FloatFeature } from "../fabric/float-feature"
import { Tensegrity } from "../fabric/tensegrity"
import { TensegrityOptimizer } from "../fabric/tensegrity-optimizer"
import { FaceSelection, IInterval, ISelection } from "../fabric/tensegrity-types"
import { IStoredState, transition, ViewMode } from "../storage/stored-state"

import { Grouping } from "./control-tabs"
import { FeaturePanel } from "./feature-panel"

export function ShapeTab(
    {worldFeatures, tensegrity, selection, viewMode, storedState$}: {
        worldFeatures: Record<WorldFeature, FloatFeature>,
        tensegrity: Tensegrity,
        selection: ISelection,
        viewMode: ViewMode,
        storedState$: BehaviorSubject<IStoredState>,
    }): JSX.Element {

    const [currentRole, updateCurrentRole] = useState(storedState$.getValue().currentRole)
    useEffect(() => {
        const sub = storedState$.subscribe(newState => updateCurrentRole(newState.currentRole))
        return () => sub.unsubscribe()
    }, [])

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
                    <Button disabled={viewMode !== ViewMode.Selecting} onClick={adjustValue(true)}>
                        <FaArrowUp/> Lengthen
                    </Button>
                    <Button disabled={viewMode !== ViewMode.Selecting} onClick={adjustValue(false)}>
                        <FaArrowDown/> Shorten
                    </Button>
                </ButtonGroup>
                <ButtonGroup size="sm" className="w-100 my-2">
                    <Button
                        onClick={() => tensegrity.do(t => t.builder
                            .createRadialPulls(selection.faces.filter(f => f.faceSelection === FaceSelection.Face)))}>
                        <span>Distance-75</span>
                    </Button>
                    <Button
                        onClick={() => new TensegrityOptimizer(tensegrity)
                            .replaceCrosses(tensegrity.numericFeature(WorldFeature.IntervalCountdown))
                        }>
                        <FaMagic/><span> Optimize</span>
                    </Button>
                </ButtonGroup>
            </Grouping>
            <Grouping>
                <h6 className="w-100 text-center"><FaList/> Interval Lengths</h6>
                <ButtonGroup className="my-2 w-100">{
                    ADJUSTABLE_INTERVAL_ROLES
                        .map((intervalRole, index) => (
                            <Button size="sm" key={`IntervalRole[${index}]`}
                                    onClick={() => transition(storedState$, {currentRole: intervalRole})}
                                    color={currentRole === intervalRole ? "success" : "secondary"}
                            >
                                {intervalRoleName(intervalRole)}
                            </Button>
                        ))
                }</ButtonGroup>
                <RoleLengthAdjuster tensegrity={tensegrity} intervalRole={currentRole}/>
            </Grouping>
            <Grouping>
                <h6 className="w-100 text-center"><FaTools/> Shaping</h6>
                <FeaturePanel feature={worldFeatures[WorldFeature.ShapingPretenstFactor]}/>
                <FeaturePanel feature={worldFeatures[WorldFeature.ShapingDrag]}/>
                <FeaturePanel feature={worldFeatures[WorldFeature.ShapingStiffnessFactor]}/>
                <ButtonGroup className="w-100 my-3">
                    <Button onClick={() => tensegrity.fabric.centralize()}>
                        <FaCompressArrowsAlt/> Centralize
                    </Button>
                </ButtonGroup>
            </Grouping>
        </div>
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
        <div className="my-2">
            <div className="float-right" style={{color: disabled ? "gray" : "white"}}>
                [{floatString(defaultLength())}]
            </div>
            <div>
                {intervalRoleName(intervalRole, true)}
            </div>
            <ButtonGroup className="w-100">
                <Button disabled={disabled} onClick={adjustValue(true, false)}><FaPlusSquare/><FaPlusSquare/></Button>
                <Button disabled={disabled} onClick={adjustValue(true, true)}><FaPlusSquare/></Button>
                <Button disabled={disabled} onClick={adjustValue(false, true)}><FaMinusSquare/></Button>
                <Button disabled={disabled}
                        onClick={adjustValue(false, false)}><FaMinusSquare/><FaMinusSquare/></Button>
            </ButtonGroup>
        </div>
    )
}
