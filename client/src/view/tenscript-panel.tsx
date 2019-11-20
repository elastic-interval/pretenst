/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import * as React from "react"
import { useState } from "react"
import { FaHeart, FaPlay, FaRegFolder, FaRegFolderOpen, FaThumbsUp } from "react-icons/all"
import {
    Alert,
    Button,
    ButtonDropdown,
    ButtonGroup,
    DropdownItem,
    DropdownMenu,
    DropdownToggle,
    Input,
} from "reactstrap"

import {
    BOOTSTRAP,
    codeToTenscript,
    ITenscript,
    ITenscriptTree,
    spaceAfterComma,
    treeToTenscript,
} from "../fabric/tenscript"

const FABRIC_CODE_KEY = "FabricCode"

const MAX_RECENT = 24

export function TenscriptPanel({initialTenscript, setInitialTenscript, runTenscript}: {
    initialTenscript: ITenscript,
    setInitialTenscript: (tenscript: ITenscript) => void,
    runTenscript: (tenscript: ITenscript) => void,
}): JSX.Element {

    const [currentTenscript, setCurrentTenscript] = useState<ITenscript>(initialTenscript)
    const [error, setError] = useState("")
    const [recentOpen, setRecentOpen] = useState(false)
    const [bootstrapOpen, setBootstrapOpen] = useState(false)
    const [recentPrograms, setRecentPrograms] = useState<ITenscript[]>(getRecentCode())

    function addToRecentPrograms(newCode: ITenscript): void {
        const withoutNewCode = recentPrograms.filter(program => newCode.code !== program.code)
        const recent = [newCode, ...withoutNewCode]
        while (recent.length > MAX_RECENT) {
            recent.pop()
        }
        storeRecentCode(recent)
        setRecentPrograms(recent)
    }

    return (
        <div id="tenscript-panel" style={{
            flexDirection: "column",
            position: "relative",
            padding: "2em",
            backgroundColor: "rgba(0,0,0,1)",
            height: "100%",
            color: "#69aaea",
        }}>
            <div id="code-and-run" style={{
                flexDirection: "column",
                height: "available",
            }}>
                <CodeArea
                    initialTenscript={initialTenscript}
                    setCurrentTenscript={setCurrentTenscript}
                    error={error}
                    setError={setError}
                />
                <div>
                    <ButtonGroup className="w-100">
                        <Button
                            color={error.length > 0 ? "secondary" : "success"}
                            disabled={error.length > 0}
                            className="w-100 my-2"
                            onClick={() => runTenscript(currentTenscript)}
                        >
                            <FaPlay/> Run
                        </Button>
                        <Button
                            className="w-100 my-2"
                            disabled={currentTenscript.code === initialTenscript.code}
                            onClick={() => {
                                setInitialTenscript(currentTenscript)
                                addToRecentPrograms(currentTenscript)
                            }}
                        >
                            <FaHeart/> Save
                        </Button>
                    </ButtonGroup>
                </div>
            </div>
            {recentPrograms.length === 0 ? undefined : (
                <ButtonDropdown
                    className="w-100 my-2"
                    isOpen={recentOpen}
                    toggle={() => setRecentOpen(!recentOpen)}
                >
                    <DropdownToggle style={{borderRadius: "1.078em"}}>
                        {recentOpen ? <FaRegFolderOpen/> : <FaRegFolder/>} Recent
                    </DropdownToggle>
                    <DropdownMenu>{recentPrograms.map((recentCode, index) => (
                        <DropdownItem key={`Recent${index}`} onClick={() => setCurrentTenscript(recentCode)}>
                            {spaceAfterComma(recentCode.code)}
                        </DropdownItem>
                    ))}</DropdownMenu>
                </ButtonDropdown>
            )}
            <ButtonDropdown
                className="w-100 my-2"
                isOpen={bootstrapOpen}
                toggle={() => setBootstrapOpen(!bootstrapOpen)}
            >
                <DropdownToggle style={{borderRadius: "1.078em"}}>
                    {bootstrapOpen ? <FaRegFolderOpen/> : <FaRegFolder/>} Examples
                </DropdownToggle>
                <DropdownMenu>{BOOTSTRAP.map((bootstrapProgram, index) => (
                    <DropdownItem key={`Boot${index}`} onClick={() => setCurrentTenscript(bootstrapProgram)}>
                        {spaceAfterComma(bootstrapProgram.code)}
                    </DropdownItem>
                ))}</DropdownMenu>
            </ButtonDropdown>
        </div>
    )
}

function CodeArea({initialTenscript, setCurrentTenscript, error, setError}: {
    initialTenscript: ITenscript,
    setCurrentTenscript: (tenscript: ITenscript) => void,
    error: string,
    setError: (message: string) => void,
}): JSX.Element {

    const [tenscriptCode, setTenscriptCode] = useState(initialTenscript.code)

    function compile(newCode: string): void {
        console.log("compiling", newCode)
        const tenscript = codeToTenscript(setError, false, newCode)
        if (tenscript) {
            setError("")
            setCurrentTenscript(tenscript)
        }
    }

    function onCodeChange(newCode: string): void {
        console.log("code change", newCode)
        setTenscriptCode(newCode)
        compile(newCode)
    }

    return (
        <div
            className="my-2 p-2 w-100"
            style={{
                backgroundColor: "#757575",
                color: "#ffffff",
                borderStyle: "solid",
                borderRadius: "1em",
                borderColor: error.length === 0 ? "black" : "#f0ad4e",
                borderWidth: "1px",
            }}
        >
            <div className="w-100 text-center">
                <h6>Tenscript Construction Code</h6>
            </div>
            <Input
                style={{
                    borderRadius: "1em",
                    height: "20em",
                }}
                type="textarea" id="tenscript"
                defaultValue={tenscriptCode}
                onChange={changeEvent => onCodeChange(changeEvent.target.value)}
            />
            <div className="text-center">
                <Alert color={error.length === 0 ? "secondary" : "warning"}>
                    {error.length === 0 ? <FaThumbsUp/> : <span>{error}</span>}
                </Alert>
            </div>
        </div>
    )
}

export function getCodeFromUrl(): ITenscript | undefined {
    const codeString = location.hash.substring(1)
    try {
        return codeToTenscript(message => console.error(message), true, codeString)
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
    return codeTrees.map(codeTree => treeToTenscript(codeTree, false))
}
