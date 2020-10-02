/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { WorldFeature } from "eig"
import * as React from "react"
import { useEffect, useState } from "react"
import { FaBug, FaCanadianMapleLeaf, FaFutbol, FaHiking, FaPlay, FaRocket, FaSeedling } from "react-icons/all"
import { Button, ButtonDropdown, ButtonGroup, DropdownItem, DropdownMenu, DropdownToggle, Input } from "reactstrap"
import { BehaviorSubject } from "rxjs"

import { switchToVersion, Version } from "../fabric/eig-util"
import { FloatFeature } from "../fabric/float-feature"
import { BOOTSTRAP, codeToTenscript, ITenscript } from "../fabric/tenscript"
import { Tensegrity } from "../fabric/tensegrity"
import { IStoredState, transition } from "../storage/stored-state"

import { Grouping } from "./control-tabs"

export function ScriptTab({worldFeatures, rootTenscript,  tensegrity, runTenscript, storedState$}: {
    worldFeatures: Record<WorldFeature, FloatFeature>,
    rootTenscript: ITenscript,
    tensegrity?: Tensegrity,
    runTenscript: (tenscript: ITenscript) => void,
    storedState$: BehaviorSubject<IStoredState>,
}): JSX.Element {

    const [tenscript, setTenscript] = useState<ITenscript>(tensegrity && !tensegrity.tenscript.fromUrl ? tensegrity.tenscript : rootTenscript)
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
            <Grouping>
                <h6 className="w-100 text-center">Special <FaRocket/> versions</h6>
                <ButtonGroup vertical={false} className="w-100">
                    <Button onClick={() => switchToVersion(Version.Sphere)}>
                        <FaFutbol/> Spheres
                    </Button>
                    <Button onClick={() => {
                        transition(storedState$, {demoCount: 0, fullScreen: true, rotating: true})
                        runTenscript(BOOTSTRAP[0])
                    }}>
                        <FaPlay/> Demo
                    </Button>
                </ButtonGroup>
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
                    height: "17em",
                }}
                type="textarea" id="tenscript"
                value={tenscriptCode}
                onChange={changeEvent => onCodeChange(changeEvent.target.value)}
            />
        </div>
    )
}
