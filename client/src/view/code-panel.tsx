/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import * as React from "react"
import { useEffect, useState } from "react"
import { FaEdit } from "react-icons/all"
import { Badge, Button, ButtonGroup } from "reactstrap"

import { codeTreeToTenscript, ICode, ICodeTree, tenscriptToCodeTree } from "../fabric/tenscript"

import { CodeTreeEditor } from "./code-tree-editor"

const FABRIC_CODE_KEY = "FabricCode"

const MAX_RECENT = 12

export function CodePanel({setCode, bootstrapCode}: {
    bootstrapCode: ICode[],
    setCode: (code?: ICode) => void,
}): JSX.Element {

    const [editMode, setEditMode] = useState(false)
    const [urlProgram, setUrlProgram] = useState<ICode | undefined>()
    const [recentPrograms, setRecentPrograms] = useState<ICode[]>(getRecentCode())

    useEffect(() => setUrlProgram(getCodeFromUrl()), [])

    function runTheCode(codeToRun: ICode): void {
        const recent = [codeToRun, ...recentPrograms.filter(program => codeToRun.codeString !== program.codeString)]
        while (recent.length > MAX_RECENT) {
            recent.pop()
        }
        storeRecentCode(recent)
        setRecentPrograms(recent)
        setCode(codeToRun)
    }

    function ExistingCode(): JSX.Element {
        return (
            <div>
                {recentPrograms.length === 0 ? undefined : (
                    <div className="m-4">
                        <h6>Recent</h6>
                        <ButtonGroup vertical={true} style={{width: "100%"}}>
                            {recentPrograms.map((code, index) => (
                                <Button key={index} color="dark" style={{
                                    margin: "0.1em",
                                    fontSize: "small",
                                    textAlign: "left",
                                }} onClick={() => runTheCode(code)}>
                                    {index === undefined ? undefined :
                                        <Badge color="info" size="sm">{index}</Badge>} {code.codeString}
                                </Button>
                            ))}
                        </ButtonGroup>
                    </div>
                )}
                <div className="m-4">
                    <h6>Suggestions</h6>
                    {bootstrapCode.map((code, index) => (
                        <Button key={index} color="dark" style={{
                            margin: "0.3em",
                            fontSize: "small",
                        }} onClick={() => runTheCode(code)}>
                            {code.codeString}
                        </Button>
                    ))}
                </div>
            </div>
        )
    }

    return (
        <div style={{
            padding: "2em",
            backgroundColor: "rgba(0,0,0,1)",
            height: "100%",
            color: "#69aaea",
        }}>
            <div>
                {urlProgram ? (
                    <div>
                        <div className="d-flex">
                            <Button disabled={!urlProgram} onClick={() => setEditMode(!editMode)}>
                                <FaEdit/>
                            </Button>
                            <div style={{
                                backgroundColor: "white",
                                color: "black",
                                borderRadius: "1em",
                                borderColor: "black",
                                borderWidth: "1px",
                                width: "33em",
                                padding: "1em",
                                overflowX: "scroll",
                            }}>
                                {urlProgram.codeString.replace(/[,]/g,", ")}
                            </div>
                        </div>
                        {editMode ? <CodeTreeEditor code={urlProgram} setCode={runTheCode}/> : <ExistingCode/>}
                    </div>
                ) : (
                    <ExistingCode/>
                )}
            </div>
        </div>
    )
}

export function getCodeFromUrl(): ICode | undefined {
    const codeString = location.hash.substring(1)
    try {
        const codeTree = tenscriptToCodeTree(message => console.error(message), codeString)
        if (codeTree) {
            return {codeString, codeTree}
        }
    } catch (e) {
        console.error("Code error", e)
    }
    return undefined
}

function storeRecentCode(recent: ICode[]): void {
    localStorage.setItem(FABRIC_CODE_KEY, JSON.stringify(recent.map(program => program.codeTree)))
}

export function getRecentCode(): ICode[] {
    const recentCode = localStorage.getItem(FABRIC_CODE_KEY)
    const codeTrees: ICodeTree[] = recentCode ? JSON.parse(recentCode) : []
    return codeTrees.map(codeTree => ({codeString: codeTreeToTenscript(codeTree), codeTree}))
}
