/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { FabricFeature, Stage } from "eig"
import * as React from "react"
import { useEffect, useState } from "react"
import {
    FaArrowAltCircleRight,
    FaArrowDown,
    FaArrowUp,
    FaCheck,
    FaCompass,
    FaDragon,
    FaHandPointUp,
    FaLink,
    FaList,
    FaMagic,
    FaTimesCircle,
    FaTools,
} from "react-icons/all"
import { Button, ButtonGroup } from "reactstrap"
import { BehaviorSubject } from "rxjs"

import {
    INTERVAL_ROLES,
    intervalRoleName,
} from "../fabric/fabric-engine"
import { FloatFeature } from "../fabric/fabric-features"
import { TensegrityFabric } from "../fabric/tensegrity-fabric"
import { IFace, IInterval } from "../fabric/tensegrity-types"
import { IStoredState, roleLengthFeature } from "../storage/stored-state"

import { Grouping } from "./control-tabs"
import { FeaturePanel } from "./feature-panel"
import { LifeStageButton, StageTransition } from "./life-stage-button"

export enum ShapeSelection {
    None,
    Faces,
    Intervals,
}

export function ShapeTab(
    {
        floatFeatures, fabric, selectedIntervals,
        setFabric, shapeSelection, setShapeSelection,
        selectedFaces, clearSelectedFaces, storedState$,
    }: {
        floatFeatures: Record<FabricFeature, FloatFeature>,
        fabric: TensegrityFabric,
        setFabric: (fabric: TensegrityFabric) => void,
        selectedIntervals: IInterval[],
        shapeSelection: ShapeSelection,
        setShapeSelection: (shapeSelection: ShapeSelection) => void,
        selectedFaces: IFace[],
        clearSelectedFaces: () => void,
        storedState$: BehaviorSubject<IStoredState>,
    }): JSX.Element {

    const [pushAndPull, setPushAndPull] = useState(false)
    useEffect(() => {
        fabric.instance.world.set_push_and_pull(pushAndPull)
    }, [pushAndPull])

    const [ellipsoids, updateEllipsoids] = useState(storedState$.getValue().ellipsoids)
    useEffect(() => {
        const subscriptions = [
            storedState$.subscribe(newState => updateEllipsoids(newState.ellipsoids)),
        ]
        return () => subscriptions.forEach(sub => sub.unsubscribe())
    }, [])

    const [life, updateLife] = useState(fabric.life)
    useEffect(() => {
        const sub = fabric.life$.subscribe(updateLife)
        return () => sub.unsubscribe()
    }, [fabric])

    const [lengthFeature, setLengthFeature] = useState(floatFeatures[FabricFeature.NexusPushLength])

    const adjustValue = (up: boolean, pushes: boolean, pulls: boolean) => () => {
        function adjustment(): number {
            const factor = 1.03
            return up ? factor : (1 / factor)
        }

        if (!selectedIntervals) {
            return
        }
        selectedIntervals.forEach(interval => {
            if (interval.isPush && !pushes || !interval.isPush && !pulls) {
                return
            }
            fabric.changeIntervalScale(interval, adjustment())
        })
    }

    function connect(): void {
        fabric.connectFaces(selectedFaces)
        clearSelectedFaces()
        setShapeSelection(ShapeSelection.None)
        setFabric(fabric)
    }

    function disabled(): boolean {
        return ellipsoids || life.stage !== Stage.Shaping
    }

    function disableUnlessFaceCount(faceCount: number, mode: ShapeSelection): boolean {
        if (disabled() || shapeSelection !== mode) {
            return true
        }
        return selectedFaces.length < faceCount || ellipsoids
    }

    function disabledLifeStage(): boolean {
        return ellipsoids || shapeSelection !== ShapeSelection.None
    }

    return (
        <div>
            <Grouping>
                <h6 className="w-100 text-center"><FaArrowAltCircleRight/> Phase</h6>
                <LifeStageButton
                    fabric={fabric}
                    stageTransition={StageTransition.CaptureLengthsToSlack}
                    disabled={disabledLifeStage()}
                />
                <LifeStageButton
                    fabric={fabric}
                    stageTransition={StageTransition.CurrentLengthsToSlack}
                    disabled={disabledLifeStage()}
                />
                <LifeStageButton
                    fabric={fabric}
                    stageTransition={StageTransition.SlackToShaping}
                    disabled={disabledLifeStage()}
                />
            </Grouping>
            <Grouping>
                <h6 className="w-100 text-center"><FaHandPointUp/> Manual</h6>
                <ButtonGroup size="sm" className="w-100 my-2">
                    <Button
                        color={shapeSelection === ShapeSelection.Intervals ? "warning" : "secondary"}
                        disabled={ellipsoids && shapeSelection === ShapeSelection.None || selectedFaces.length === 0}
                        onClick={() => {
                            const selection = shapeSelection === ShapeSelection.Intervals ? ShapeSelection.None : ShapeSelection.Intervals
                            setShapeSelection(selection)
                        }}
                    >
                        <span><FaArrowDown/> Adjust <FaArrowUp/></span>
                    </Button>
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
                        disabled={selectedFaces.length === 0 || disabled() && shapeSelection !== ShapeSelection.None}
                        onClick={() => clearSelectedFaces()}
                    >
                        <FaTimesCircle/> Clear selection
                    </Button>
                    <Button
                        disabled={disableUnlessFaceCount(1, ShapeSelection.Faces)}
                        onClick={() => {
                            fabric.builder.uprightAtOrigin(selectedFaces[0])
                            fabric.instance.refreshFloatView()
                            clearSelectedFaces()
                        }}>
                        <FaCompass/><span> Upright</span>
                    </Button>
                    <Button
                        disabled={disableUnlessFaceCount(2, ShapeSelection.Faces)}
                        onClick={connect}>
                        <FaLink/><span> Connect</span>
                    </Button>
                    <Button
                        disabled={disabled()}
                        onClick={() => fabric.builder.replaceCrossedNexusCrosses()}>
                        <FaMagic/><span> Bows</span>
                    </Button>
                </ButtonGroup>
            </Grouping>
            <Grouping>
                <h6 className="w-100 text-center"><FaTools/> Adjustments</h6>
                <FeaturePanel feature={floatFeatures[FabricFeature.ShapingPretenstFactor]} disabled={disabled()}/>
                <FeaturePanel feature={floatFeatures[FabricFeature.ShapingDrag]} disabled={disabled()}/>
                <FeaturePanel feature={floatFeatures[FabricFeature.ShapingStiffnessFactor]} disabled={disabled()}/>
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
                <h6 className="w-100 text-center"><FaList/> Default Lengths</h6>
                <FeaturePanel key={lengthFeature.title} feature={lengthFeature} disabled={disabled()}/>
                <ButtonGroup className="my-2">{
                    INTERVAL_ROLES
                        .map(intervalRole => ({
                            intervalRole,
                            feature: floatFeatures[roleLengthFeature(intervalRole)],
                        }))
                        .map(({intervalRole, feature}) => (
                            <Button size="sm" key={`IntervalRole[${intervalRole}]`}
                                    onClick={() => setLengthFeature(feature)}
                                    color={lengthFeature.fabricFeature === feature.fabricFeature ? "success" : "secondary"}
                            >
                                {intervalRoleName(intervalRole)}
                            </Button>
                        ))
                }</ButtonGroup>
            </Grouping>
        </div>
    )
}
