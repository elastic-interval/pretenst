/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import * as React from "react"
import { useRef, useState } from "react"
import { extend, ReactThreeFiber, useRender, useThree, useUpdate } from "react-three-fiber"
import { Euler, Object3D, Vector3 } from "three"
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls"

import {
    AdjacentIntervals,
    bySelectedFace,
    IInterval,
    ISelectedFace,
    ISelection,
    nextAdjacent,
} from "../fabric/tensegrity-brick-types"
import { SPHERE, TensegrityFabric } from "../fabric/tensegrity-fabric"

import { ATTENUATED, BAR, CABLE, FACE, FACE_SPHERE, LINE } from "./materials"
import { SurfaceComponent } from "./surface-component"

extend({OrbitControls})

declare global {
    namespace JSX {
        /* eslint-disable @typescript-eslint/interface-name-prefix */
        interface IntrinsicElements {
            orbitControls: ReactThreeFiber.Object3DNode<OrbitControls, typeof OrbitControls>
        }

        /* eslint-enable @typescript-eslint/interface-name-prefix */
    }
}

const stopPropagation = (event: React.MouseEvent<HTMLDivElement>) => event.stopPropagation()

const ITERATIONS_PER_FRAME = 24
const TOWARDS_TARGET = 0.01
const ALTITUDE = 4
const BAR_GIRTH = 0.7
const CABLE_GIRTH = 0.2

export function FabricView({fabric, selection, setSelection, autoRotate, fastMode, showFaces}: {
    fabric: TensegrityFabric,
    selection: ISelection,
    setSelection: (selection: ISelection) => void,
    autoRotate: boolean,
    fastMode: boolean,
    showFaces: boolean,
}): JSX.Element {

    const [age, setAge] = useState<number>(0)
    const {camera, raycaster} = useThree()

    const orbitControls = useUpdate<OrbitControls>(controls => {
        controls.minPolarAngle = -0.98 * Math.PI / 2
        controls.maxPolarAngle = 0.8 * Math.PI
        controls.maxDistance = 1000
        controls.minDistance = 3
        controls.enableKeys = false
        const midpoint = new Vector3(0, ALTITUDE, 0)
        orbitControls.current.target.set(midpoint.x, midpoint.y, midpoint.z)
        camera.position.set(midpoint.x, ALTITUDE, midpoint.z + ALTITUDE * 4)
        camera.lookAt(orbitControls.current.target)
        controls.update()
    }, [fabric])

    useRender(() => {
        const towardsTarget = new Vector3().subVectors(fabric.instance.midpoint, orbitControls.current.target).multiplyScalar(TOWARDS_TARGET)
        orbitControls.current.target.add(towardsTarget)
        orbitControls.current.update()
        orbitControls.current.autoRotate = autoRotate
        fabric.iterate(ITERATIONS_PER_FRAME)
        setAge(fabric.instance.engine.getAge())
    }, true, [fabric, selection, age])

    const tensegrityView = document.getElementById("tensegrity-view") as HTMLElement

    const selectFace = (selectedFace: ISelectedFace) => {
        if (fabric) {
            fabric.selectIntervals(bySelectedFace(selectedFace))
            setSelection({selectedFace})
        }
    }

    function SelectedFace(): JSX.Element {
        const selectedFace = selection.selectedFace
        if (!selectedFace) {
            return <group/>
        }
        return (
            <mesh
                geometry={SPHERE}
                position={fabric.instance.getFaceMidpoint(selectedFace.face.index)}
                material={FACE_SPHERE}
                onPointerDown={(event: React.MouseEvent<HTMLDivElement>) => {
                    selectFace(nextAdjacent(selectedFace))
                    event.stopPropagation()
                }}
                onPointerUp={stopPropagation}
            />
        )
    }

    function Faces(): JSX.Element {
        const meshRef = useRef<Object3D>()
        const onClick = () => {
            const mesh = meshRef.current
            if (!mesh) {
                return
            }
            const intersections = raycaster.intersectObjects([mesh], true)
            const faces = intersections.map(intersection => intersection.faceIndex).map(faceIndex => {
                if (faceIndex === undefined) {
                    return undefined
                }
                return fabric.faces[faceIndex]
            })
            fabric.clearSelection()
            const face = faces.reverse().pop()
            if (!face) {
                return
            }
            selectFace({face, adjacentIntervals: AdjacentIntervals.None})
        }
        return (
            <mesh
                ref={meshRef}
                onClick={onClick}
                geometry={fabric.facesGeometry}
                material={FACE}
            />
        )
    }

    function IntervalMesh({key, interval, attenuated}: {
        key: string,
        interval: IInterval,
        attenuated: boolean,
    }): JSX.Element {
        const {scale, rotation} = fabric.orientInterval(interval, interval.isBar ? BAR_GIRTH : CABLE_GIRTH)
        const material = attenuated ? ATTENUATED : interval.isBar ? BAR : CABLE
        return (
            <mesh
                key={key}
                geometry={SPHERE}
                position={fabric.instance.getIntervalMidpoint(interval.index)}
                rotation={new Euler().setFromQuaternion(rotation)}
                scale={scale}
                material={material}
                matrixWorldNeedsUpdate={true}
            />
        )
    }

    return (
        <group>
            <orbitControls ref={orbitControls} args={[camera, tensegrityView]}/>
            <scene>
                {fastMode ? (
                    <group>
                        <lineSegments key="lines" geometry={fabric.linesGeometry} material={LINE}/>
                        {!fabric.splitIntervals || selection.selectedStress ? undefined : (
                            fabric.splitIntervals.selected.map(interval => (
                                <IntervalMesh key={`I${interval.index}`} interval={interval} attenuated={false}/>
                            ))
                        )}
                    </group>
                ) : (
                    <group>
                        {fabric.splitIntervals ? ([
                            ...fabric.splitIntervals.unselected.map(interval => (
                                <IntervalMesh key={`I${interval.index}`} interval={interval} attenuated={true}/>
                            )),
                            ...fabric.splitIntervals.selected.map(interval => (
                                <IntervalMesh key={`I${interval.index}`} interval={interval} attenuated={false}/>
                            )),
                        ]) : (
                            fabric.intervals.map(interval => (
                                <IntervalMesh key={`I${interval.index}`} interval={interval} attenuated={false}/>
                            ))
                        )}
                    </group>
                )}
                {showFaces ? <Faces/> : undefined}
                <SelectedFace/>
                <SurfaceComponent/>
            </scene>
        </group>
    )
}
