
/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import * as React from "react"
import { useEffect, useState } from "react"
import { Canvas, extend, ReactThreeFiber } from "react-three-fiber"
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls"

import { IFabricEngine } from "../fabric/fabric-engine"
import { IFeature } from "../fabric/features"
import { ISelectedFace } from "../fabric/tensegrity-brick-types"
import { TensegrityFabric } from "../fabric/tensegrity-fabric"
import { showFeatures } from "../storage/local-storage"

import { CodePanel, ICode } from "./code-panel"
import { FabricView } from "./fabric-view"
import { FeaturePanel } from "./feature-panel"
import { TensegrityControlPanel } from "./tensegrity-control-panel"

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

const PRETENST_AFTER_CONSTRUCTION = 0

export function TensegrityView({engine, getFreshFabric, features}: {
    engine: IFabricEngine,
    getFreshFabric: (name: string, pretenst: number) => TensegrityFabric,
    features: IFeature[],
}): JSX.Element {

    const [pretenst, setPretenst] = useState<number>(0)
    const [showFaces, setShowFaces] = useState<boolean>(true)
    const [autoRotate, setAutoRotate] = useState<boolean>(false)
    const [fastMode, setFastMode] = useState<boolean>(true)

    const [code, setCode] = useState<ICode | undefined>()
    const [fabric, setFabric] = useState<TensegrityFabric | undefined>()
    const [busy, setBusy] = useState(false)
    const [selectedFace, setSelectedFace] = useState<ISelectedFace | undefined>()

    function buildFromCode(): void {
        if (!code) {
            return
        }
        const {storageIndex, codeString, codeTree} = code
        setSelectedFace(undefined)
        setPretenst(PRETENST_AFTER_CONSTRUCTION)
        const fetched = getFreshFabric(storageIndex.toString(), pretenst)
        fetched.startConstruction(codeTree, PRETENST_AFTER_CONSTRUCTION)
        setFabric(fetched)
        location.hash = codeString
    }

    useEffect(buildFromCode, [code])

    return (
        <div id="tensegrity-view" className="the-whole-page">
            {!fabric ? (
                <CodePanel code={code} setCode={setCode}/>
            ) : (
                <>
                    <Canvas>
                        <FabricView
                            fabric={fabric}
                            pretenst={pretenst}
                            busy={busy}
                            setBusy={setBusy}
                            selectedFace={selectedFace}
                            setSelectedFace={setSelectedFace}
                            autoRotate={autoRotate}
                            fastMode={fastMode}
                            showFaces={showFaces}
                        />
                    </Canvas>
                    {!showFeatures() ? undefined : (
                        <FeaturePanel
                            featureSet={features}
                            engine={engine}
                            fabric={fabric}
                        />
                    )}
                    <div id="bottom-middle">
                        <TensegrityControlPanel
                            fabric={fabric}
                            clearFabric={() => setFabric(undefined)}
                            rebuildFabric={buildFromCode}
                            pretenst={pretenst}
                            setShowFaces={setShowFaces}
                            setPretenst={pretenstValue => {
                                fabric.instance.engine.setPretenst(pretenstValue)
                                setPretenst(pretenstValue)
                            }}
                            selectedFace={selectedFace}
                            setSelectedFace={setSelectedFace}
                            autoRotate={autoRotate}
                            setAutoRotate={setAutoRotate}
                            fastMode={fastMode}
                            setFastMode={setFastMode}
                            busy={busy}
                        />
                    </div>
                </>
            )}
        </div>
    )
}
