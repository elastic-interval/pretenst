/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import * as React from "react"
import { useState } from "react"
import { FaArrowRight, FaEdit, FaList, FaRunning } from "react-icons/all"
import { Badge, Button, ButtonGroup } from "reactstrap"

import {
    codeToTenscriptTree,
    codeTreeToTenscript,
    ITenscript,
    ITenscriptTree,
    spaceAfterComma,
} from "../fabric/tenscript"

import { TenscriptEditor } from "./tenscript-editor"

const FABRIC_CODE_KEY = "FabricCode"

const MAX_RECENT = 12

export function TenscriptPanel({bootstrapCode, tenscript, setTenscript, grow}: {
    bootstrapCode: ITenscript[],
    tenscript?: ITenscript,
    setTenscript: (tenscript?: ITenscript) => void,
    grow: () => void,
}): JSX.Element {

    const [editMode, setEditMode] = useState(false)
    const [recentPrograms, setRecentPrograms] = useState<ITenscript[]>(getRecentCode())

    function addToRecentPrograms(newCode: ITenscript): void {
        const withoutNewCode = recentPrograms.filter(program => newCode.code !== program.code)
        if (withoutNewCode.length !== recentPrograms.length) { // it was there already
            return
        }
        const recent = [newCode, ...withoutNewCode]
        while (recent.length > MAX_RECENT) {
            recent.pop()
        }
        storeRecentCode(recent)
        setRecentPrograms(recent)
    }

    function adoptAndGrow(newScript: ITenscript): void {
        setTenscript(newScript)
        addToRecentPrograms(newScript)
        grow()
    }

    function ExistingCode(): JSX.Element {
        return (
            <div>
                {recentPrograms.length === 0 ? undefined : (
                    <div className="m-4">
                        <h6>Recent</h6>
                        <ButtonGroup vertical={true} style={{width: "100%"}}>
                            {recentPrograms.map((recentCode, index) => (
                                <Button key={index} color="dark" style={{
                                    margin: "0.1em",
                                    fontSize: "small",
                                    textAlign: "left",
                                }} onClick={() => setTenscript(recentCode)}>
                                    {index === undefined ? undefined : <Badge color="info" size="sm">{index}</Badge>}
                                    {spaceAfterComma(recentCode.code)}
                                </Button>
                            ))}
                        </ButtonGroup>
                    </div>
                )}
                <div className="m-4">
                    <h6>Suggestions</h6>
                    {bootstrapCode.map((bootstrapProgram, index) => (
                        <Button key={index} color="dark" style={{
                            margin: "0.3em",
                            fontSize: "small",
                        }} onClick={() => setTenscript(bootstrapProgram)}>
                            {spaceAfterComma(bootstrapProgram.code)}
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
                {tenscript ? (
                    <div>
                        <div>
                            <div style={{
                                height: "10em",
                                backgroundColor: "white",
                                color: "black",
                                borderRadius: "1em",
                                borderColor: "black",
                                borderWidth: "1px",
                                width: "100%",
                                padding: "1em",
                                overflowX: "scroll",
                            }}>
                                {spaceAfterComma(tenscript.code)}
                            </div>
                            <div className="w-100 my-3">
                                <ButtonGroup>
                                    <Button color={editMode ? "success" : "secondary"}
                                            disabled={!tenscript || editMode}
                                            onClick={() => setEditMode(true)}
                                    >
                                        <FaEdit/>
                                    </Button>
                                    <Button color={!editMode ? "success" : "secondary"}
                                            disabled={!tenscript || !editMode}
                                            onClick={() => setEditMode(false)}
                                    >
                                        <FaList/>
                                    </Button>
                                </ButtonGroup>
                                <Button className="float-right"
                                        disabled={!tenscript}
                                        onClick={() => grow()}
                                >
                                    <FaRunning/><FaArrowRight/>
                                </Button>
                            </div>
                        </div>
                        {!editMode ? <ExistingCode/> : (
                            <TenscriptEditor
                                tenscript={tenscript}
                                growTenscript={adoptAndGrow}
                                leaveEditMode={() => setEditMode(false)}
                            />
                        )}
                    </div>
                ) : (
                    <ExistingCode/>
                )}
            </div>
        </div>
    )
}

export function getCodeFromUrl(): ITenscript | undefined {
    const codeString = location.hash.substring(1)
    try {
        const codeTree = codeToTenscriptTree(message => console.error(message), codeString)
        if (codeTree) {
            return {code: codeString, tree: codeTree}
        }
    } catch (e) {
        console.error("Code error", e)
    }
    return undefined
}

function storeRecentCode(recent: ITenscript[]): void {
    localStorage.setItem(FABRIC_CODE_KEY, JSON.stringify(recent.map(program => program.tree)))
}

export function getRecentCode(): ITenscript[] {
    const recentCode = localStorage.getItem(FABRIC_CODE_KEY)
    const codeTrees: ITenscriptTree[] = recentCode ? JSON.parse(recentCode) : []
    return codeTrees.map(codeTreeToTenscript)
}
