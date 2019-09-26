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
import { ISelection } from "../fabric/tensegrity-brick-types"
import { TensegrityFabric } from "../fabric/tensegrity-fabric"
import { loadFabricCode, loadStorageIndex } from "../storage/local-storage"

import { BuildingPanel } from "./building-panel"
import { FabricView } from "./fabric-view"
import { GlobalFabricPanel } from "./global-fabric-panel"
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

    useEffect(() => {
        if (!fabric) {
            const code = loadFabricCode()[loadStorageIndex()]
            const fetched = getFabric(code)
            fetched.startConstruction(code, ALTITUDE)
            setFabric(fetched)
        }
    })

    function constructFabric(code: string): void {
        setSelection({})
        if (fabric) {
            fabric.startConstruction(code, ALTITUDE)
        } else {
            const fetched = getFabric(code)
            fetched.startConstruction(code, ALTITUDE)
            setFabric(fetched)
        }
    }

    return (
        <div tabIndex={1} id="tensegrity-view" className="the-whole-page">
            <Canvas>
                {!fabric ? undefined : <FabricView fabric={fabric} selection={selection} setSelection={setSelection}/>}
            </Canvas>
            <GlobalFabricPanel fabric={fabric}
                               constructFabric={constructFabric}
                               cancelSelection={() => setSelection({})}/>
            {!fabric ? undefined :
                <PhysicsPanel physics={physics} engine={engine} instance={fabric.instance}/>
            }
            {!fabric ? undefined :
                <BuildingPanel fabric={fabric} selection={selection} setSelection={setSelection}/>
            }
        </div>
    )
}

