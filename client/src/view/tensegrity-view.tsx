/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import * as React from "react"
import { useEffect, useState } from "react"
import { FaCog, FaDownload } from "react-icons/all"
import { Canvas, extend, ReactThreeFiber } from "react-three-fiber"
import { Button, ButtonDropdown, ButtonGroup, DropdownItem, DropdownMenu, DropdownToggle } from "reactstrap"
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls"

import { IFabricEngine } from "../fabric/fabric-engine"
import { IFeature } from "../fabric/features"
import { codeTreeToString, ICodeTree, ISelection, stringToCodeTree } from "../fabric/tensegrity-brick-types"
import { TensegrityFabric } from "../fabric/tensegrity-fabric"
import { saveCSVFiles, saveOBJFile } from "../storage/download"
import { loadStorageIndex, storeCodeTree, storeStorageIndex } from "../storage/local-storage"

import { CommandPanel } from "./command-panel"
import { EditPanel } from "./edit-panel"
import { FabricView } from "./fabric-view"
import { FeaturePanel } from "./feature-panel"

extend({OrbitControls})

const PRETENST_AFTER_CONSTRUCTION = 0

declare global {
    namespace JSX {
        /* eslint-disable @typescript-eslint/interface-name-prefix */
        interface IntrinsicElements {
            orbitControls: ReactThreeFiber.Object3DNode<OrbitControls, typeof OrbitControls>
        }

        /* eslint-enable @typescript-eslint/interface-name-prefix */
    }
}

export function TensegrityView({engine, initialCodeTrees, getFabric, features}: {
    engine: IFabricEngine,
    initialCodeTrees: ICodeTree[],
    getFabric: (name: string, pretenst: number) => TensegrityFabric,
    features: IFeature[],
}): JSX.Element {

    const [pretenst, setPretenst] = useState<number>(0)
    const [autoRotate, setAutoRotate] = useState<boolean>(false)
    const [fastMode, setFastMode] = useState<boolean>(true)
    const [storageIndex, setStorageIndex] = useState<number>(loadStorageIndex)
    const [codeTrees, setCodeTrees] = useState<ICodeTree[]>(initialCodeTrees)
    const [code, setCode] = useState<string | undefined>()
    const [fabric, setFabric] = useState<TensegrityFabric | undefined>()
    const [selection, setSelection] = useState<ISelection>({})

    useEffect(() => {
        if (!fabric) {
            const getCodeFromLocation = () => {
                if (!location.hash) {
                    return undefined
                }
                const locationCode = location.hash.substring(1)
                const exists = codeTrees.map(codeTreeToString).some(treeCode => treeCode === locationCode)
                return exists ? undefined : stringToCodeTree(locationCode)
            }
            const codeFromLocation = getCodeFromLocation()
            if (codeFromLocation) {
                storeCodeTree(codeFromLocation).then(newTrees => setCodeTrees(newTrees))
            }
            const constructionCode = codeFromLocation ? codeFromLocation : codeTrees[storageIndex]
            setCode(codeTreeToString(constructionCode))
            const fetched = getFabric(codeTrees.length.toString(), pretenst)
            fetched.startConstruction(constructionCode, pretenst)
            setFabric(fetched)
        }
    })

    function constructFabric(codeTree: ICodeTree): void {
        setSelection({})
        setPretenst(PRETENST_AFTER_CONSTRUCTION)
        if (fabric) {
            fabric.startConstruction(codeTree, PRETENST_AFTER_CONSTRUCTION)
        } else {
            const fetched = getFabric(storageIndex.toString(), pretenst)
            fetched.startConstruction(codeTree, PRETENST_AFTER_CONSTRUCTION)
            setFabric(fetched)
        }
    }

    const FabricChoice = (): JSX.Element => {
        const [open, setOpen] = useState<boolean>(false)
        const select = (codeTree: ICodeTree, index: number) => {
            setStorageIndex(index)
            storeStorageIndex(index)
            const codeString = codeTreeToString(codeTree)
            location.hash = codeString
            setCode(codeString)
            constructFabric(codeTree)
        }
        return (
            <div id="top-left">
                <ButtonDropdown className="w-100 my-2" isOpen={open} toggle={() => setOpen(!open)}>
                    <DropdownToggle color="primary">
                        <h6>pretenst.com <FaCog/> {code}</h6>
                    </DropdownToggle>
                    <DropdownMenu right={false}>
                        {codeTrees.map((codeTree, index) => (
                            <DropdownItem key={`Buffer${index}`} onClick={() => select(codeTree, index)}>
                                {codeTreeToString(codeTree)}
                            </DropdownItem>
                        ))}
                    </DropdownMenu>
                </ButtonDropdown>
            </div>
        )
    }

    const Download = (): JSX.Element => {
        const onDownloadCSV = () => {
            if (fabric) {
                saveCSVFiles(fabric)
            }
        }
        const onDownloadOBJ = () => {
            if (fabric) {
                saveOBJFile(fabric)
            }
        }
        return (
            <ButtonGroup id="bottom-left">
                <Button color="info" onClick={onDownloadCSV}><FaDownload/>CSV</Button>
                <Button color="info" onClick={onDownloadOBJ}><FaDownload/>OBJ</Button>
            </ButtonGroup>
        )
    }

    return (
        <div id="tensegrity-view" className="the-whole-page">
            {!fabric ? (
                <h1>No fabric</h1>
            ) : (
                <>
                    <Canvas>
                        <FabricView
                            fabric={fabric}
                            pretenst={pretenst}
                            selection={selection}
                            setSelection={setSelection}
                            autoRotate={autoRotate}
                            fastMode={fastMode}
                            showFaces={!selection.selectedStress}
                        />
                    </Canvas>
                    <FabricChoice/>
                    <FeaturePanel
                        featureSet={features}
                        engine={engine}
                        fabric={fabric}
                        pretenst={pretenst}
                        setPretenst={pretenstValue => {
                            fabric.instance.engine.setPretenst(pretenstValue)
                            setPretenst(pretenstValue)
                        }}
                    />
                    <Download/>
                    <EditPanel
                        fabric={fabric}
                        selection={selection}
                        setSelection={setSelection}
                    />
                </>
            )}
            <CommandPanel
                rebuild={() => {
                    setSelection({})
                    if (fabric) {
                        fabric.clearSelection()
                    }
                    constructFabric(codeTrees[storageIndex])
                }}
                fabric={fabric}
                autoRotate={autoRotate}
                setAutoRotate={setAutoRotate}
                fastMode={fastMode}
                setFastMode={setFastMode}
                storageIndex={storageIndex}
            />
        </div>
    )
}
