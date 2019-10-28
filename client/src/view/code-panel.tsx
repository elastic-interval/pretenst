/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import * as React from "react"
import { useEffect, useState } from "react"
import { Button } from "reactstrap"

import { codeTreeToString, ICodeTree, stringToCodeTree } from "../fabric/tensegrity-brick-types"

const FABRIC_CODE_KEY = "FabricCode"
const MAX_LOCAL_CODE_LENGTH = 3000

export interface ICode {
    codeString: string
    codeTree: ICodeTree
}

export function CodePanel({setCode}: {
    setCode: (code?: ICode) => void,
}): JSX.Element {

    const [locationBarPrograms, setLocationBarPrograms] = useState<ICode[]>([])
    const [recentPrograms, setRecentPrograms] = useState<ICode[]>(getRecentCode())
    const [bootstrapPrograms, setBoostrapPrograms] = useState<ICode[]>([])

    useEffect(() => {
        getBootstrapCode().then(setBoostrapPrograms)
        const urlCode = getCodeFromLocationBar()
        setLocationBarPrograms(urlCode)
        const code = urlCode[0]
        if (code && code.codeString === recentPrograms[0].codeString) {
            setTimeout(() => setCode(code), 300)
        }
    }, [])

    function runCode(code: ICode): void {
        const recent = [code, ...recentPrograms.filter(program => code.codeString !== program.codeString)]
        while (totalCodeLength(recent) > MAX_LOCAL_CODE_LENGTH) {
            recent.pop()
        }
        storeRecentCode(recent)
        setRecentPrograms(recent)
        setCode(code)
    }

    return (
        <div style={{padding: "2em", backgroundColor: "rgba(0,0,0,1)", height: "100%", color: "#69aaea"}}>
            <div style={{width: "100%", textAlign: "center"}}>
                <h1>Pretenst Programs</h1>
            </div>
            <CodeCollection title="Link" codeCollection={locationBarPrograms} runCode={runCode}/>
            <CodeCollection title="Recent" codeCollection={recentPrograms} runCode={runCode}/>
            <CodeCollection title="Suggestions" codeCollection={bootstrapPrograms} runCode={runCode}/>
        </div>
    )
}

function CodeCollection({title, codeCollection, runCode}: {
    title: string,
    codeCollection: ICode[],
    runCode: (code: ICode) => void,
}): JSX.Element {
    if (codeCollection.length === 0) {
        return <div/>
    }
    return (
        <div>
            <h3>{title}</h3>
            <div>
                {codeCollection.map(code => <CodeButton key={code.codeString} code={code} runCode={runCode}/>)}
            </div>
        </div>
    )
}

function CodeButton({code, runCode}: { code: ICode, runCode: (code: ICode) => void }): JSX.Element {
    return (
        <Button color="dark" style={{margin: "0.4em"}} onClick={() => runCode(code)}>
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
        const codeTree = stringToCodeTree(message => console.error(message), codeString)
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
    return pretenst.map(codeTree => ({codeTree, codeString: codeTreeToString(codeTree)}))
}

function storeRecentCode(recent: ICode[]): void {
    localStorage.setItem(FABRIC_CODE_KEY, JSON.stringify(recent.map(program => program.codeTree)))
}

function getRecentCode(): ICode[] {
    const recentCode = localStorage.getItem(FABRIC_CODE_KEY)
    const codeTrees: ICodeTree[] = recentCode ? JSON.parse(recentCode) : []
    return codeTrees.map(codeTree => ({codeString: codeTreeToString(codeTree), codeTree}))
}
