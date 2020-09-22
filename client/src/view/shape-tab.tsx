/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { Stage, WorldFeature } from "eig"
import * as React from "react"
import { useEffect, useState } from "react"
import {
    FaArrowAltCircleRight,
    FaArrowDown,
    FaArrowUp,
    FaCheck,
    FaDragon,
    FaHandPointUp,
    FaList,
    FaMagic,
    FaMinusSquare,
    FaPlusSquare,
    FaSlidersH,
    FaTimesCircle,
    FaTools,
    FaUndoAlt,
} from "react-icons/fa/index"
import { Button, ButtonGroup } from "reactstrap"
import { BehaviorSubject } from "rxjs"

import {
    ADJUSTABLE_INTERVAL_ROLES,
    floatString,
    IntervalRole,
    intervalRoleName, isPushRole,
    roleDefaultLength,
} from "../fabric/eig-util"
import { FloatFeature } from "../fabric/float-feature"
import { Tensegrity } from "../fabric/tensegrity"
import { TensegrityOptimizer } from "../fabric/tensegrity-optimizer"
import { IInterval, IJoint } from "../fabric/tensegrity-types"
import { IStoredState } from "../storage/stored-state"

import { Grouping } from "./control-tabs"
import { FeaturePanel } from "./feature-panel"
import { LifeStageButton, StageTransition } from "./life-stage-button"

export enum ShapeSelection {
    None,
    Joints,
    Intervals,
}

export function ShapeTab(
    {
        worldFeatures, tensegrity, selectedIntervals,
        setFabric, shapeSelection, setShapeSelection,
        selectedJoints, clearSelection, storedState$,
    }: {
        worldFeatures: Record<WorldFeature, FloatFeature>,
        tensegrity: Tensegrity,
        setFabric: (tensegrity: Tensegrity) => void,
        selectedIntervals: IInterval[],
        shapeSelection: ShapeSelection,
        setShapeSelection: (shapeSelection: ShapeSelection) => void,
        selectedJoints: IJoint[],
        clearSelection: () => void,
        storedState$: BehaviorSubject<IStoredState>,
    }): JSX.Element {

    const [pushAndPull, setPushAndPull] = useState(false)
    useEffect(() => {
        tensegrity.instance.world.set_push_and_pull(pushAndPull)
    }, [pushAndPull])

    const [polygons, updatePolygons] = useState(storedState$.getValue().polygons)
    useEffect(() => {
        const subscriptions = [
            storedState$.subscribe(newState => updatePolygons(newState.polygons)),
        ]
        return () => subscriptions.forEach(sub => sub.unsubscribe())
    }, [])

    const [life, updateLife] = useState(tensegrity.life$.getValue())
    useEffect(() => {
        const sub = tensegrity.life$.subscribe(updateLife)
        return () => sub.unsubscribe()
    }, [tensegrity])

    const [currentRole, setCurrentRole] = useState(IntervalRole.Twist)

    const adjustValue = (up: boolean, pushes: boolean, pulls: boolean) => () => {
        function adjustment(): number {
            const factor = 1.03
            return up ? factor : (1 / factor)
        }

        if (!selectedIntervals) {
            return
        }
        selectedIntervals.forEach(interval => {
            const isPush = isPushRole(interval.intervalRole)
            if (isPush && !pushes || !isPush && !pulls) {
                return
            }
            tensegrity.changeIntervalScale(interval, adjustment())
        })
    }

    function disabled(): boolean {
        return polygons || life.stage !== Stage.Shaping
    }

    function disableUnlessFaceCount(faceCount: number, mode: ShapeSelection): boolean {
        if (disabled() || shapeSelection !== mode) {
            return true
        }
        return selectedJoints.length < faceCount || polygons
    }

    function disabledLifeStage(): boolean {
        return polygons || shapeSelection !== ShapeSelection.None
    }

    return (
        <div>
            <Grouping>
                <h6 className="w-100 text-center"><FaArrowAltCircleRight/> Phase</h6>
                <LifeStageButton
                    tensegrity={tensegrity}
                    stageTransition={StageTransition.CaptureLengthsToSlack}
                    disabled={disabledLifeStage()}
                />
            </Grouping>
            <Grouping>
                <h6 className="w-100 text-center"><FaHandPointUp/> Manual</h6>
                <ButtonGroup size="sm" className="w-100 my-2">
                    <Button
                        color={shapeSelection === ShapeSelection.Joints ? "warning" : "secondary"}
                        disabled={polygons && shapeSelection === ShapeSelection.None}
                        onClick={() => {
                            clearSelection()
                            setShapeSelection(shapeSelection !== ShapeSelection.Joints ? ShapeSelection.Joints : ShapeSelection.None)
                        }}
                    >
                        <span><FaHandPointUp/> Selection Mode </span>
                    </Button>
                    <Button
                        color={shapeSelection === ShapeSelection.Intervals ? "warning" : "secondary"}
                        disabled={polygons && shapeSelection === ShapeSelection.None || selectedJoints.length === 0}
                        onClick={() => {
                            if (shapeSelection === ShapeSelection.Intervals) {
                                clearSelection()
                            }
                            setShapeSelection(shapeSelection === ShapeSelection.Intervals ? ShapeSelection.None : ShapeSelection.Intervals)
                        }}
                    >
                        <span><FaSlidersH/> Make length adjustments</span>
                    </Button>
                </ButtonGroup>
                <ButtonGroup size="sm" className="w-100 my-2">
                    <Button disabled={disableUnlessFaceCount(1, ShapeSelection.Intervals)}
                            onClick={adjustValue(true, true, true)}>
                        TC <FaArrowUp/>
                    </Button>
                    <Button disabled={disableUnlessFaceCount(1, ShapeSelection.Intervals)}
                            onClick={adjustValue(false, true, true)}>
                        TC <FaArrowDown/>
                    </Button>
                    <Button disabled={disableUnlessFaceCount(1, ShapeSelection.Intervals)}
                            onClick={adjustValue(true, false, true)}>
                        T<FaArrowUp/>
                    </Button>
                    <Button disabled={disableUnlessFaceCount(1, ShapeSelection.Intervals)}
                            onClick={adjustValue(false, false, true)}>
                        T <FaArrowDown/>
                    </Button>
                    <Button disabled={disableUnlessFaceCount(1, ShapeSelection.Intervals)}
                            onClick={adjustValue(true, true, false)}>
                        C <FaArrowUp/>
                    </Button>
                    <Button disabled={disableUnlessFaceCount(1, ShapeSelection.Intervals)}
                            onClick={adjustValue(false, true, false)}>
                        C <FaArrowDown/>
                    </Button>
                </ButtonGroup>
                <ButtonGroup size="sm" className="w-100 my-2">
                    <Button
                        disabled={selectedJoints.length === 0 || disabled() && shapeSelection !== ShapeSelection.None}
                        onClick={() => clearSelection()}
                    >
                        <FaTimesCircle/> Clear selection
                    </Button>
                    <Button
                        disabled={disabled()}
                        onClick={() => new TensegrityOptimizer(tensegrity)
                            .replaceCrosses(tensegrity.numericFeature(WorldFeature.IntervalCountdown))
                        }>
                        <FaMagic/><span> Optimize</span>
                    </Button>
                </ButtonGroup>
            </Grouping>
            <Grouping>
                <h6 className="w-100 text-center"><FaTools/> Adjustments</h6>
                <FeaturePanel feature={worldFeatures[WorldFeature.ShapingPretenstFactor]} disabled={disabled()}/>
                <FeaturePanel feature={worldFeatures[WorldFeature.ShapingDrag]} disabled={disabled()}/>
                <ButtonGroup size="sm" className="w-100 my-2">
                    <Button
                        disabled={disabled()}
                        color={pushAndPull ? "secondary" : "success"}
                        onClick={() => setPushAndPull(false)}
                    ><FaCheck/>: T or C</Button>
                    <Button
                        disabled={disabled()}
                        color={pushAndPull ? "success" : "secondary"}
                        onClick={() => setPushAndPull(true)}
                    ><FaDragon/>: T=C</Button>
                </ButtonGroup>
            </Grouping>
            <Grouping>
                <h6 className="w-100 text-center"><FaList/> Interval Lengths</h6>
                <ButtonGroup className="my-2 w-100">{
                    ADJUSTABLE_INTERVAL_ROLES
                        .map((intervalRole, index) => (
                            <Button size="sm" key={`IntervalRole[${index}]`}
                                    onClick={() => setCurrentRole(intervalRole)}
                                    color={currentRole === intervalRole ? "success" : "secondary"}
                            >
                                {intervalRoleName(intervalRole)}
                            </Button>
                        ))
                }</ButtonGroup>
                <RolePanel tensegrity={tensegrity} intervalRole={currentRole} disabled={disabled()}/>
            </Grouping>
        </div>
    )
}

function RolePanel({tensegrity, intervalRole, disabled}: {
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

    function setDefaultLength(): void {
        console.warn("Set default length needs fix")
        // intervals().forEach(interval => tensegrity.changeIntervalRole(interval, interval.intervalRole, percentOrHundred(), 100))
    }

    const adjustValue = (up: boolean) => () => {
        function adjustment(): number {
            const factor = 1.03
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
                <Button disabled={disabled} onClick={adjustValue(true)}><FaPlusSquare/></Button>
                <Button disabled={disabled} onClick={adjustValue(false)}><FaMinusSquare/></Button>
                <Button disabled={disabled} color="info" onClick={setDefaultLength}><FaUndoAlt/></Button>
            </ButtonGroup>
        </div>
    )
}
