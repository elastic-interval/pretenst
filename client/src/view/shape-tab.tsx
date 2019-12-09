/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import * as React from "react"
import { useEffect, useState } from "react"
import {
    FaArrowDown,
    FaArrowUp, FaBiohazard, FaCheck,
    FaCircle,
    FaCompass,
    FaExpandArrowsAlt,
    FaFutbol,
    FaHandPointUp,
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

export function ShapeTab(
    {
        floatFeatures, fabric, selectedIntervals,
        setFabric, selectionMode, setSelectionMode,
        selectedFaces, clearSelectedFaces, storedState$,
    }: {
        floatFeatures: Record<FabricFeature, FloatFeature>,
        fabric: TensegrityFabric,
        setFabric: (fabric: TensegrityFabric) => void,
        selectedIntervals: IInterval[],
        selectionMode: boolean,
        setSelectionMode: (selectionMode: boolean) => void,
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
        setSelectionMode(false)
        setFabric(fabric)
    }

    function shapeDisabled(): boolean {
        return ellipsoids || life.stage !== Stage.Shaping
    }

    function disableUnlessFaceCount(faceCount: number): boolean {
        if (shapeDisabled()) {
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
                    disabled={ellipsoids || selectionMode}
                />
            </Grouping>
            <Grouping>
                <ButtonGroup size="sm" className="w-100 my-2">
                    <Button
                        color={selectionMode ? "warning" : "secondary"}
                        disabled={shapeDisabled() && !selectionMode}
                        onClick={() => setSelectionMode(!selectionMode)}
                    >
                        <span><FaHandPointUp/></span> Selection
                    </Button>
                    <Button
                        disabled={selectedFaces.length === 0 || shapeDisabled() && !selectionMode}
                        onClick={() => clearSelectedFaces()}
                    >
                        <FaTimesCircle/>&nbsp;Clear selection&nbsp;&nbsp;{selectedFaces.map(({index}) => <FaCircle
                        key={`Dot${index}`}/>)}
                    </Button>
                </ButtonGroup>
                <ButtonGroup size="sm" className="w-100 my-2">
                    <Button disabled={disableUnlessFaceCount(1)} onClick={adjustValue(true, true, true)}>
                        <FaArrowUp/><FaFutbol/>
                    </Button>
                    <Button disabled={disableUnlessFaceCount(1)} onClick={adjustValue(false, true, true)}>
                        <FaArrowDown/><FaFutbol/>
                    </Button>
                    <Button disabled={disableUnlessFaceCount(1)} onClick={adjustValue(true, false, true)}>
                        <FaArrowUp/><FaVolleyballBall/>
                    </Button>
                    <Button disabled={disableUnlessFaceCount(1)} onClick={adjustValue(false, false, true)}>
                        <FaArrowDown/><FaVolleyballBall/>
                    </Button>
                    <Button disabled={disableUnlessFaceCount(1)} onClick={adjustValue(true, true, false)}>
                        <FaArrowUp/><FaExpandArrowsAlt/>
                    </Button>
                    <Button disabled={disableUnlessFaceCount(1)} onClick={adjustValue(false, true, false)}>
                        <FaArrowDown/><FaExpandArrowsAlt/>
                    </Button>
                </ButtonGroup>
                <ButtonGroup size="sm" className="w-100 my-2">
                    <Button
                        disabled={disableUnlessFaceCount(1)}
                        onClick={() => {
                            fabric.builder.uprightAtOrigin(selectedFaces[0])
                            clearSelectedFaces()
                        }}>
                        <FaCompass/><span> Upright</span>
                    </Button>
                    <Button
                        disabled={disableUnlessFaceCount(2)}
                        onClick={connect}>
                        <FaLink/><span> Connect</span>
                    </Button>
                    <Button
                        disabled={shapeDisabled()}
                        onClick={() => fabric.builder.optimize()}>
                        <FaMagic/><span> Bows</span>
                    </Button>
                </ButtonGroup>
            </Grouping>
            <Grouping>
                <FeaturePanel feature={floatFeatures[FabricFeature.ShapingPretenstFactor]} disabled={shapeDisabled()}/>
                <FeaturePanel feature={floatFeatures[FabricFeature.ShapingDrag]} disabled={shapeDisabled()}/>
                <FeaturePanel feature={floatFeatures[FabricFeature.ShapingStiffnessFactor]} disabled={shapeDisabled()}/>
                <ButtonGroup size="sm" className="w-100 my-2">
                    <Button
                        color={pushAndPull ? "secondary" : "success"}
                        onClick={() => setPushAndPull(false)}
                    ><FaCheck/>Push or Pull</Button>
                    <Button
                        color={pushAndPull ? "success" : "secondary"}
                        onClick={() => setPushAndPull(true)}
                    ><FaBiohazard/> Push and Pull</Button>
                </ButtonGroup>
            </Grouping>
            <Grouping>
                <FeaturePanel key={lengthFeature.title} feature={lengthFeature} disabled={shapeDisabled()}/>
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
