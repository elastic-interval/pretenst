/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import * as React from "react"
import { useEffect, useState } from "react"
import {
    FaArrowDown,
    FaArrowUp,
    FaBiohazard,
    FaCheck,
    FaCircle,
    FaCompass,
    FaExpandArrowsAlt,
    FaFutbol,
    FaLink,
    FaMagic,
    FaTimesCircle,
    FaVolleyballBall,
} from "react-icons/all"
import { Button, ButtonGroup } from "reactstrap"
import { BehaviorSubject } from "rxjs"

import { FabricFeature, fabricFeatureIntervalRole, Stage } from "../fabric/fabric-engine"
import { FloatFeature } from "../fabric/fabric-features"
import { TensegrityFabric } from "../fabric/tensegrity-fabric"
import { IFace, IInterval } from "../fabric/tensegrity-types"
import { IStoredState } from "../storage/stored-state"

import { Grouping } from "./control-tabs"
import { FeaturePanel } from "./feature-panel"
import { LifeStagePanel } from "./life-stage-panel"

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
        fabric.instance.engine.setPushAndPull(pushAndPull)
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
            fabric.instance.engine.multiplyRestLength(interval.index, adjustment(), 100)
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

    return (
        <div>
            <Grouping>
                <LifeStagePanel
                    fabric={fabric}
                    beforeSlack={true}
                    disabled={ellipsoids || shapeSelection !== ShapeSelection.None}
                />
            </Grouping>
            <Grouping>
                <ButtonGroup size="sm" className="w-100 my-2">
                    <Button
                        disabled={selectedFaces.length === 0 || disabled() && shapeSelection !== ShapeSelection.None}
                        onClick={() => clearSelectedFaces()}
                    >
                        <FaTimesCircle/>&nbsp;Clear selection&nbsp;&nbsp;{selectedFaces.map(({index}) => <FaCircle
                        key={`Dot${index}`}/>)}
                    </Button>
                    <Button
                        color={shapeSelection === ShapeSelection.Intervals ? "warning" : "secondary"}
                        disabled={ellipsoids && shapeSelection === ShapeSelection.None}
                        onClick={() => setShapeSelection(ShapeSelection.Intervals)}
                    >
                        <span><FaArrowDown/> Adjust <FaArrowUp/></span>
                    </Button>
                </ButtonGroup>
                <ButtonGroup size="sm" className="w-100 my-2">
                    <Button disabled={disableUnlessFaceCount(1, ShapeSelection.Intervals)}
                            onClick={adjustValue(true, true, true)}>
                        <FaArrowUp/><FaFutbol/>
                    </Button>
                    <Button disabled={disableUnlessFaceCount(1, ShapeSelection.Intervals)} onClick={adjustValue(false, true, true)}>
                        <FaArrowDown/><FaFutbol/>
                    </Button>
                    <Button disabled={disableUnlessFaceCount(1, ShapeSelection.Intervals)} onClick={adjustValue(true, false, true)}>
                        <FaArrowUp/><FaVolleyballBall/>
                    </Button>
                    <Button disabled={disableUnlessFaceCount(1, ShapeSelection.Intervals)} onClick={adjustValue(false, false, true)}>
                        <FaArrowDown/><FaVolleyballBall/>
                    </Button>
                    <Button disabled={disableUnlessFaceCount(1, ShapeSelection.Intervals)} onClick={adjustValue(true, true, false)}>
                        <FaArrowUp/><FaExpandArrowsAlt/>
                    </Button>
                    <Button disabled={disableUnlessFaceCount(1, ShapeSelection.Intervals)} onClick={adjustValue(false, true, false)}>
                        <FaArrowDown/><FaExpandArrowsAlt/>
                    </Button>
                </ButtonGroup>
                <ButtonGroup size="sm" className="w-100 my-2">
                    <Button
                        disabled={disableUnlessFaceCount(1, ShapeSelection.Faces)}
                        onClick={() => {
                            fabric.builder.uprightAtOrigin(selectedFaces[0])
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
                        onClick={() => fabric.builder.optimize()}>
                        <FaMagic/><span> Bows</span>
                    </Button>
                </ButtonGroup>
            </Grouping>
            <Grouping>
                <FeaturePanel feature={floatFeatures[FabricFeature.ShapingPretenstFactor]} disabled={disabled()}/>
                <FeaturePanel feature={floatFeatures[FabricFeature.ShapingDrag]} disabled={disabled()}/>
                <FeaturePanel feature={floatFeatures[FabricFeature.ShapingStiffnessFactor]} disabled={disabled()}/>
                <ButtonGroup size="sm" className="w-100 my-2">
                    <Button
                        disabled={disabled()}
                        color={pushAndPull ? "secondary" : "success"}
                        onClick={() => setPushAndPull(false)}
                    ><FaCheck/>Push or Pull</Button>
                    <Button
                        disabled={disabled()}
                        color={pushAndPull ? "success" : "secondary"}
                        onClick={() => setPushAndPull(true)}
                    ><FaBiohazard/> Push and Pull</Button>
                </ButtonGroup>
            </Grouping>
            <Grouping>
                <FeaturePanel key={lengthFeature.title} feature={lengthFeature} disabled={disabled()}/>
                <ButtonGroup className="my-2">{
                    Object.keys(floatFeatures)
                        .map(k => floatFeatures[k] as FloatFeature)
                        .filter(feature => fabricFeatureIntervalRole(feature.fabricFeature) !== undefined)
                        .map(feature => (
                            <Button size="sm" key={feature.title}
                                    onClick={() => setLengthFeature(feature)}
                                    color={lengthFeature.fabricFeature === feature.fabricFeature ? "success" : "secondary"}
                            >
                                {feature.title}
                            </Button>
                        ))
                }</ButtonGroup>
            </Grouping>
        </div>
    )
}
