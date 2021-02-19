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
import { compileTenscript, RunTenscript } from "../fabric/tenscript"
import { bootstrapIndexAtom, tenscriptAtom } from "../storage/recoil"

import { Grouping } from "./control-tabs"

export function ScriptTab({runTenscript}: { runTenscript: RunTenscript }): JSX.Element {
    const [tenscript, setTenscript] = useRecoilState(tenscriptAtom)
    const [json, setJson] = useState<string>("")
    const [bootstrapIndex, setBootstrapIndex] = useRecoilState(bootstrapIndexAtom)
    const [error, setError] = useState("")
    const [bootstrapOpen, setBootstrapOpen] = useState(false)
    const toJson = () => JSON.stringify(tenscript, undefined, 2)

    function parse(): void {
        try {
            const newTenscript = JSON.parse(json)
            if (compileTenscript(newTenscript, setError)) {
                setError("")
                setTenscript(newTenscript)
                runTenscript(newTenscript, setError)
            }
        } catch (e) {
            setError(e.toString())
        }
    }

    useEffect(() => {
        if (tenscript) {
            setJson(toJson())
        } else {
            setJson("")
        }
    }, [tenscript])

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
                    <Input
                        style={{borderRadius: "1em", height: "22em", marginBottom: "0.5em"}}
                        type="textarea" id="tenscript"
                        value={json}
                        onChange={changeEvent => setJson(changeEvent.target.value)}
                    />
                    <ButtonGroup vertical={true} className="w-100 my-2">
                        {error.length === 0 ? undefined : (
                            <Button className="my-2" color="warning" onClick={() => {
                                setJson(toJson())
                                setError("")
                            }}>
                                <FaBug/><hr/>{error}
                            </Button>
                        )}
                        <Button color="success" onClick={() => parse()}>
                            <span>Grow <FaCanadianMapleLeaf/> tensegrity</span>
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
