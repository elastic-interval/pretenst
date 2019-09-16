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
} from "reactstrap"


export function NewFabricView({loadFabricCode}: {
    loadFabricCode: (fabricCode: string) => void,
}): JSX.Element {
    const [fabricCode, setFabricCode] = useState<string>("")
    const [dropdownOpen, setDropdownOpen] = useState<boolean>(false)

    function PresetFabric({code, name}: { code: string, name: string }): JSX.Element {
        return (
            <DropdownItem onClick={() => setFabricCode(code)}>
                {name}
            </DropdownItem>
        )
    }

    return (
        <div className="w-100 flex flex-column align-items-center">
            <div>
                <h1 className="text-white m-4">New Fabric</h1>
            </div>
            <Col md={{size: 8, offset: 2}}>
                <InputGroup size="lg">
                    <InputGroupButtonDropdown addonType="append" isOpen={dropdownOpen}
                                              toggle={() => setDropdownOpen(!dropdownOpen)}>
                        <DropdownToggle caret>
                            Load Preset
                        </DropdownToggle>
                        <DropdownMenu>
                            <PresetFabric name="Seed" code="0" />
                            <PresetFabric name="Worm-1" code="1" />
                            <PresetFabric name="Worm-2" code="2" />
                            <PresetFabric name="Worm-3" code="3" />
                            <PresetFabric name="Worm-9" code="9" />
                            <PresetFabric name="Long Leg Tripod" code="1[3,3,3]" />
                            <PresetFabric name="Short Leg Tripod" code="3[1,1,1]"/>
                            <PresetFabric name="Bent Worm-4" code="4[0,4,0]"/>
                            <PresetFabric name="WTF" code="4[4,4[1,1,1],4]"/>
                            <PresetFabric name="Nine Branch Tree" code="3[3[3,3,3],3[3,3,3],3[3,3,3]]"/>
                            <PresetFabric name="Super Long Quadra" code="9[9,9,9]" />
                        </DropdownMenu>
                    </InputGroupButtonDropdown>
                    <Input value={fabricCode}
                           className="text-monospace"
                           placeholder="Fabric Code e.g. 3[1,1,1]"
                           onChange={(e) => setFabricCode(e.target.value)}
                    />
                    <InputGroupAddon addonType="append">
                        <Button color="success" onClick={() => loadFabricCode(fabricCode)}>
                            Start
                        </Button>
                    </InputGroupAddon>
                </InputGroup>
            </Col>
        </div>
    )
}
