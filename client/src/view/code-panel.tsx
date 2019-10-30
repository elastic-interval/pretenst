/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import * as React from "react"
import { useEffect, useState } from "react"
import { Badge, Button, ButtonGroup } from "reactstrap"

import { codeToTree, ICodeTree, treeToCode } from "../fabric/tensegrity-brick-types"

import { CodeTreeEditor } from "./code-tree-editor"

const FABRIC_CODE_KEY = "FabricCode"

const MAX_RECENT = 12

export interface ICode {
    codeString: string
    codeTree: ICodeTree
}

const FORNOW = "[1,A[2,S[90],C[2,B[2]]],B[2,A[2,S[90],C[2]]],C[2,S[90],B[2,A[2]]]]"
const FORNOW_TREE = codeToTree(error => console.error(error), FORNOW)

export function CodePanel({code, setCode, runCode}: {
    code?: ICode,
    setCode: (code?: ICode) => void,
    runCode: () => void,
}): JSX.Element {

    const [locationBarPrograms, setLocationBarPrograms] = useState<ICode[]>([])
    const [recentPrograms, setRecentPrograms] = useState<ICode[]>(getRecentCode())
    const [bootstrapPrograms, setBootstrapPrograms] = useState<ICode[]>([])

    useEffect(() => {
        getBootstrapCode().then(setBootstrapPrograms)
        const urlCode = getCodeFromLocationBar()
        setLocationBarPrograms(urlCode)
        if (!FORNOW_TREE) {
            throw new Error()
        }
        // setCode({codeString: FORNOW, codeTree: FORNOW_TREE})
        // const codeItem = urlCode[0]
        // if (codeItem && codeItem.codeString === recentPrograms[0].codeString) {
        //     setTimeout(() => setCode(codeItem), 300)
        // }
    }, [])

    function runTheCode(codeToRun: ICode): void {
        const recent = [codeToRun, ...recentPrograms.filter(program => codeToRun.codeString !== program.codeString)]
        while (recent.length > MAX_RECENT) {
            recent.pop()
        }
        storeRecentCode(recent)
        setRecentPrograms(recent)
        setCode(codeToRun)
        runCode()
    }

    return (
        <div style={{
            padding: "2em",
            backgroundColor: "rgba(0,0,0,1)",
            height: "100%",
            color: "#69aaea",
        }}>
            {code ? (
                <CodeTreeEditor code={code} setCode={setCode} runCode={runTheCode}/>
            ) : (
                <div>
                    <CodeCollection title="From URL Link" codeCollection={locationBarPrograms} setCode={setCode}/>
                    <CodeCollection title="Recent" numbered={true} codeCollection={recentPrograms} setCode={setCode}/>
                    <CodeCollection title="Suggestions" small={true} codeCollection={bootstrapPrograms} setCode={setCode}/>
                </div>
            )}
        </div>
    )
}

function CodeCollection({title, numbered, small, codeCollection, setCode}: {
    title: string,
    numbered?: boolean,
    small?: boolean,
    codeCollection: ICode[],
    setCode: (code: ICode) => void,
}): JSX.Element {
    if (codeCollection.length === 0) {
        return <div/>
    }
    return (
        <div>
            <h6>{title}</h6>
            {numbered ? (
                <ButtonGroup vertical={true} style={{
                    width: "100%",
                }}>
                    {codeCollection.map((code, index) => (
                        <Button key={index} color="dark" style={{
                            margin: "0.1em",
                            fontSize: "small",
                            textAlign: "left",
                        }} onClick={() => setCode(code)}>
                            {index === undefined ? undefined : <Badge size="sm">{index}</Badge>} {code.codeString}
                        </Button>
                    ))}
                </ButtonGroup>
            ) : (
                codeCollection.map((code, index) => (
                    <Button key={index} color="dark" style={{
                        margin: "0.3em",
                        fontSize: small ? "xx-small" : "normal",
                    }} onClick={() => setCode(code)}>
                        {code.codeString}
                    </Button>
                ))
            )}
        </div>
    )
}

function getCodeFromLocationBar(): ICode[] {
    const codeString = location.hash.substring(1)
    try {
        const codeTree = codeToTree(message => console.error(message), codeString)
        if (codeTree) {
            return [{codeString, codeTree}]
        }
    } catch (e) {
        console.error("Code error", e)
    }
    return []
}

async function getBootstrapCode(): Promise<ICode[]> {
    const response = await fetch("/bootstrap.json")
    const body = await response.json()
    if (!body) {
        return [{codeString: "0", codeTree: {_: 0}}]
    }
    const pretenst: ICodeTree[] = body.pretenst
    return pretenst.map(codeTree => ({codeTree, codeString: treeToCode(codeTree)}))
}

function storeRecentCode(recent: ICode[]): void {
    localStorage.setItem(FABRIC_CODE_KEY, JSON.stringify(recent.map(program => program.codeTree)))
}

function getRecentCode(): ICode[] {
    const recentCode = localStorage.getItem(FABRIC_CODE_KEY)
    const codeTrees: ICodeTree[] = recentCode ? JSON.parse(recentCode) : []
    return codeTrees.map(codeTree => ({codeString: treeToCode(codeTree), codeTree}))
}
