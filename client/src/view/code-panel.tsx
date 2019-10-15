/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import * as React from "react"
import { useEffect, useState } from "react"
import { Button } from "reactstrap"

import { codeTreeToString, ICodeTree, stringToCodeTree } from "../fabric/tensegrity-brick-types"
import { getLocalCodeTrees, loadCodeTrees, loadStorageIndex, storeCodeTree } from "../storage/local-storage"

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
