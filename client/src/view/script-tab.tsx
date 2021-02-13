/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import * as React from "react"
import { useEffect, useState } from "react"
import { FaBug, FaCanadianMapleLeaf, FaHiking, FaSeedling } from "react-icons/all"
import { Button, ButtonDropdown, ButtonGroup, DropdownItem, DropdownMenu, DropdownToggle, Input } from "reactstrap"
import { BehaviorSubject } from "rxjs"

import { BOOTSTRAP } from "../fabric/bootstrap"
import { compileTenscript, ITenscript } from "../fabric/tenscript"
import { Tensegrity } from "../fabric/tensegrity"
import { Spin, SPINS } from "../fabric/tensegrity-types"
import { IStoredState } from "../storage/stored-state"

import { Grouping } from "./control-tabs"

export function ScriptTab({rootTenscript, tensegrity, runTenscript, storedState$}: {
    rootTenscript: ITenscript,
    tensegrity?: Tensegrity,
    runTenscript: (tenscript: ITenscript) => void,
    storedState$: BehaviorSubject<IStoredState>,
}): JSX.Element {

    const [tenscript, setTenscript] = useState<ITenscript>(tensegrity && !tensegrity.tenscript ? tensegrity.tenscript : rootTenscript)
    const [error, setError] = useState("")

    const [bootstrapOpen, setBootstrapOpen] = useState(false)

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
                                <span>Grow <FaCanadianMapleLeaf/> tensegrity</span>
                            ) : (
                                <span><FaBug/> {error}</span>
                            )}
                        </Button>
                    </ButtonGroup>
                </div>
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

    const [code, setCode] = useState<string[]>([])
    const [currentSpin, setCurrentSpin] = useState<Spin>(Spin.Left)

    useEffect(() => {
        if (tenscript.code.length > 0) {
            setCode(tenscript.code)
        } else if (tenscript.tree) {
            setCode([tenscript.tree.code])
        }
    }, [])

    function compile(newCode: string): void {
        tenscript.code = [newCode]
        if (compileTenscript(tenscript, setError)) {
            setError("")
            setTenscript(tenscript)
        }
    }

    function onCodeChange(newCode: string): void {
        setCode([newCode])
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
            <ButtonGroup className="my-2 w-100">{
                SPINS.map(spin =>(
                    <Button size="sm" key={spin}
                            color={currentSpin === spin? "success": "secondary"}
                            onClick={() => setCurrentSpin(spin)}
                    >
                        {spin}
                    </Button>
                ))
            }</ButtonGroup>
            <Input
                style={{
                    borderRadius: "1em",
                    height: "25em",
                }}
                type="textarea" id="tenscript"
                value={code.join("\n")}
                onChange={changeEvent => onCodeChange(changeEvent.target.value)}
            />
        </div>
    )
}
