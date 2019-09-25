/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import * as React from "react"
import { useState } from "react"
import { DomEvent, extend, ReactThreeFiber, useRender, useThree, useUpdate } from "react-three-fiber"
import { SphereGeometry, Vector3 } from "three"
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls"

import { createConnectedBrick } from "../fabric/tensegrity-brick"
import { IFace, IInterval, ISelection, Selectable } from "../fabric/tensegrity-brick-types"
import { TensegrityFabric } from "../fabric/tensegrity-fabric"

import {
    TENSEGRITY_FACE,
    TENSEGRITY_JOINT,
    TENSEGRITY_JOINT_CAN_GROW,
    TENSEGRITY_JOINT_SELECTED,
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

const SPHERE = new SphereGeometry(0.3, 16, 16)
const stopPropagation = (event: React.MouseEvent<HTMLDivElement>) => event.stopPropagation()

const ITERATIONS_PER_FRAME = 30
const TOWARDS_TARGET = 0.01
const ALTITUDE = 6

export function FabricView({fabric, selection, setSelection}: {
    fabric: TensegrityFabric,
    selection: ISelection,
    setSelection: (s: ISelection) => void,
}): JSX.Element {
    const [age, setAge] = useState<number>(0)
    const {camera} = useThree()
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
    const render = () => {
        const towardsTarget = new Vector3().subVectors(fabric.instance.midpoint, orbitControls.current.target).multiplyScalar(TOWARDS_TARGET)
        orbitControls.current.target.add(towardsTarget)
        orbitControls.current.update()
        orbitControls.current.autoRotate = fabric.autoRotate
        fabric.iterate(ITERATIONS_PER_FRAME)
        setAge(fabric.instance.getAge())
    }
    useRender(render, true, [fabric, selection, age])
    const tensegrityView = document.getElementById("tensegrity-view") as HTMLElement

    function IntervalSelection(): JSX.Element {
        const invisible = selection.selectable !== Selectable.INTERVAL
        return (
            <>
                {invisible ? undefined :
                    fabric.intervals.filter(interval => !interval.removed).map((interval: IInterval) => (
                        <mesh
                            key={`I${interval.index}`}
                            geometry={SPHERE}
                            position={fabric.instance.getIntervalMidpoint(interval.index)}
                            material={TENSEGRITY_JOINT}
                            onPointerDown={() => setSelection({selectedInterval: interval})}
                            onPointerUp={stopPropagation}
                        />
                    ))}
            </>
        )
    }

    function JointSelection(): JSX.Element {
        const invisible = selection.selectable !== Selectable.JOINT
        return (
            <>
                {invisible ? undefined : [...Array(fabric.jointCount)].map((x, jointIndex) => (
                    <mesh
                        key={`J${jointIndex}`}
                        geometry={SPHERE}
                        position={fabric.instance.getJointLocation(jointIndex)}
                        material={TENSEGRITY_JOINT}
                        onPointerDown={() => setSelection({selectedJoint: fabric.joints[jointIndex]})}
                        onPointerUp={stopPropagation}
                    />
                ))}
            </>
        )
    }

    function FaceSelection(): JSX.Element {
        const invisible = selection.selectable !== Selectable.FACE
        return (
            <>
                {invisible ? undefined : fabric.faces.map((face: IFace) => (
                    <mesh
                        key={`FS${face.index}`}
                        geometry={SPHERE}
                        position={fabric.instance.getFaceMidpoint(face.index)}
                        material={face.canGrow ? TENSEGRITY_JOINT_CAN_GROW : TENSEGRITY_JOINT}
                        onPointerDown={(event: DomEvent) => {
                            if (event.shiftKey && face.canGrow) {
                                createConnectedBrick(face.brick, face.triangle)
                                setSelection({})
                            } else {
                                setSelection({selectedFace: face})
                            }
                            event.stopPropagation()
                        }}
                        onPointerUp={stopPropagation}
                    />
                ))}
            </>
        )
    }

    function SelectedInterval(): JSX.Element {
        const selectedInterval = selection.selectedInterval
        if (!selectedInterval) {
            return <group/>
        }
        return (
            <mesh
                geometry={SPHERE}
                position={fabric.instance.getIntervalMidpoint(selectedInterval.index)}
                material={TENSEGRITY_JOINT_SELECTED}
            />
        )
    }

    function SelectedFace(): JSX.Element {
        const selectedFace = selection.selectedFace
        if (!selectedFace) {
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
                material={TENSEGRITY_JOINT_SELECTED}
            />
        )
    }

    return (
        <group>
            <orbitControls ref={orbitControls} args={[camera, tensegrityView]}/>
            <scene>
                <mesh key="faces" geometry={fabric.facesGeometry} material={TENSEGRITY_FACE}/>
                <lineSegments key="lines" geometry={fabric.linesGeometry} material={TENSEGRITY_LINE}/>
                <SurfaceComponent/>
                <FaceSelection/>
                <JointSelection/>
                <IntervalSelection/>
                <SelectedJoint/>
                <SelectedFace/>
                <SelectedInterval/>
            </scene>
        </group>
    )
}
