/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import * as React from "react"
import { useState } from "react"
import {
    Button,
    Col,
    DropdownItem,
    DropdownMenu,
    DropdownToggle,
    Input,
    InputGroup,
    InputGroupAddon,
    InputGroupButtonDropdown,
    Row,
} from "reactstrap"

const FABRIC_CODE_KEY = "FabricCode"

const FABRIC_BUFFERS: IFabricBuffer[] = [
    {name: "One", code: "0"},
    {name: "Two", code: "1"},
    {name: "Three", code: "2"},
    {name: "Nine", code: "9"},
    {name: "Tripod", code: "1[3,3,3]"},
    {name: "Bent Worm", code: "4[2=4]"},
    {name: "WTF", code: "4[4,4[1,1,1],4]"},
    {name: "Tree", code: "3[3[3,3,3],3[3,3,3],3[3,3,3]]"},
    {name: "Mega-Mast", code: "9[9,9,9]"},
    {name: "Zigzag Loop", code: "1[3=2[1=2[3=2[2=2[2=2[2=1]]]]]]X"},
]

export const DEFAULT_NAME = FABRIC_BUFFERS[0].name

export function fetchFabricCode(bufferName: string): string {
    const item = localStorage.getItem(FABRIC_CODE_KEY + bufferName)
    if (!item) {
        const found = FABRIC_BUFFERS.find(buffer => buffer.name === bufferName)
        if (!found) {
            throw new Error()
        }
        return found.code
    }
    return item
}

function storeFabricCode(bufferName: string, fabricCode: string): void {
    localStorage.setItem(FABRIC_CODE_KEY + bufferName, fabricCode)
}

interface IFabricBuffer {
    name: string
    code: string
}

export function NewFabricView({constructFabric, selectBuffer, defaultBufferName}: {
    defaultBufferName: string
    constructFabric: (fabricCode: string) => void,
    selectBuffer: (bufferName: string) => void,
}): JSX.Element {
    const [bufferName, setBufferName] = useState<string>(defaultBufferName)
    const [fabricCode, setFabricCode] = useState<string>(fetchFabricCode(defaultBufferName))
    const [buffersOpen, setBuffersOpen] = useState<boolean>(false)

    return (
        <div className="floating w-50 flex flex-column align-items-center">
            <Row>
                <Col md={{size: 12}}>
                    <InputGroup size="lg">
                        <InputGroupButtonDropdown addonType="append" isOpen={buffersOpen}
                                                  toggle={() => setBuffersOpen(!buffersOpen)}>
                            <DropdownToggle caret={true}>
                                {bufferName}
                            </DropdownToggle>
                            <DropdownMenu>
                                {FABRIC_BUFFERS.map(buffer => (
                                    <DropdownItem key={"Buffer" + buffer.name} onClick={() => {
                                        if (bufferName === buffer.name) {
                                            return
                                        }
                                        setBufferName(buffer.name)
                                        setFabricCode(fetchFabricCode(buffer.name))
                                        selectBuffer(buffer.name)
                                    }
                                    }>{buffer.name}</DropdownItem>
                                ))}
                            </DropdownMenu>
                        </InputGroupButtonDropdown>
                        <Input value={fabricCode}
                               tabIndex={1}
                               className="text-monospace"
                               placeholder="Fabric Code e.g. 3[1,1,1]"
                               onChange={(e) => setFabricCode(e.target.value)}
                        />
                        <InputGroupAddon addonType="append">
                            <Button color="success" onClick={() => {
                                storeFabricCode(bufferName, fabricCode)
                                constructFabric(fabricCode)
                            }}>Construct</Button>
                        </InputGroupAddon>
                    </InputGroup>
                </Col>
            </Row>
        </div>
    )
}
