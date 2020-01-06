/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import * as React from "react"
import { useEffect, useState } from "react"
import { FaBox, FaBug, FaHeart, FaHiking, FaPlay, FaRegFolder, FaRegFolderOpen, FaSeedling } from "react-icons/all"
import { Button, ButtonDropdown, ButtonGroup, DropdownItem, DropdownMenu, DropdownToggle, Input } from "reactstrap"
import { BehaviorSubject } from "rxjs"

import { BOOTSTRAP, codeToTenscript, ITenscript } from "../fabric/tenscript"
import { TensegrityFabric } from "../fabric/tensegrity-fabric"
import { addRecentCode, getRecentTenscript, IStoredState } from "../storage/stored-state"

import { Grouping } from "./control-tabs"

export function TenscriptTab({rootTenscript, setRootTenscript, fabric, runTenscript, storedState$}: {
    rootTenscript: ITenscript,
    setRootTenscript: (tenscript: ITenscript) => void,
    fabric?: TensegrityFabric,
    runTenscript: (tenscript: ITenscript) => void,
    storedState$: BehaviorSubject<IStoredState>,
}): JSX.Element {

    const [tenscript, setTenscript] = useState<ITenscript>(fabric && !fabric.tenscript.fromUrl ? fabric.tenscript : rootTenscript)
    const [error, setError] = useState("")

    const [recentOpen, setRecentOpen] = useState(false)
    const [recentPrograms, setRecentPrograms] = useState<ITenscript[]>(getRecentTenscript(storedState$.getValue()))
    const [bootstrapOpen, setBootstrapOpen] = useState(false)

    function addToRecentPrograms(newCode: ITenscript): void {
        const state = addRecentCode(storedState$.getValue(), newCode)
        setRecentPrograms(getRecentTenscript(state))
        storedState$.next(state)
    }

    return (
        <div id="tenscript-panel" style={{
            flexDirection: "column",
            position: "relative",
            backgroundColor: "rgba(0,0,0,1)",
            height: "100%",
        }}>
            <Grouping>
                <h6 className="w-100 text-center"><FaSeedling/> Tenscript</h6>
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
                                <span>Execute <FaPlay/> tenscript</span>
                            ) : (
                                <span><FaBug/> {error}</span>
                            )}
                        </Button>
                    </ButtonGroup>
                </div>
            </Grouping>
            <Grouping>
                <h6 className="w-100 text-center"><FaBox/> Storage</h6>
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
                <ButtonGroup className="w-100 my-2">
                    <Button
                        disabled={tenscript.code === rootTenscript.code}
                        onClick={() => {
                            setRootTenscript(tenscript)
                            addToRecentPrograms(tenscript)
                        }}
                    >
                        Save <FaHeart/> for later
                    </Button>
                </ButtonGroup>
                <ButtonDropdown
                    className="w-100 my-2"
                    isOpen={bootstrapOpen}
                    toggle={() => setBootstrapOpen(!bootstrapOpen)}
                >
                    <DropdownToggle color="info" style={{borderRadius: "1.078em"}}>
                        Explore <FaHiking/> existing designs
                    </DropdownToggle>
                    <DropdownMenu>{BOOTSTRAP.map((bootstrapProgram, index) => (
                        <DropdownItem key={`Boot${index}`} onClick={() => runTenscript(bootstrapProgram)}>
                            {bootstrapProgram.name}
                        </DropdownItem>
                    ))}</DropdownMenu>
                </ButtonDropdown>
            </Grouping>
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
    useEffect(() => setTenscriptCode(tenscript.code), [])

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
            <h6 className="w-100 text-center">
                <i>"{tenscript.name}"</i>
            </h6>
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
