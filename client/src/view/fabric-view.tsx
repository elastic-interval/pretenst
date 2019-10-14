/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import * as React from "react"
import { useRef, useState } from "react"
import { DomEvent, extend, ReactThreeFiber, useRender, useThree, useUpdate } from "react-three-fiber"
import { Euler, Object3D, Vector3 } from "three"
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls"

import { SLACK_THRESHOLD } from "../fabric/fabric-engine"
import {
    AdjacentIntervals,
    bySelectedFace,
    IInterval,
    ISelectedFace,
    nextAdjacent,
} from "../fabric/tensegrity-brick-types"
import { SPHERE, TensegrityFabric } from "../fabric/tensegrity-fabric"

import { ATTENUATED, BAR, CABLE, FACE, FACE_SPHERE, LINE, SLACK } from "./materials"
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
const BAR_GIRTH = 0.3
const CABLE_GIRTH = 0.1

export function FabricView({fabric, pretenst, selectedFace, setSelectedFace, autoRotate, fastMode, showFaces}: {
    fabric: TensegrityFabric,
    pretenst: number,
    selectedFace?: ISelectedFace,
    setSelectedFace: (selection?: ISelectedFace) => void,
    autoRotate: boolean,
    fastMode: boolean,
    showFaces: boolean,
}): JSX.Element {

    const [age, setAge] = useState<number>(0)
    const [downEvent, setDownEvent] = useState<DomEvent | undefined>()
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
        const towardsTarget = new Vector3().subVectors(fabric.instance.getMidpoint(), orbitControls.current.target).multiplyScalar(TOWARDS_TARGET)
        orbitControls.current.target.add(towardsTarget)
        orbitControls.current.update()
        orbitControls.current.autoRotate = autoRotate
        fabric.iterate(ITERATIONS_PER_FRAME)
        setAge(fabric.instance.engine.getAge())
    }, true, [fabric, selectedFace, age])

    const tensegrityView = document.getElementById("tensegrity-view") as HTMLElement

    const selectFace = (newSelectedFace: ISelectedFace) => {
        if (fabric) {
            fabric.selectIntervals(bySelectedFace(newSelectedFace))
            setSelectedFace(newSelectedFace)
        }
    }

    function SelectedFace(): JSX.Element {
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
        const onPointerDown = (event: DomEvent) => {
            setDownEvent(event)
        }
        const onPointerUp = (event: DomEvent) => {
            const mesh = meshRef.current
            if (!downEvent || !mesh) {
                return
            }
            const dx = downEvent.clientX - event.clientX
            const dy = downEvent.clientY - event.clientY
            const distanceSq = dx * dx + dy * dy
            if (distanceSq > 100) {
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
            setDownEvent(undefined)
            if (!face) {
                return
            }
            selectFace({face, adjacentIntervals: AdjacentIntervals.None})
        }
        return (
            <mesh
                ref={meshRef}
                onPointerDown={onPointerDown}
                onPointerUp={onPointerUp}
                geometry={fabric.facesGeometry}
                material={FACE}
            />
        )
    }

    function IntervalMesh({interval, attenuated, larger}: {
        interval: IInterval,
        attenuated: boolean,
        larger: boolean,
    }): JSX.Element {
        const elasticFactor = fabric.instance.engine.getElasticFactor(interval.index)
        const strain = fabric.instance.getIntervalStrain(interval.index) * (interval.isBar ? -1 : 1)
        const girth = Math.sqrt(elasticFactor) * (interval.isBar ?
            BAR_GIRTH * (larger ? 3 : 1) :
            CABLE_GIRTH * (larger ? 5 : 1))
        const {scale, rotation} = fabric.orientInterval(interval, girth)
        const material = strain < SLACK_THRESHOLD ? SLACK : attenuated ? ATTENUATED : interval.isBar ? BAR : CABLE
        return (
            <mesh
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
                        {!fabric.splitIntervals || !selectedFace ? undefined : (
                            fabric.splitIntervals.selected.map(interval => (
                                <IntervalMesh key={`I${interval.index}`} interval={interval}
                                              larger={true} attenuated={false}/>
                            ))
                        )}
                    </group>
                ) : (
                    <group>
                        {pretenst === 0 ? (fabric.intervals.map(interval => (
                            <IntervalMesh key={`I${interval.index}`} interval={interval}
                                          larger={false} attenuated={true}/>
                        ))) : (fabric.splitIntervals ? ([
                                ...fabric.splitIntervals.unselected.map(interval => (
                                    <IntervalMesh key={`I${interval.index}`} interval={interval}
                                                  larger={false} attenuated={true}/>
                                )),
                                ...fabric.splitIntervals.selected.map(interval => (
                                    <IntervalMesh key={`I${interval.index}`} interval={interval}
                                                  larger={true} attenuated={false}/>
                                )),
                            ]) : (
                                fabric.intervals.map(interval => (
                                    <IntervalMesh key={`I${interval.index}`} interval={interval}
                                                  larger={false} attenuated={false}/>
                                ))
                            )
                        )}
                        {}
                    </group>
                )}
                {showFaces ? <Faces/> : undefined}
                <SelectedFace/>
                <SurfaceComponent/>
            </scene>
        </group>
    )
}
