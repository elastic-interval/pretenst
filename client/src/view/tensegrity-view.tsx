/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import * as React from "react"
import { useState } from "react"
import { Canvas, extend, ReactThreeFiber, useRender, useThree, useUpdate } from "react-three-fiber"
import { Geometry, SphereGeometry, Vector3 } from "three"
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls"

import { IFabricEngine } from "../fabric/fabric-engine"
import { Physics } from "../fabric/physics"
import { connectClosestFacePair } from "../fabric/tensegrity-brick"
import { IFace, IInterval, IJoint } from "../fabric/tensegrity-brick-types"
import { Selectable, TensegrityFabric } from "../fabric/tensegrity-fabric"

import {
    TENSEGRITY_FACE,
    TENSEGRITY_JOINT,
    TENSEGRITY_JOINT_CAN_GROW,
    TENSEGRITY_JOINT_SELECTED,
    TENSEGRITY_LINE,
} from "./materials"
import { DEFAULT_NAME, fetchFabricCode, NewFabricView } from "./new-fabric-view"
import { PhysicsPanel } from "./physics-panel"
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
const SPHERE = new SphereGeometry(0.12, 16, 16)

const ITERATIONS_PER_FRAME = 30
const TOWARDS_TARGET = 0.01
const ALTITUDE = 10
const FABRIC_BUFFER_KEY = "FabricBuffer"

function loadFabricBufferName(): string {
    const bufferName = localStorage.getItem(FABRIC_BUFFER_KEY)
    if (!bufferName) {
        return DEFAULT_NAME
    }
    return bufferName
}

function storeFabricBufferName(name: string): void {
    localStorage.setItem(FABRIC_BUFFER_KEY, name)
}

export function TensegrityView({engine, getFabric, physics}: {
    engine: IFabricEngine,
    getFabric: (name: string) => TensegrityFabric,
    physics: Physics,
}): JSX.Element {
    const [fabric, setFabric] = useState<TensegrityFabric | undefined>()
    const factor = (up: boolean) => 1.0 + (up ? 0.005 : -0.005)
    const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
        const handleJoint = (joint: IJoint | undefined, bar: boolean, up: boolean) => {
            if (joint === undefined || !fabric) {
                return
            }
        }
        const handleInterval = (interval: IInterval | undefined, up: boolean) => {
            if (interval === undefined || !fabric) {
                return
            }
            // TODO: this will not work, because it's not a factor!
            fabric.instance.changeRestLength(interval.index, factor(up))
        }
        const handleFace = (face: IFace | undefined, bar: boolean, up: boolean) => {
            if (face === undefined || !fabric) {
                return
            }
        }
        if (!fabric) {
            return
        }
        switch (event.key) {
            case " ":
                fabric.instance.setAltitude(25)
                break
            case "Enter":
                if (fabric.selectionActive) {
                    fabric.selectable = Selectable.NONE
                    fabric.cancelSelection()
                } else {
                    fabric.autoRotate = !fabric.autoRotate
                }
                break
            case "ArrowUp":
                handleJoint(fabric.selectedJoint, true, true)
                handleFace(fabric.selectedFace, true, true)
                handleInterval(fabric.selectedInterval, true)
                break
            case "ArrowDown":
                handleJoint(fabric.selectedJoint, true, false)
                handleFace(fabric.selectedFace, true, false)
                handleInterval(fabric.selectedInterval, false)
                break
            case "ArrowLeft":
                handleJoint(fabric.selectedJoint, false, false)
                handleFace(fabric.selectedFace, false, false)
                handleInterval(fabric.selectedInterval, false)
                break
            case "ArrowRight":
                handleJoint(fabric.selectedJoint, false, true)
                handleFace(fabric.selectedFace, false, true)
                handleInterval(fabric.selectedInterval, true)
                break
            case "i":
                fabric.selectable = Selectable.INTERVAL
                break
            case "F":
                fabric.selectable = Selectable.GROW_FACE
                break
            case "j":
                fabric.selectable = Selectable.JOINT
                break
            case "f":
                fabric.selectable = Selectable.FACE
                break
            case "Backspace":
                break
            case "c":
                fabric.instance.centralize()
                break
            case "l":
                fabric.optimize(false)
                break
            case "h":
                fabric.optimize(true)
                break
            case "x":
                connectClosestFacePair(fabric)
                break
            case "D":
                const csvJoints: string[][] = []
                const csvIntervals: string[][] = []
                const output = fabric.output
                csvJoints.push(["index", "x", "y", "z"])
                output.joints.forEach(joint => {
                    csvJoints.push([joint.index, joint.x, joint.y, joint.z])
                })
                csvIntervals.push(["joints", "type"])
                output.intervals.forEach(interval => {
                    csvIntervals.push([`"=""${interval.joints}"""`, interval.type])
                })
                console.log("Joints =======================\n", csvJoints.map(a => a.join(";")).join("\n"))
                console.log("Intervals =======================\n", csvIntervals.map(a => a.join(";")).join("\n"))
                break
            case "d":
                console.log(JSON.stringify(fabric.output, undefined, 4))
                break
            case "Alt":
            case "Meta":
            case "Shift":
                break
            default:
                console.log("Key", event.key)
        }
    }
    return (
        <div tabIndex={1} id="tensegrity-view" className="the-whole-page" onKeyDownCapture={onKeyDown}>
            <NewFabricView
                defaultBufferName={loadFabricBufferName()}
                constructFabric={code => {
                    if (fabric) {
                        fabric.startConstruction(code, ALTITUDE)
                    } else {
                        const fetched = getFabric(loadFabricBufferName())
                        fetched.startConstruction(code, ALTITUDE)
                        setFabric(fetched)
                        return
                    }
                }}
                selectBuffer={bufferName => {
                    storeFabricBufferName(bufferName)
                    const bufferFabric = getFabric(bufferName)
                    if (bufferFabric.joints.length === 0) {
                        bufferFabric.startConstruction(fetchFabricCode(bufferName), ALTITUDE)
                    }
                    setFabric(bufferFabric)
                }}
            />
            <Canvas>
                {!fabric ? undefined : <FabricView fabric={fabric}/>}
            </Canvas>
            {!fabric ? undefined :
                <PhysicsPanel physics={physics} engine={engine} instance={fabric.instance}/>}
        </div>
    )
}

function FabricView({fabric}: {
    fabric: TensegrityFabric,
}): JSX.Element {
    const [age, setAge] = useState<number>(0)
    const {camera} = useThree()
    const orbitControls = useUpdate<OrbitControls>(controls => {
        controls.minPolarAngle = -0.1 * Math.PI / 2
        controls.maxPolarAngle = 0.999 * Math.PI / 2
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
    useRender(render, true, [fabric, age])
    const selectedJoint = fabric.selectedJoint
    const selectedFace = fabric.selectedFace
    const selectedInterval = fabric.selectedInterval
    const tensegrityView = document.getElementById("tensegrity-view") as HTMLElement
    return (
        <group>
            <orbitControls ref={orbitControls} args={[camera, tensegrityView]}/>
            <scene>
                <mesh key="faces" geometry={fabric.facesGeometry} material={TENSEGRITY_FACE}/>
                <lineSegments key="lines" geometry={fabric.linesGeometry} material={TENSEGRITY_LINE}/>
                <SurfaceComponent/>
                {fabric.selectable !== Selectable.FACE ? undefined : (
                    <FaceSelection fabric={fabric} geometry={SPHERE} canGrow={false}/>
                )}
                {fabric.selectable !== Selectable.GROW_FACE ? undefined : (
                    <FaceSelection fabric={fabric} geometry={SPHERE} canGrow={true}/>
                )}
                {fabric.selectable !== Selectable.JOINT ? undefined : (
                    <JointSelection fabric={fabric} geometry={SPHERE}/>)}
                )}
                {fabric.selectable !== Selectable.INTERVAL ? undefined : (
                    <IntervalSelection fabric={fabric} geometry={SPHERE}/>)}
                )}
                {selectedJoint === undefined ? undefined : (
                    <SelectedJoint fabric={fabric} geometry={SPHERE} selectedJoint={selectedJoint}/>
                )}
                {selectedFace === undefined ? undefined : (
                    <SelectedFace fabric={fabric} geometry={SPHERE} selectedFace={selectedFace}/>
                )}
                {selectedInterval === undefined ? undefined : (
                    <SelectedInterval fabric={fabric} geometry={SPHERE} selectedInterval={selectedInterval}/>
                )}
            </scene>
        </group>
    )
}

function FaceSelection({fabric, geometry, canGrow}: {
    fabric: TensegrityFabric,
    geometry: Geometry,
    canGrow: boolean,
}): JSX.Element {
    const faces = canGrow ? fabric.faces.filter(face => face.canGrow) : fabric.faces
    return (
        <>
            {faces.map((face: IFace) => (
                <mesh
                    key={`F${face.index}`}
                    geometry={geometry}
                    position={fabric.instance.getFaceMidpoint(face.index)}
                    material={canGrow ? TENSEGRITY_JOINT_CAN_GROW : TENSEGRITY_JOINT}
                    onClick={() => fabric.selectedFace = face}
                />
            ))}
        </>
    )
}

function SelectedFace({fabric, geometry, selectedFace}: {
    fabric: TensegrityFabric,
    geometry: Geometry,
    selectedFace: IFace,
}): JSX.Element {
    return (
        <mesh
            key={`F${selectedFace.index}`}
            geometry={geometry}
            position={fabric.instance.getFaceMidpoint(selectedFace.index)}
            material={TENSEGRITY_JOINT}
            onPointerDown={stopPropagation}
            onPointerUp={stopPropagation}
        />
    )
}

function JointSelection({fabric, geometry}: {
    fabric: TensegrityFabric,
    geometry: Geometry,
}): JSX.Element {
    return (
        <>
            {[...Array(fabric.jointCount)].map((x, jointIndex) => (
                <mesh
                    key={`J${jointIndex}`}
                    geometry={geometry}
                    position={fabric.instance.getJointLocation(jointIndex)}
                    material={TENSEGRITY_JOINT}
                    onClick={() => fabric.selectedJoint = fabric.joints[jointIndex]}
                    onPointerDown={stopPropagation}
                    onPointerUp={stopPropagation}
                />
            ))}
        </>
    )
}

function SelectedJoint({fabric, geometry, selectedJoint}: {
    fabric: TensegrityFabric,
    geometry: Geometry,
    selectedJoint: IJoint,
}): JSX.Element {
    return (
        <mesh
            key={`J${selectedJoint.index}`}
            geometry={geometry}
            position={fabric.instance.getJointLocation(selectedJoint.index)}
            material={TENSEGRITY_JOINT_SELECTED}
        />
    )
}

function IntervalSelection({fabric, geometry}: {
    fabric: TensegrityFabric,
    geometry: Geometry,
}): JSX.Element {
    return (
        <>
            {fabric.intervals.filter(interval => !interval.removed).map((interval: IInterval) => (
                <mesh
                    key={`I${interval.index}`}
                    geometry={geometry}
                    position={fabric.instance.getIntervalMidpoint(interval.index)}
                    material={TENSEGRITY_JOINT}
                    onClick={() => fabric.selectedInterval = interval}
                    onPointerDown={stopPropagation}
                    onPointerUp={stopPropagation}
                />
            ))}
        </>
    )
}

function SelectedInterval({fabric, geometry, selectedInterval}: {
    fabric: TensegrityFabric,
    geometry: Geometry,
    selectedInterval: IInterval,
}): JSX.Element {
    return (
        <mesh
            key={`I${selectedInterval.index}`}
            geometry={geometry}
            position={fabric.instance.getIntervalMidpoint(selectedInterval.index)}
            material={TENSEGRITY_JOINT_SELECTED}
        />
    )
}

