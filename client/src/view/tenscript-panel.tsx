/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import * as React from "react"
import { useEffect, useState } from "react"
import { FaBiohazard, FaBug, FaHeart, FaHiking, FaPlay, FaRegFolder, FaRegFolderOpen } from "react-icons/all"
import { Button, ButtonDropdown, ButtonGroup, DropdownItem, DropdownMenu, DropdownToggle, Input } from "reactstrap"
import { BehaviorSubject } from "rxjs"

import { addRecentCode, getRecentTenscript, IFabricState } from "../fabric/fabric-state"
import { BOOTSTRAP, codeToTenscript, ITenscript, spaceAfterComma } from "../fabric/tenscript"
import { TensegrityFabric } from "../fabric/tensegrity-fabric"

export function TenscriptPanel({rootTenscript, setRootTenscript, fabric, runTenscript, fabricState$}: {
    rootTenscript: ITenscript,
    setRootTenscript: (tenscript: ITenscript) => void,
    fabric?: TensegrityFabric,
    runTenscript: (tenscript: ITenscript) => void,
    fabricState$: BehaviorSubject<IFabricState>,
}): JSX.Element {

    const [tenscript, setTenscript] = useState<ITenscript>(fabric && !fabric.tenscript.fromUrl ? fabric.tenscript : rootTenscript)
    const [error, setError] = useState("")

    const [recentOpen, setRecentOpen] = useState(false)
    const [recentPrograms, setRecentPrograms] = useState<ITenscript[]>(getRecentTenscript(fabricState$.getValue()))
    const [bootstrapOpen, setBootstrapOpen] = useState(false)

    function addToRecentPrograms(newCode: ITenscript): void {
        const state = addRecentCode(fabricState$.getValue(), newCode)
        setRecentPrograms(getRecentTenscript(state))
        fabricState$.next(state)
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
                    setTenscript={setTenscript}
                    error={error}
                    setError={setError}
                />
                <ButtonGroup className="w-100 my-2">
                    <Button
                        color={error.length > 0 ? "warning" : "success"}
                        disabled={error.length > 0}
                        onClick={() => runTenscript(tenscript)}
                    >
                        {error.length === 0 ? (
                            <span>Run <FaPlay/> Tenscript</span>
                        ) : (
                            <span><FaBug/> {error}</span>
                        )}
                    </Button>
                </ButtonGroup>
                <ButtonGroup className="w-100 my-2">
                    <Button
                        disabled={tenscript.code === rootTenscript.code}
                        onClick={() => {
                            setRootTenscript(tenscript)
                            addToRecentPrograms(tenscript)
                        }}
                    >
                        Save <FaHeart/> to the Browser
                    </Button>
                </ButtonGroup>
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
                        <DropdownItem key={`Recent${index}`} onClick={() => runTenscript(recentCode)}>
                            {recentCode.name}
                        </DropdownItem>
                    ))}</DropdownMenu>
                </ButtonDropdown>
            )}
            <ButtonDropdown
                className="w-100 my-2"
                isOpen={bootstrapOpen}
                toggle={() => setBootstrapOpen(!bootstrapOpen)}
            >
                <DropdownToggle color="info" style={{borderRadius: "1.078em"}}>
                    {bootstrapOpen ? <FaBiohazard/> : <FaHiking/>} Explore some examples
                </DropdownToggle>
                <DropdownMenu>{BOOTSTRAP.map((bootstrapProgram, index) => (
                    <DropdownItem key={`Boot${index}`} onClick={() => runTenscript(bootstrapProgram)}>
                        {bootstrapProgram.name}
                    </DropdownItem>
                ))}</DropdownMenu>
            </ButtonDropdown>
        </div>
    )
}

function CodeArea({tenscript, setTenscript, error, setError}: {
    tenscript: ITenscript,
    setTenscript: (tenscript: ITenscript) => void,
    error: string,
    setError: (message: string) => void,
}): JSX.Element {

    const [tenscriptCode, setTenscriptCode] = useState("")
    useEffect(() => setTenscriptCode(spaceAfterComma(tenscript.code)), [])

    function compile(newCode: string): void {
        const compiled = codeToTenscript(setError, false, newCode)
        if (compiled) {
            setError("")
            setTenscript(compiled)
        }
    }

    function onCodeChange(newCode: string): void {
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
                borderWidth: "2px",
            }}
        >
            <div className="w-100 text-center">
                <span style={{color: "#f2bc30"}} className="float-left m-1">Tenscript:</span>
                <i>"{tenscript.name}"</i>
            </div>
            <Input
                style={{
                    borderRadius: "1em",
                    height: "20em",
                }}
                type="textarea" id="tenscript"
                value={tenscriptCode}
                onChange={changeEvent => onCodeChange(changeEvent.target.value)}
            />
        </div>
    )
}
