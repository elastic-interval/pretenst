/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import * as React from "react"
import { useEffect, useState } from "react"
import {
    FaArrowDown,
    FaArrowUp,
    FaCircle,
    FaCompass,
    FaExpandArrowsAlt,
    FaFutbol,
    FaHandPointUp,
    FaLink,
    FaMagic,
    FaSlidersH,
    FaTimesCircle,
    FaVolleyballBall,
} from "react-icons/all"
import { Button, ButtonGroup } from "reactstrap"
import { BehaviorSubject } from "rxjs"

import { FabricFeature, fabricFeatureIntervalRole } from "../fabric/fabric-engine"
import { FloatFeature } from "../fabric/fabric-features"
import { TensegrityFabric } from "../fabric/tensegrity-fabric"
import { IFace } from "../fabric/tensegrity-types"
import { IStoredState } from "../storage/stored-state"

import { FeaturePanel } from "./feature-panel"

export function ShapePanel({
                               floatFeatures, fabric, setFabric, selectionMode, setSelectionMode,
                               selectedFaces, clearSelectedFaces, storedState$,
                           }: {
    floatFeatures: Record<FabricFeature, FloatFeature>,
    fabric: TensegrityFabric,
    setFabric: (fabric: TensegrityFabric) => void,
    selectionMode: boolean,
    setSelectionMode: (selectionMode: boolean) => void,
    selectedFaces: IFace[],
    clearSelectedFaces: () => void,
    storedState$: BehaviorSubject<IStoredState>,
}): JSX.Element {

    const [ellipsoids, updateEllipsoids] = useState(storedState$.getValue().ellipsoids)

    useEffect(() => {
        const subscriptions = [
            storedState$.subscribe(newState => updateEllipsoids(newState.ellipsoids)),
        ]
        return () => subscriptions.forEach(sub => sub.unsubscribe())
    }, [])

    const adjustValue = (up: boolean, pushes: boolean, pulls: boolean) => () => {
        function adjustment(): number {
            const factor = 1.03
            return up ? factor : (1 / factor)
        }

        fabric.forEachSelected(interval => {
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

    function disableUnlessFaceCount(faceCount: number): boolean {
        return selectedFaces.length < faceCount || ellipsoids
    }

    return (
        <div className="m-4">
            <div className="text-center">
                <h2><FaHandPointUp/> Editing <FaHandPointUp/></h2>
            </div>
            <ButtonGroup className="w-100 my-2">
                <Button disabled={selectedFaces.length === 0} onClick={() => clearSelectedFaces()}>
                    <span>
                        <FaTimesCircle/>
                        &nbsp;Clear selection&nbsp;&nbsp;&nbsp;
                        {selectedFaces.map(({index}) => <FaCircle key={`Dot${index}`}/>)}
                    </span>
                </Button>
            </ButtonGroup>
            <ButtonGroup className="w-100 my-2">
                <Button disabled={disableUnlessFaceCount(1)} onClick={adjustValue(true, true, true)}>
                    <FaArrowUp/><FaFutbol/>
                </Button>
                <Button disabled={disableUnlessFaceCount(1)} onClick={adjustValue(true, false, true)}>
                    <FaArrowUp/><FaVolleyballBall/>
                </Button>
                <Button disabled={disableUnlessFaceCount(1)} onClick={adjustValue(true, true, false)}>
                    <FaArrowUp/><FaExpandArrowsAlt/>
                </Button>
            </ButtonGroup>
            <ButtonGroup className="w-100 my-2">
                <Button disabled={disableUnlessFaceCount(1)} onClick={adjustValue(false, true, true)}>
                    <FaArrowDown/><FaFutbol/>
                </Button>
                <Button disabled={disableUnlessFaceCount(1)} onClick={adjustValue(false, false, true)}>
                    <FaArrowDown/><FaVolleyballBall/>
                </Button>
                <Button disabled={disableUnlessFaceCount(1)} onClick={adjustValue(false, true, false)}>
                    <FaArrowDown/><FaExpandArrowsAlt/>
                </Button>
            </ButtonGroup>
            <ButtonGroup className="w-100 my-2">
                <Button disabled={disableUnlessFaceCount(1)} onClick={() => {
                    fabric.builder.uprightAtOrigin(selectedFaces[0])
                    clearSelectedFaces()
                }}>
                    <FaCompass/><span> Upright</span>
                </Button>
                <Button disabled={disableUnlessFaceCount(2)} onClick={connect}>
                    <FaLink/><span> Connect</span>
                </Button>
                <Button onClick={() => fabric.builder.optimize()}>
                    <FaMagic/><span> Bows</span>
                </Button>
            </ButtonGroup>
            <div className="my-4">
                <div className="text-center">
                    <h2><FaSlidersH/> Lengths <FaSlidersH/></h2>
                </div>
                <div className="my-2" style={{
                    borderStyle: "solid",
                    borderColor: selectionMode || ellipsoids ? "gray" : "white",
                    borderWidth: "0.1em",
                    borderRadius: "0.7em",
                    padding: "0.5em",
                }}>
                    {Object.keys(floatFeatures)
                        .map(k => floatFeatures[k])
                        .filter(feature => fabricFeatureIntervalRole(feature.fabricFeature) !== undefined)
                        .map(feature => (
                            <FeaturePanel key={feature.title} feature={feature} disabled={selectionMode || ellipsoids}/>
                        ))}
                </div>
            </div>
        </div>
    )
}

