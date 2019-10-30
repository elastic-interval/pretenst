/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import * as React from "react"
import { useEffect, useState } from "react"
import { Badge, Button, ButtonGroup } from "reactstrap"

import { codeToTree, ICodeTree, treeToCode } from "../fabric/tensegrity-brick-types"

const FABRIC_CODE_KEY = "FabricCode"

const MAX_RECENT = 12

export interface ICode {
    codeString: string
    codeTree: ICodeTree
}

export function CodePanel({setCode, bootstrapCode}: {
    bootstrapCode: ICode[],
    setCode: (code?: ICode) => void,
}): JSX.Element {

    const [locationBarPrograms, setLocationBarPrograms] = useState<ICode[]>([])
    const [recentPrograms, setRecentPrograms] = useState<ICode[]>(getRecentCode())

    useEffect(() => {
        const urlCode = getCodeFromLocationBar()
        setLocationBarPrograms(urlCode)
    }, [])

    function runTheCode(codeToRun: ICode): void {
        const recent = [codeToRun, ...recentPrograms.filter(program => codeToRun.codeString !== program.codeString)]
        while (recent.length > MAX_RECENT) {
            recent.pop()
        }
        storeRecentCode(recent)
        setRecentPrograms(recent)
        setCode(codeToRun)
    }

    return (
        <div style={{
            padding: "2em",
            backgroundColor: "rgba(0,0,0,1)",
            height: "100%",
            color: "#69aaea",
        }}>
            <div>
                <CodeCollection title="From URL Link" codeCollection={locationBarPrograms}
                                setCode={runTheCode}/>
                <CodeCollection title="Recent" numbered={true} codeCollection={recentPrograms}
                                setCode={runTheCode}/>
                <CodeCollection title="Suggestions" small={true} codeCollection={bootstrapCode}
                                setCode={runTheCode}/>
            </div>
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
                            {index === undefined ? undefined :
                                <Badge color="info" size="sm">{index}</Badge>} {code.codeString}
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

export function getCodeFromLocationBar(): ICode[] {
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

function storeRecentCode(recent: ICode[]): void {
    localStorage.setItem(FABRIC_CODE_KEY, JSON.stringify(recent.map(program => program.codeTree)))
}

export function getRecentCode(): ICode[] {
    const recentCode = localStorage.getItem(FABRIC_CODE_KEY)
    const codeTrees: ICodeTree[] = recentCode ? JSON.parse(recentCode) : []
    return codeTrees.map(codeTree => ({codeString: treeToCode(codeTree), codeTree}))
}
