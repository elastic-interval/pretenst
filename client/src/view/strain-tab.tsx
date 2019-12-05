/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */


import * as React from "react"
import { useEffect, useRef, useState } from "react"
import { Canvas } from "react-three-fiber"
import { BufferGeometry, Float32BufferAttribute, Geometry, Vector3 } from "three"

import { FabricFeature } from "../fabric/fabric-engine"
import { FloatFeature } from "../fabric/fabric-features"
import { TensegrityFabric } from "../fabric/tensegrity-fabric"
import { IInterval } from "../fabric/tensegrity-types"

import { Grouping } from "./control-tabs"
import { FeaturePanel } from "./feature-panel"
import { LINE_VERTEX_COLORS, SCALE_LINE } from "./materials"

const SCALE_WIDTH = 0.3
const NEEDLE_WIDTH = 2
const SCALE_MAX = 3.5

const FEATURES = [
    FabricFeature.MaxStiffness,
    FabricFeature.MaxStrain,
]

function scaleGeometry(): Geometry {
    const geometry = new Geometry()
    const v = (x: number, y: number) => new Vector3(x, y, 0)
    geometry.vertices = [
        v(0, -SCALE_MAX), v(0, SCALE_MAX),
        v(-SCALE_WIDTH, SCALE_MAX), v(SCALE_WIDTH, SCALE_MAX),
        v(-SCALE_WIDTH, 0), v(SCALE_WIDTH, 0),
        v(-SCALE_WIDTH, -SCALE_MAX), v(SCALE_WIDTH, -SCALE_MAX),
    ]
    return geometry
}

const SCALE_GEOMETRY = scaleGeometry()

function needleGeometry(
    intervals: IInterval[], lineColors: Float32Array,
    values: Float32Array, midValue: number, maxValue: number,
): BufferGeometry {
    const position = new Float32Array(values.length * 2 * 3)
    let offset = 0
    intervals.forEach(interval => {
        const value = values[interval.index]
        const height = (value - midValue) / (maxValue - midValue) * SCALE_MAX
        position[offset++] = -SCALE_WIDTH * NEEDLE_WIDTH
        position[offset++] = height
        position[offset++] = 0
        position[offset++] = SCALE_WIDTH * NEEDLE_WIDTH
        position[offset++] = height
        position[offset++] = 0
    })
    const geometry = new BufferGeometry()
    geometry.addAttribute("position", new Float32BufferAttribute(position, 3))
    geometry.addAttribute("color", new Float32BufferAttribute(lineColors, 3))
    return geometry
}

export function StrainTab({floatFeatures, fabric}: {
    floatFeatures: Record<FabricFeature, FloatFeature>,
    fabric: TensegrityFabric,
}): JSX.Element {
    const camera = useRef()

    function ScaleView(): JSX.Element {
        const [age, updateAge] = useState(0)
        const [maxStrain, updateMaxStrain] = useState(fabric.featureValues[FabricFeature.MaxStrain].numeric)
        const [maxStiffness, updateMaxStiffness] = useState(fabric.featureValues[FabricFeature.MaxStiffness].numeric)

        useEffect(() => {
            const sub = fabric.featureValues$.subscribe(featureValues => {
                updateMaxStrain(featureValues[FabricFeature.MaxStrain].numeric)
                updateMaxStiffness(featureValues[FabricFeature.MaxStiffness].numeric)
            })
            return () => sub.unsubscribe()
        }, [fabric])

        useEffect(() => {
            const timer = setInterval(() => {
                const fabricAge = fabric.instance.engine.getAge()
                if (age < fabricAge) {
                    updateAge(fabricAge) // to trigger repaint. better way?
                }
            }, 1000)
            return () => clearTimeout(timer)
        }, [])

        const instance = fabric.instance

        function Scale({position, intervals, floats, mid, max}: {
            position: number,
            intervals: IInterval[],
            floats: Float32Array,
            mid: number
            max: number,
        }): JSX.Element {
            return (
                <group position={new Vector3(position)}>
                    <lineSegments
                        geometry={needleGeometry(intervals, instance.lineColors, floats, mid, max)}
                        material={LINE_VERTEX_COLORS}/>
                    <lineSegments geometry={SCALE_GEOMETRY} material={SCALE_LINE}/>
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
                        floats={instance.strains}
                        mid={0}
                        max={maxStrain}
                    />
                    <Scale
                        position={1.5}
                        intervals={fabric.intervals}
                        floats={instance.stiffnesses}
                        mid={0}
                        max={maxStiffness}
                    />
                </scene>
            </Canvas>
        )
    }

    return <>
        <Grouping height="50%">
            <ScaleView/>
        </Grouping>
        <Grouping>
            {FEATURES.map(feature => <FeaturePanel key={FabricFeature[feature]} feature={floatFeatures[feature]}
                                                   disabled={false}/>)}
        </Grouping>
    </>
}

