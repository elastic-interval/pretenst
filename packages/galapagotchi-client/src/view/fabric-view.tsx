/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import * as React from "react"
import { useRef, useState } from "react"
import { DomEvent, extend, ReactThreeFiber, useRender, useThree, useUpdate } from "react-three-fiber"
import { Euler, Object3D, Quaternion, SphereGeometry, Vector3 } from "three"
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls"

import { IntervalRole } from "../fabric/fabric-engine"
import { createConnectedBrick } from "../fabric/tensegrity-brick"
import { facePartSelectable, IInterval, ISelection, Selectable } from "../fabric/tensegrity-brick-types"
import { TensegrityFabric } from "../fabric/tensegrity-fabric"

import {
    TENSEGRITY_BAR,
    TENSEGRITY_CABLE,
    TENSEGRITY_FACE,
    TENSEGRITY_JOINT,
    TENSEGRITY_JOINT_CAN_GROW,
    TENSEGRITY_JOINT_CANNOT_GROW,
    TENSEGRITY_LINE,
} from "./materials"
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

const SPHERE_RADIUS = 0.35
const SPHERE = new SphereGeometry(SPHERE_RADIUS, 16, 16)
const stopPropagation = (event: React.MouseEvent<HTMLDivElement>) => event.stopPropagation()
const Y_AXIS = new Vector3(0, 1, 0)
const JOINT_SCALE = new Vector3(0.6, 0.6, 0.6)

const ITERATIONS_PER_FRAME = 30
const TOWARDS_TARGET = 0.01
const ALTITUDE = 4

export function FabricView({fabric, selection, setSelection}: {
    fabric: TensegrityFabric,
    selection: ISelection,
    setSelection: (s: ISelection) => void,
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
        orbitControls.current.autoRotate = fabric.autoRotate
        fabric.iterate(ITERATIONS_PER_FRAME)
        setAge(fabric.instance.getAge())
    }, true, [fabric, selection, age])

    const tensegrityView = document.getElementById("tensegrity-view") as HTMLElement

    function orientInterval(interval: IInterval): { scale: Vector3, rotation: Euler } {
        const unit = fabric.instance.getIntervalUnit(interval.index)
        const quaternion = new Quaternion().setFromUnitVectors(Y_AXIS, unit)
        const alphaLocation = fabric.instance.getJointLocation(interval.alpha.index)
        const omegaLocation = fabric.instance.getJointLocation(interval.omega.index)
        const intervalLength = alphaLocation.distanceTo(omegaLocation)
        const scale = new Vector3(SPHERE_RADIUS, intervalLength / SPHERE_RADIUS / 2, SPHERE_RADIUS)
        const rotation = new Euler().setFromQuaternion(quaternion)
        return {scale, rotation}
    }

    function IntervalSelection(): JSX.Element {
        if (selection.selectable === Selectable.STRESS) {
            return (
                <>
                    {fabric.intervals.filter(interval => interval.selected)
                        .filter(interval => !interval.removed)
                        .map((interval: IInterval) => {
                            const {scale, rotation} = orientInterval(interval)
                            return (
                                <mesh
                                    key={`I${interval.index}`}
                                    geometry={SPHERE}
                                    position={fabric.instance.getIntervalMidpoint(interval.index)}
                                    rotation={rotation}
                                    scale={scale}
                                    material={TENSEGRITY_CABLE}
                                    onPointerDown={() => setSelection({selectedInterval: interval})}
                                    onPointerUp={stopPropagation}
                                />
                            )
                        })
                    }
                </>
            )
        }
        const selectedFace = selection.selectedFace
        if ((selection.selectable !== Selectable.BAR && selection.selectable !== Selectable.CABLE) || !selectedFace) {
            return <>{undefined}</>
        }
        const bar = selection.selectable === Selectable.BAR
        const intervals = bar ? selectedFace.bars : selectedFace.cables
        return (
            <>
                {intervals
                    .filter(interval => !interval.removed)
                    .map((interval: IInterval) => {
                        const {scale, rotation} = orientInterval(interval)
                        return (
                            <mesh
                                key={`I${interval.index}`}
                                geometry={SPHERE}
                                position={fabric.instance.getIntervalMidpoint(interval.index)}
                                rotation={rotation}
                                scale={scale}
                                material={bar ? TENSEGRITY_BAR : TENSEGRITY_CABLE}
                                onPointerDown={() => setSelection({selectedInterval: interval})}
                                onPointerUp={stopPropagation}
                            />
                        )
                    })
                }
            </>
        )
    }

    function JointSelection(): JSX.Element {
        const selectedFace = selection.selectedFace
        if (selection.selectable !== Selectable.JOINT || !selectedFace) {
            return <>{undefined}</>
        }
        return (
            <>
                {selectedFace.joints
                    .map(joint => (
                        <mesh
                            key={`J${joint.index}`}
                            geometry={SPHERE}
                            position={fabric.instance.getJointLocation(joint.index)}
                            scale={JOINT_SCALE}
                            material={TENSEGRITY_JOINT}
                            onPointerDown={() => setSelection({selectedJoint: joint})}
                            onPointerUp={stopPropagation}
                        />
                    ))
                }
            </>
        )
    }

    function SelectedFace(): JSX.Element {
        const selectedFace = selection.selectedFace
        if (!selectedFace || facePartSelectable(selection)) {
            return <group/>
        }
        return (
            <mesh
                geometry={SPHERE}
                position={fabric.instance.getFaceMidpoint(selectedFace.index)}
                material={selectedFace.canGrow ? TENSEGRITY_JOINT_CAN_GROW : TENSEGRITY_JOINT}
                onClick={(event: DomEvent) => {
                    if (event.shiftKey && selectedFace.canGrow) {
                        createConnectedBrick(selectedFace.brick, selectedFace.triangle)
                        setSelection({})
                    }
                }}
                onPointerDown={stopPropagation}
                onPointerUp={stopPropagation}
            />
        )
    }

    function SelectedInterval(): JSX.Element {
        const selectedInterval = selection.selectedInterval
        if (!selectedInterval) {
            return <group/>
        }
        const {scale, rotation} = orientInterval(selectedInterval)
        const bar = selectedInterval.intervalRole === IntervalRole.Bar
        return (
            <mesh
                geometry={SPHERE}
                position={fabric.instance.getIntervalMidpoint(selectedInterval.index)}
                scale={scale}
                rotation={rotation}
                material={bar ? TENSEGRITY_BAR : TENSEGRITY_CABLE}
            />
        )
    }

    function SelectedJoint(): JSX.Element {
        const selectedJoint = selection.selectedJoint
        if (!selectedJoint) {
            return <group/>
        }
        return (
            <mesh
                key={`J${selectedJoint.index}`}
                geometry={SPHERE}
                position={fabric.instance.getJointLocation(selectedJoint.index)}
                scale={JOINT_SCALE}
                material={TENSEGRITY_JOINT_CANNOT_GROW}
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
            const topFace = faces.reverse().pop()
            if (topFace) {
                setSelection({selectable: Selectable.FACE, selectedFace: topFace})
            }
        }
        return (
            <mesh
                ref={meshRef}
                onClick={onClick}
                geometry={fabric.facesGeometry}
                material={TENSEGRITY_FACE}
            />
        )
    }

    function Lines(): JSX.Element {
        return <lineSegments key="lines" geometry={fabric.linesGeometry} material={TENSEGRITY_LINE}/>
    }

    return (
        <group>
            <orbitControls ref={orbitControls} args={[camera, tensegrityView]}/>
            <scene>
                <Faces/>
                <Lines/>
                <SurfaceComponent/>
                <JointSelection/>
                <IntervalSelection/>
                <SelectedFace/>
                <SelectedJoint/>
                <SelectedInterval/>
            </scene>
        </group>
    )
}
