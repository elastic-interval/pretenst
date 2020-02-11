/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */


import { FabricFeature } from "eig"
import * as React from "react"
import { useEffect, useRef, useState } from "react"
import { FaSlidersH } from "react-icons/all"
import { Canvas } from "react-three-fiber"
import { BehaviorSubject } from "rxjs"
import { BufferGeometry, Float32BufferAttribute, Geometry, Vector3 } from "three"

import { FloatFeature } from "../fabric/fabric-features"
import { TensegrityFabric } from "../fabric/tensegrity-fabric"
import { IInterval } from "../fabric/tensegrity-types"
import { IStoredState } from "../storage/stored-state"

import { Grouping } from "./control-tabs"
import { FeaturePanel } from "./feature-panel"
import { LINE_VERTEX_COLORS, SCALE_LINE } from "./materials"

const SCALE_WIDTH = 0.7
const NEEDLE_WIDTH = 1.4
const SCALE_MAX = 3.5

const FEATURES = [
    FabricFeature.MaxStrain,
    FabricFeature.MaxStiffness,
    FabricFeature.VisualStrain,
    FabricFeature.SlackThreshold,
]

function scaleGeometry(middleTick: boolean): Geometry {
    const geometry = new Geometry()
    const v = (x: number, y: number) => new Vector3(x, y, 0)
    geometry.vertices = [
        v(0, -SCALE_MAX), v(0, SCALE_MAX),
        v(-SCALE_WIDTH, SCALE_MAX), v(SCALE_WIDTH, SCALE_MAX),
        v(-SCALE_WIDTH, -SCALE_MAX), v(SCALE_WIDTH, -SCALE_MAX),
    ]
    if (middleTick) {
        geometry.vertices.push(v(-SCALE_WIDTH, 0), v(SCALE_WIDTH, 0))
    }
    return geometry
}

function needleGeometry(
    intervals: IInterval[], lineColors: Float32Array,
    values: Float32Array, midValue: number, maxValue: number,
): BufferGeometry {
    const position = new Float32Array(values.length * 2 * 3)
    let offset = 0
    intervals.forEach(interval => {
        const value = values[interval.index]
        const unboundedHeight = (value - midValue) / (maxValue - midValue)
        const height = unboundedHeight < -1 ? -1 : unboundedHeight > 1 ? 1 : unboundedHeight
        position[offset++] = -SCALE_WIDTH * NEEDLE_WIDTH
        position[offset++] = height * SCALE_MAX
        position[offset++] = 0
        position[offset++] = SCALE_WIDTH * NEEDLE_WIDTH
        position[offset++] = height * SCALE_MAX
        position[offset++] = 0
    })
    const geometry = new BufferGeometry()
    geometry.addAttribute("position", new Float32BufferAttribute(position, 3))
    geometry.addAttribute("color", new Float32BufferAttribute(lineColors, 3))
    return geometry
}

export function StrainTab({floatFeatures, fabric, storedState$}: {
    floatFeatures: Record<FabricFeature, FloatFeature>,
    fabric: TensegrityFabric,
    storedState$: BehaviorSubject<IStoredState>,
}): JSX.Element {
    const camera = useRef()

    function ScaleView(): JSX.Element {
        const [age, updateAge] = useState(0)
        const [maxStrain, updateMaxStrain] = useState(storedState$.getValue().featureValues[FabricFeature.MaxStrain].numeric)
        const [maxStiffness, updateMaxStiffness] = useState(storedState$.getValue().featureValues[FabricFeature.MaxStiffness].numeric)

        useEffect(() => {
            const sub = storedState$.subscribe(storedState => {
                updateMaxStrain(storedState.featureValues[FabricFeature.MaxStrain].numeric)
                updateMaxStiffness(storedState.featureValues[FabricFeature.MaxStiffness].numeric)
            })
            return () => sub.unsubscribe()
        }, [fabric])

        useEffect(() => {
            const timer = setInterval(() => {
                const fabricAge = fabric.instance.fabric.age
                if (age < fabricAge) {
                    updateAge(fabricAge) // to trigger repaint. better way?
                }
            }, 1000)
            return () => clearTimeout(timer)
        }, [])

        const instance = fabric.instance

        function Scale({position, intervals, floats, mid, max, middleTick}: {
            position: number,
            intervals: IInterval[],
            floats: Float32Array,
            mid: number,
            max: number,
            middleTick: boolean,
        }): JSX.Element {
            return (
                <group position={new Vector3(position, -0.15, 0)}>
                    <lineSegments
                        geometry={needleGeometry(intervals, instance.floatView.lineColors, floats, mid, max)}
                        material={LINE_VERTEX_COLORS}/>
                    <lineSegments geometry={scaleGeometry(middleTick)} material={SCALE_LINE}/>
                </group>
            )
        }

        return (
            <Canvas>
                <orthographicCamera position={new Vector3(0, 0, -1)} ref={camera}/>
                <scene>
                    <Scale
                        position={-1.5}
                        intervals={fabric.intervals}
                        floats={instance.floatView.strains}
                        mid={0}
                        max={maxStrain}
                        middleTick={true}
                    />
                    <Scale
                        position={1.5}
                        intervals={fabric.intervals}
                        floats={instance.floatView.stiffnesses}
                        mid={0}
                        max={maxStiffness}
                        middleTick={false}
                    />
                </scene>
            </Canvas>
        )
    }

    return <>
        <Grouping height="50%">
            <div style={{
                position: "absolute",
                left: "6em",
            }}>
                Strain
            </div>
            <div style={{
                position: "absolute",
                right: "5em",
            }}>
                Stiffness
            </div>
            <ScaleView/>
        </Grouping>
        <Grouping>
            <h6 className="w-100 text-center"><FaSlidersH/> Adjustments</h6>
            {FEATURES.map(feature => (
                <FeaturePanel
                    key={`FabricFeature[${feature}]`}
                    feature={floatFeatures[feature]}
                    disabled={false}
                />))}
        </Grouping>
    </>
}

