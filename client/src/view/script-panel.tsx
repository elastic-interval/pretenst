/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import * as React from "react"
import { useEffect, useState } from "react"
import { FaBug, FaCanadianMapleLeaf, FaSeedling } from "react-icons/all"
import { Button, ButtonGroup, Input } from "reactstrap"
import { useRecoilState } from "recoil"

import { compileTenscript, RunTenscript } from "../fabric/tenscript"
import { tenscriptAtom } from "../storage/recoil"

export function ScriptPanel({runTenscript}: { runTenscript: RunTenscript }): JSX.Element {
    const [tenscript, setTenscript] = useRecoilState(tenscriptAtom)
    const [json, setJson] = useState<string>("")
    const [error, setError] = useState("")
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
            <div>
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
            </div>
        </div>
    )
}
