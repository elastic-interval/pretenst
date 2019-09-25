/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import * as React from "react"
import { useEffect, useState } from "react"
import { Canvas, extend, ReactThreeFiber } from "react-three-fiber"
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls"

import { IFabricEngine } from "../fabric/fabric-engine"
import { Physics } from "../fabric/physics"
import { connectClosestFacePair } from "../fabric/tensegrity-brick"
import { IFace, IInterval, IJoint, ISelection, selectionActive } from "../fabric/tensegrity-brick-types"
import { Selectable, TensegrityFabric } from "../fabric/tensegrity-fabric"
import { loadFabricCode, loadStorageIndex } from "../storage/local-storage"

import { BuildingPanel } from "./building-panel"
import { FabricView } from "./fabric-view"
import { NewFabricView } from "./new-fabric-view"
import { PhysicsPanel } from "./physics-panel"

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

const ALTITUDE = 6

export function TensegrityView({engine, getFabric, physics}: {
    engine: IFabricEngine,
    getFabric: (name: string) => TensegrityFabric,
    physics: Physics,
}): JSX.Element {
    const [fabric, setFabric] = useState<TensegrityFabric | undefined>()
    const [selection, setSelection] = useState<ISelection>({})
    const factor = (up: boolean) => 1.0 + (up ? 0.005 : -0.005)
    useEffect(() => {
        if (!fabric) {
            const code = loadFabricCode()[loadStorageIndex()]
            const fetched = getFabric(code)
            fetched.startConstruction(code, ALTITUDE)
            setFabric(fetched)
        }
    })
    const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
        const adjustJoint = (joint: IJoint | undefined, bar: boolean, up: boolean) => {
            if (joint === undefined || !fabric) {
                return
            }
        }
        const adjustInterval = (interval: IInterval | undefined, up: boolean) => {
            if (interval === undefined || !fabric) {
                return
            }
            // TODO: this will not work, because it's not a factor!
            fabric.instance.changeRestLength(interval.index, factor(up))
        }
        const adjustFace = (face: IFace | undefined, bar: boolean, up: boolean) => {
            if (face === undefined || !fabric) {
                return
            }
        }
        if (!fabric) {
            return
        }
        const selectedFace = selection.selectedFace
        switch (event.key) {
            case "a":
                fabric.instance.setAltitude(25)
                break
            case " ":
                if (selectionActive(selection)) {
                    setSelection({})
                } else {
                    fabric.autoRotate = !fabric.autoRotate
                }
                break
            case "ArrowUp":
                adjustJoint(selection.selectedJoint, true, true)
                adjustFace(selectedFace, true, true)
                adjustInterval(selection.selectedInterval, true)
                break
            case "ArrowDown":
                adjustJoint(selection.selectedJoint, true, false)
                adjustFace(selectedFace, true, false)
                adjustInterval(selection.selectedInterval, false)
                break
            case "ArrowLeft":
                adjustJoint(selection.selectedJoint, false, false)
                adjustFace(selectedFace, false, false)
                adjustInterval(selection.selectedInterval, false)
                break
            case "ArrowRight":
                adjustJoint(selection.selectedJoint, false, true)
                adjustFace(selectedFace, false, true)
                adjustInterval(selection.selectedInterval, true)
                break
            case "i":
                setSelection({selectable: Selectable.INTERVAL})
                break
            case "g":
                setSelection({selectable: Selectable.GROW_FACE})
                break
            case "j":
                setSelection({selectable: Selectable.JOINT})
                break
            case "f":
                setSelection({selectable: Selectable.FACE})
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
            <BuildingPanel selection={selection}/>
            <NewFabricView
                constructFabric={code => {
                    if (fabric) {
                        fabric.startConstruction(code, ALTITUDE)
                    } else {
                        const fetched = getFabric(code)
                        fetched.startConstruction(code, ALTITUDE)
                        setFabric(fetched)
                    }
                }}
            />
            <Canvas>
                {!fabric ? undefined : <FabricView fabric={fabric} selection={selection} setSelection={setSelection}/>}
            </Canvas>
            {!fabric ? undefined :
                <PhysicsPanel physics={physics} engine={engine} instance={fabric.instance}/>}
        </div>
    )
}

