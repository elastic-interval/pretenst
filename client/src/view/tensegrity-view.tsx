/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import * as React from "react"
import { useEffect, useState } from "react"
import { FaCog } from "react-icons/all"
import { Canvas, extend, ReactThreeFiber } from "react-three-fiber"
import { ButtonDropdown, DropdownItem, DropdownMenu, DropdownToggle } from "reactstrap"
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls"

import { IFabricEngine } from "../fabric/fabric-engine"
import { IFeature } from "../fabric/features"
import { ISelection } from "../fabric/tensegrity-brick-types"
import { TensegrityFabric } from "../fabric/tensegrity-fabric"
import { loadFabricCode, loadStorageIndex, storeStorageIndex } from "../storage/local-storage"

import { CommandPanel } from "./command-panel"
import { FabricView } from "./fabric-view"
import { TensegrityControl } from "./tensegrity-control"

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

export function TensegrityView({engine, getFabric, physicsFeatures, roleFeatures}: {
    engine: IFabricEngine,
    getFabric: (name: string) => TensegrityFabric,
    physicsFeatures: IFeature[],
    roleFeatures: IFeature[],
}): JSX.Element {

    const [autoRotate, setAutoRotate] = useState<boolean>(false)
    const [fastMode, setFastMode] = useState<boolean>(false)
    const [storageIndex, setStorageIndex] = useState<number>(loadStorageIndex)
    const [fabric, setFabric] = useState<TensegrityFabric | undefined>()
    const [selection, setSelection] = useState<ISelection>({})

    useEffect(() => {
        if (!fabric) {
            const code = loadFabricCode()[loadStorageIndex()]
            const fetched = getFabric(code)
            fetched.startConstruction(code)
            setFabric(fetched)
        }
    })

    function constructFabric(code: string): void {
        setSelection({})
        if (fabric) {
            fabric.startConstruction(code)
        } else {
            const fetched = getFabric(code)
            fetched.startConstruction(code)
            setFabric(fetched)
        }
    }

    const FabricChoice = (): JSX.Element => {
        const [open, setOpen] = useState<boolean>(false)
        const select = (code: string, index: number) => {
            setStorageIndex(index)
            storeStorageIndex(index)
            constructFabric(code)
        }

        const fabricCode = loadFabricCode()
        return (
            <div style={{
                position: "absolute",
                top: "1em",
                right: "1em",
            }}>
                <ButtonDropdown className="w-100 my-2 btn-info" isOpen={open} toggle={() => setOpen(!open)}>
                    <DropdownToggle>
                        <FaCog/> {fabricCode[storageIndex]}
                    </DropdownToggle>
                    <DropdownMenu right={true}>
                        {fabricCode.map((code, index) => (
                            <DropdownItem key={`Buffer${index}`} onClick={() => select(code, index)}>
                                {code}
                            </DropdownItem>
                        ))}
                    </DropdownMenu>
                </ButtonDropdown>
            </div>
        )
    }

    return (
        <div className="the-whole-page">
            <div className="left-panel">
                <TensegrityControl
                    engine={engine}
                    physicsFeatures={physicsFeatures}
                    roleFeatures={roleFeatures}
                    fabric={fabric}
                    constructFabric={constructFabric}
                    selection={selection}
                    setSelection={setSelection}
                />
            </div>
            <div id="tensegrity-view" className="middle-panel">
                <Canvas>
                    {!fabric ? undefined : (
                        <FabricView
                            fabric={fabric}
                            selection={selection}
                            setSelection={setSelection}
                            autoRotate={autoRotate}
                            fastMode={fastMode}
                        />
                    )}
                </Canvas>
            </div>
            <CommandPanel
                constructFabric={constructFabric}
                fabric={fabric}
                autoRotate={autoRotate}
                setAutoRotate={setAutoRotate}
                fastMode={fastMode}
                setFastMode={setFastMode}
                storageIndex={storageIndex}
            />
            <FabricChoice/>
        </div>
    )
}

