/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import * as React from "react"
import { useEffect, useState } from "react"
import { Button } from "reactstrap"

import { codeToTree, ICodeTree, treeToCode } from "../fabric/tensegrity-brick-types"

import { CodeTreeEditor } from "./code-tree-editor"

const FABRIC_CODE_KEY = "FabricCode"

const MAX_LOCAL_CODE_LENGTH = 3000

export interface ICode {
    codeString: string
    codeTree: ICodeTree
}

const FORNOW = "[1,A[2,S[90],C[2,B[2]]],B[2,A[2,S[90],C[2]]],C[2,S[90],B[2,A[2]]]]"
const FORNOW_TREE = codeToTree(error => console.error(error), FORNOW)

export function CodePanel({runCode}: {
    runCode: (code?: ICode) => void,
}): JSX.Element {

    const [code, setCode] = useState<ICode | undefined>()
    const [locationBarPrograms, setLocationBarPrograms] = useState<ICode[]>([])
    const [recentPrograms, setRecentPrograms] = useState<ICode[]>(getRecentCode())
    const [bootstrapPrograms, setBoostrapPrograms] = useState<ICode[]>([])

    useEffect(() => {
        getBootstrapCode().then(setBoostrapPrograms)
        const urlCode = getCodeFromLocationBar()
        setLocationBarPrograms(urlCode)
        if (!FORNOW_TREE) {
            throw new Error()
        }
        setCode({codeString: FORNOW, codeTree: FORNOW_TREE})
        // const codeItem = urlCode[0]
        // if (codeItem && codeItem.codeString === recentPrograms[0].codeString) {
        //     setTimeout(() => setCode(codeItem), 300)
        // }
    }, [])

    useEffect(() => {
    }, [])

    function runTheCode(codeToRun: ICode): void {
        const recent = [codeToRun, ...recentPrograms.filter(program => codeToRun.codeString !== program.codeString)]
        while (totalCodeLength(recent) > MAX_LOCAL_CODE_LENGTH) {
            recent.pop()
        }
        storeRecentCode(recent)
        setRecentPrograms(recent)
        setCode(codeToRun)
        runCode(codeToRun)
    }

    return (
        <div style={{
            padding: "2em",
            backgroundColor: "rgba(0,0,0,1)",
            height: "100%",
            color: "#69aaea",
        }}>
            {code ? (
                <CodeTreeEditor code={code} runCode={runTheCode}/>
            ) : (
                <div>
                    <div style={{width: "100%", textAlign: "center"}}>
                        <h1>Pretenst Programs</h1>
                    </div>
                    <CodeCollection title="Link" codeCollection={locationBarPrograms} setCode={setCode}/>
                    <CodeCollection title="Recent" codeCollection={recentPrograms} setCode={setCode}/>
                    <CodeCollection title="Suggestions" codeCollection={bootstrapPrograms} setCode={setCode}/>
                </div>
            )}
        </div>
    )
}

function CodeCollection({title, codeCollection, setCode}: {
    title: string,
    codeCollection: ICode[],
    setCode: (code: ICode) => void,
}): JSX.Element {
    if (codeCollection.length === 0) {
        return <div/>
    }
    return (
        <div>
            <h3>{title}</h3>
            <div>
                {codeCollection.map(code => <CodeButton key={code.codeString} code={code} setCode={setCode}/>)}
            </div>
        </div>
    )
}

function CodeButton({code, setCode}: { code: ICode, setCode: (code: ICode) => void }): JSX.Element {
    return (
        <Button color="dark" style={{margin: "0.4em"}} onClick={() => setCode(code)}>
            {code.codeString}
        </Button>
    )
}

function totalCodeLength(programs: ICode[]): number {
    return programs.reduce((count, program) => count + program.codeString.length, 0)
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
