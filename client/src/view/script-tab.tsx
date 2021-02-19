/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import * as React from "react"
import { useEffect, useState } from "react"
import { FaBug, FaCanadianMapleLeaf, FaHiking, FaSeedling } from "react-icons/all"
import { Button, ButtonDropdown, ButtonGroup, DropdownItem, DropdownMenu, DropdownToggle, Input } from "reactstrap"
import { useRecoilState } from "recoil"

import { BOOTSTRAP } from "../fabric/bootstrap"
import { compileTenscript, ITenscript, RunTenscript } from "../fabric/tenscript"
import { Spin, SPINS } from "../fabric/tensegrity-types"
import { bootstrapIndexAtom, tenscriptAtom } from "../storage/recoil"

import { Grouping } from "./control-tabs"

export function ScriptTab({runTenscript}: { runTenscript: RunTenscript }): JSX.Element {
    const [tenscript] = useRecoilState(tenscriptAtom)
    const [bootstrapIndex, setBootstrapIndex] = useRecoilState(bootstrapIndexAtom)
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
                <div id="code-and-run" style={{flexDirection: "column", height: "available"}}>
                    <CodeArea
                        error={error}
                        setError={setError}
                    />
                    <ButtonGroup className="w-100 my-2">
                        <Button
                            color={error.length > 0 ? "warning" : "success"}
                            disabled={error.length > 0}
                            onClick={() => {
                                if (tenscript) {
                                    runTenscript(tenscript, setError)
                                }
                            }}
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
                        Explore <FaHiking/> existing designs {bootstrapIndex}
                    </DropdownToggle>
                    <DropdownMenu>{BOOTSTRAP.map((bootstrapProgram, index) => (
                        <DropdownItem key={`Boot${index}`} onClick={() => {
                            setBootstrapIndex(index)
                            runTenscript(bootstrapProgram, setError)
                        }}>
                            {bootstrapProgram.name}
                        </DropdownItem>
                    ))}</DropdownMenu>
                </ButtonDropdown>
            </Grouping>
        </div>
    )
}

function CodeArea({error, setError}: {
    error: string,
    setError: (message: string) => void,
}): JSX.Element {
    const [tenscript, setTenscript] = useRecoilState(tenscriptAtom)
    const [code, setCode] = useState<string[]>([])
    const [currentSpin, setCurrentSpin] = useState<Spin>(Spin.Left)

    useEffect(() => {
        if (tenscript && tenscript.code.length > 0) {
            setCode(tenscript.code)
        } else {
            setCode([])
        }
    }, [])

    function compile(newCode: string): void {
        if (!tenscript) {
            return
        }
        const compiled: ITenscript = {...tenscript}
        compiled.code = [newCode]
        if (compileTenscript(compiled, setError)) {
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
                <i>"{tenscript ? tenscript.name : "unknown"}"</i>
            </h6>
            <ButtonGroup className="my-2 w-100">{
                SPINS.map(spin => (
                    <Button size="sm" key={spin}
                            color={currentSpin === spin ? "success" : "secondary"}
                            onClick={() => setCurrentSpin(spin)}
                    >
                        {spin}
                    </Button>
                ))
            }</ButtonGroup>
            <Input
                style={{
                    borderRadius: "1em",
                    height: "20em",
                }}
                type="textarea" id="tenscript"
                value={code.join("\n")}
                onChange={changeEvent => onCodeChange(changeEvent.target.value)}
            />
        </div>
    )
}
