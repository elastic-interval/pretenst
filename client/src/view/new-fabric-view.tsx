/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import * as React from "react"
import { useState } from "react"
import { FaRecycle, FaRegFolder } from "react-icons/all"
import {
    Button,
    Col,
    DropdownItem,
    DropdownMenu,
    DropdownToggle,
    InputGroup,
    InputGroupButtonDropdown,
    Row,
} from "reactstrap"

import { loadFabricCode, loadStorageIndex, storeStorageIndex } from "../storage/local-storage"

export function NewFabricView({constructFabric}: {
    constructFabric: (fabricCode: string) => void,
}): JSX.Element {

    const [storageIndex, setStorageIndex] = useState<number>(loadStorageIndex)
    const [open, setOpen] = useState<boolean>(false)

    function select(code: string, index: number): void {
        setStorageIndex(index)
        storeStorageIndex(index)
        constructFabric(code)
    }

    function reconstruct(): void {
        constructFabric(loadFabricCode()[storageIndex])
    }

    return (
        <div className="new-fabric-panel floating w-50 flex flex-column align-items-center">
            <Row>
                <Col md={{size: 12}}>
                    <InputGroup size="lg">
                        <InputGroupButtonDropdown addonType="append" isOpen={open}
                                                  toggle={() => setOpen(!open)}>
                            <DropdownToggle caret={true}>
                                <FaRegFolder/> {loadFabricCode()[storageIndex]}
                            </DropdownToggle>
                            <DropdownMenu>
                                {loadFabricCode().map((code, index) => (
                                    <DropdownItem key={`Buffer${index}`} onClick={() => select(code, index)}>
                                        {code}
                                    </DropdownItem>
                                ))}
                            </DropdownMenu>
                            <Button onClick={reconstruct}>
                                <FaRecycle/>
                            </Button>
                        </InputGroupButtonDropdown>
                    </InputGroup>
                </Col>
            </Row>
        </div>
    )
}
