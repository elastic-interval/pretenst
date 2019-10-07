/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import * as React from "react"
import { useRef, useState } from "react"
import { extend, ReactThreeFiber, useRender, useThree, useUpdate } from "react-three-fiber"
import { Euler, Object3D, Vector3 } from "three"
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls"

import { IntervalRole } from "../fabric/fabric-engine"
import { FaceSelection, IBrick, IInterval, ISelectedFace } from "../fabric/tensegrity-brick-types"
import { SPHERE, TensegrityFabric } from "../fabric/tensegrity-fabric"

import { BAR, CABLE, FACE, FACE_SPHERE, FACE_SPHERE_GROW, LINE, SELECTED_INTERVAL } from "./materials"
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

function girth(intervalRole: IntervalRole): number {
    return intervalRole === IntervalRole.Bar ? 0.8 : 0.16
}

export function FabricView({fabric, selectedFace, setSelectedFace, autoRotate, fastMode}: {
    fabric: TensegrityFabric,
    selectedFace: ISelectedFace | undefined,
    setSelectedFace: (face: ISelectedFace | undefined) => void,
    autoRotate: boolean,
    fastMode: boolean,
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
    }, true, [fabric, selectedFace, age])

    const tensegrityView = document.getElementById("tensegrity-view") as HTMLElement

    const nextSelection = (faceSelection: FaceSelection): FaceSelection => {
        switch (faceSelection) {
            case FaceSelection.None:
                return FaceSelection.Cables
            case FaceSelection.Cables:
                return FaceSelection.Bars
            case FaceSelection.Bars:
                return FaceSelection.Face
            case FaceSelection.Face:
                return FaceSelection.Brick
            case FaceSelection.Brick:
                return FaceSelection.None
        }
    }
    const activateFaceSelection = (face: ISelectedFace) => {
        if (!fabric) {
            return
        }
        fabric.selectNone()
        switch (face.faceSelection) {
            case FaceSelection.None:
                break
            case FaceSelection.Bars:
                face.face.bars.forEach(bar => bar.selected = true)
                break
            case FaceSelection.Cables:
                face.face.cables.forEach(bar => bar.selected = true)
                break
            case FaceSelection.Face:
                const touchesFace = (interval: IInterval) => face.face.joints.some(joint => (
                    interval.alpha.index === joint.index || interval.omega.index === joint.index
                ))
                fabric.intervals.forEach(interval => interval.selected = touchesFace(interval))
                break
            case FaceSelection.Brick:
                const brick: IBrick = face.face.brick
                const brickIntervals: IInterval[] = [...brick.bars, ...brick.cables]
                brickIntervals.forEach(bar => bar.selected = true)
                break
        }
    }
    const select = (newSelectedFace: ISelectedFace) => {
        activateFaceSelection(newSelectedFace)
        setSelectedFace(newSelectedFace)
    }

    function SelectedFace(): JSX.Element {
        if (!selectedFace) {
            return <group/>
        }
        return (
            <mesh
                geometry={SPHERE}
                position={fabric.instance.getFaceMidpoint(selectedFace.face.index)}
                material={selectedFace.face.canGrow ? FACE_SPHERE_GROW : FACE_SPHERE}
                onPointerDown={(event: React.MouseEvent<HTMLDivElement>) => {
                    const faceSelection = nextSelection(selectedFace.faceSelection)
                    const face = selectedFace.face
                    select({face, faceSelection})
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
            fabric.selectNone()
            const face = faces.reverse().pop()
            if (!face) {
                return
            }
            const faceSelection = FaceSelection.None
            select({face, faceSelection})
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

    function IntervalSelection(): JSX.Element {
        return (
            <group>
                {fabric.selectedIntervals
                    .filter(interval => !interval.removed)
                    .map((interval: IInterval) => {
                        const {scale, rotation} = fabric.orientInterval(interval, girth(interval.intervalRole))
                        return (
                            <mesh
                                key={`I${interval.index}`}
                                geometry={SPHERE}
                                position={fabric.instance.getIntervalMidpoint(interval.index)}
                                rotation={new Euler().setFromQuaternion(rotation)}
                                scale={scale}
                                material={CABLE}
                                onPointerDown={() => setSelectedFace(undefined)}
                                onPointerUp={stopPropagation}
                            />
                        )
                    })
                }
            </group>
        )
    }

    return (
        <group>
            <orbitControls ref={orbitControls} args={[camera, tensegrityView]}/>
            <scene>
                <Faces/>
                {fastMode ? (
                    <lineSegments key="lines" geometry={fabric.linesGeometry} material={LINE}/>
                ) : (
                    <group>
                        {fabric.intervals.map((interval: IInterval) => {
                            const bar = interval.intervalRole === IntervalRole.Bar
                            const widening = interval.selected ? (bar ? 1.2 : 3) : 1
                            const material = interval.selected ? SELECTED_INTERVAL : bar ? BAR : CABLE
                            const {scale, rotation} = fabric.orientInterval(interval, girth(interval.intervalRole) * widening)
                            return (
                                <mesh
                                    key={`I${interval.index}`}
                                    geometry={SPHERE}
                                    position={fabric.instance.getIntervalMidpoint(interval.index)}
                                    rotation={new Euler().setFromQuaternion(rotation)}
                                    scale={scale}
                                    material={material}
                                />
                            )
                        })}
                    </group>
                )}
                <IntervalSelection/>
                <SelectedFace/>
                <SurfaceComponent/>
            </scene>
        </group>
    )
}
