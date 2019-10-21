/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import * as React from "react"
import { useEffect, useState } from "react"
import { Button } from "reactstrap"

import { codeTreeToString, ICodeTree, stringToCodeTree } from "../fabric/tensegrity-brick-types"

const FABRIC_CODE_KEY = "FabricCode"
const STORAGE_INDEX_KEY = "StorageIndex"

export interface ICode {
    storageIndex: number
    codeString: string
    codeTree: ICodeTree
}

export function CodePanel({code, setCode}: {
    code?: ICode,
    setCode: (code?: ICode) => void,
}): JSX.Element {

    const [codeTrees, setCodeTrees] = useState<ICodeTree[]>(getLocalCodeTrees())

    useEffect(() => {
        loadCodeTrees().then(loadedCodeTrees => {

            function getCodeFromLocationBar(): ICode | undefined {
                const codeString = location.hash.substring(1)
                const codeTree = stringToCodeTree(message => console.error(message), codeString)
                if (!codeTree) {
                    return undefined
                }
                const storageIndex = !codeTree ? -1 : codeTrees.map(codeTreeToString).indexOf(codeString)
                return {storageIndex, codeString, codeTree}
            }

            setCodeTrees(loadedCodeTrees)
            if (!code) {
                const locationBarCode = getCodeFromLocationBar()
                if (locationBarCode && locationBarCode.storageIndex < 0) {
                    storeCodeTree(locationBarCode.codeTree).then(({trees, index}) => {
                        setCodeTrees(trees)
                        setCode({...locationBarCode, storageIndex: index})
                    })
                } else {
                    const storageIndex = loadStorageIndex()
                    const codeTree = loadedCodeTrees[storageIndex]
                    const codeString = codeTreeToString(codeTree)
                    setCode({storageIndex, codeString, codeTree})
                }
            }
        })
    }, [])

    return (
        <div style={{padding: "2em", backgroundColor: "rgba(0,0,0,1)", height: "100%"}}>
            <div style={{width: "100%", textAlign: "center", color: "#69aaea"}}>
                <h1>Pretenst Construction Code</h1>
            </div>
            <div>
                {codeTrees.map((codeTree, storageIndex) => {
                    const codeString = codeTreeToString(codeTree)
                    const stored: ICode = {storageIndex, codeTree, codeString}
                    return (
                        <Button key={`Buffer${stored.storageIndex}`}
                                color="dark"
                                style={{margin: "0.4em"}}
                                onClick={() => setCode(stored)}>
                            {codeTreeToString(codeTree)}
                        </Button>
                    )
                })}
            </div>
        </div>
    )
}

async function getBootstrapCodeTrees(): Promise<ICodeTree[]> {
    const response = await fetch("/bootstrap.json")
    const body = await response.json()
    if (!body) {
        return [{_: 0}, {_: 9}]
    }
    return body.pretenst
}

function getLocalCodeTrees(): ICodeTree[] {
    const localFabricCode = localStorage.getItem(FABRIC_CODE_KEY)
    return localFabricCode ? JSON.parse(localFabricCode) : []
}

async function loadCodeTrees(): Promise<ICodeTree[]> {
    const bootstrapTrees = await getBootstrapCodeTrees()
    const localTrees = getLocalCodeTrees()
    return [...bootstrapTrees, ...localTrees]
}

async function storeCodeTree(codeTree: ICodeTree): Promise<{ trees: ICodeTree[], index: number }> {
    const code = codeTreeToString(codeTree)
    const trees = await loadCodeTrees()
    const index = trees.map(codeTreeToString).findIndex(localCode => localCode === code)
    if (index >= 0) {
        storeStorageIndex(index)
        return {trees, index}
    }
    trees.push(codeTree)
    localStorage.setItem(FABRIC_CODE_KEY, JSON.stringify(trees))
    storeStorageIndex(trees.length + 1)
    return {trees, index: trees.length - 1}
}

function loadStorageIndex(): number {
    const item = localStorage.getItem(STORAGE_INDEX_KEY)
    if (!item) {
        return 0
    }
    return parseInt(item, 10)
}

function storeStorageIndex(index: number): void {
    localStorage.setItem(STORAGE_INDEX_KEY, index.toString(10))
}

