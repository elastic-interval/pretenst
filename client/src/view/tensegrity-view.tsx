/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import * as React from "react"
import { useEffect, useState } from "react"
import { Canvas, extend, ReactThreeFiber } from "react-three-fiber"
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls"

import { IFabricEngine, LifePhase } from "../fabric/fabric-engine"
import { IFeature } from "../fabric/features"
import { ICodeTree, ISelectedFace } from "../fabric/tensegrity-brick-types"
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

export function TensegrityView({engine, buildFabric, features}: {
    engine: IFabricEngine,
    buildFabric: (name: string, codeTree: ICodeTree) => TensegrityFabric,
    features: IFeature[],
}): JSX.Element {

    const [lifePhase, setLifePhase] = useState(LifePhase.Growing)
    const [showFaces, setShowFaces] = useState(true)
    const [autoRotate, setAutoRotate] = useState(false)
    const [fastMode, setFastMode] = useState(true)

    const [code, setCode] = useState<ICode | undefined>()
    const [fabric, setFabric] = useState<TensegrityFabric | undefined>()
    const [selectedFace, setSelectedFace] = useState<ISelectedFace | undefined>()
    const [busy, setBusy] = useState(false)

    function buildFromCode(): void {
        if (!code) {
            return
        }
        const {storageIndex, codeString, codeTree} = code
        setSelectedFace(undefined)
        if (fabric) {
            fabric.instance.release()
        }
        const fetched = buildFabric(storageIndex.toString(), codeTree)
        setFabric(fetched)
        setLifePhase(fetched.lifePhase)
        location.hash = codeString
        console.log("\n", JSON.stringify(codeTree))
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
                            lifePhase={lifePhase}
                            setLifePhase={setLifePhase}
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
                    {!code ? undefined : (
                        <div id="top-middle">
                            {code.codeString}
                        </div>
                    )}
                    <div id="bottom-middle">
                        <TensegrityControlPanel
                            fabric={fabric}
                            clearFabric={() => setFabric(undefined)}
                            rebuildFabric={buildFromCode} // TODO
                            lifePhase={lifePhase}
                            setLifePhase={setLifePhase}
                            setShowFaces={setShowFaces}
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
