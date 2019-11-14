/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import * as React from "react"
import { useState } from "react"
import { FaRegFolder, FaRegFolderOpen, FaRunning } from "react-icons/all"
import { Button, ButtonDropdown, DropdownItem, DropdownMenu, DropdownToggle, Input } from "reactstrap"

import { codeToTenscript, ITenscript, ITenscriptTree, spaceAfterComma, treeToTenscript } from "../fabric/tenscript"

const FABRIC_CODE_KEY = "FabricCode"

const MAX_RECENT = 10

export function TenscriptPanel({bootstrap, tenscript, setTenscript}: {
    bootstrap: ITenscript[],
    tenscript?: ITenscript,
    setTenscript: (grow: boolean, tenscript?: ITenscript) => void,
}): JSX.Element {

    const [runnable, setRunnable] = useState(tenscript)
    const [recentOpen, setRecentOpen] = useState(false)
    const [bootstrapOpen, setBootstrapOpen] = useState(false)
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

    function adoptTenscript(grow: boolean, newScript: ITenscript): void {
        setTenscript(grow, newScript)
        addToRecentPrograms(newScript)
    }

    function onRun(): void {
        if (!runnable) {
            throw new Error("No tenscript")
        }
        adoptTenscript(true, runnable)
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
                    tenscript={tenscript}
                    setRunnable={setRunnable}
                />
                <div>
                    <Button
                        className="w-100 my-2"
                        color={runnable ? "success" : "secondary"}
                        disabled={!runnable}
                        onClick={onRun}
                    >
                        <FaRunning/> Run
                    </Button>
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
                        <DropdownItem key={`Recent${index}`} onClick={() => adoptTenscript(false, recentCode)}>
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
                <DropdownMenu>{bootstrap.map((bootstrapProgram, index) => (
                    <DropdownItem key={`Boot${index}`} onClick={() => adoptTenscript(false, bootstrapProgram)}>
                        {spaceAfterComma(bootstrapProgram.code)}
                    </DropdownItem>
                ))}</DropdownMenu>
            </ButtonDropdown>
        </div>
    )
}

function CodeArea({tenscript, setRunnable}: {
    tenscript?: ITenscript,
    setRunnable: (tenscript?: ITenscript) => void,
}): JSX.Element {

    const [tenscriptCode, setTenscriptCode] = useState(tenscript ? tenscript.code : "")

    function compile(newCode: string): void {
        console.log("compiling", newCode)
        setRunnable(codeToTenscript(message => console.error(message), newCode))
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
                borderRadius: "1em",
                borderColor: "black",
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
        </div>
    )
}

export function getCodeFromUrl(): ITenscript | undefined {
    const codeString = location.hash.substring(1)
    try {
        return codeToTenscript(message => console.error(message), codeString)
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
    return codeTrees.map(treeToTenscript)
}
