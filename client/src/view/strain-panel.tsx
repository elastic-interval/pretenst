/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import * as React from "react"
import { useEffect, useState } from "react"
import { Col, Input, InputGroup, InputGroupAddon, InputGroupText } from "reactstrap"

import { Limit } from "../fabric/fabric-engine"
import { TensegrityFabric } from "../fabric/tensegrity-fabric"

export function StrainPanel({fabric}: {
    fabric: TensegrityFabric,
}): JSX.Element {
    const engine = fabric.instance.engine
    const [minBarStrain, setMinBarStrain] = useState(engine.getLimit(Limit.MinBarStrain))
    const [minCableStrain, setMinCableStrain] = useState(engine.getLimit(Limit.MinCableStrain))
    const [maxBarStrain, setMaxBarStrain] = useState(engine.getLimit(Limit.MaxBarStrain))
    const [maxCableStrain, setMaxCableStrain] = useState(engine.getLimit(Limit.MaxCableStrain))

    function refresh(): void {
        setMinBarStrain(engine.getLimit(Limit.MinBarStrain))
        setMinCableStrain(engine.getLimit(Limit.MinCableStrain))
        setMaxBarStrain(engine.getLimit(Limit.MaxBarStrain))
        setMaxCableStrain(engine.getLimit(Limit.MaxCableStrain))
    }

    useEffect(() => {
        const timer = setInterval(refresh, 1000)
        return () => clearTimeout(timer)
    }, [])

    const barRange = `${minBarStrain.toFixed(3)} - ${maxBarStrain.toFixed(3)}`
    const cableRange = `${minCableStrain.toFixed(3)} - ${maxCableStrain.toFixed(3)}`
    return (
        <>
            <Col xs="3">
                <InputGroup style={{width: "15em"}}>
                    <InputGroupAddon addonType="prepend">
                        <InputGroupText>Bars</InputGroupText>
                    </InputGroupAddon>
                    <Input style={{textAlign: "center"}} disabled={true} value={barRange}/>
                </InputGroup>
            </Col>
            <Col xs="3">
                <InputGroup style={{width: "15em"}}>
                    <InputGroupAddon addonType="prepend">
                        <InputGroupText>Cables</InputGroupText>
                    </InputGroupAddon>
                    <Input style={{textAlign: "center"}} disabled={true} value={cableRange}/>
                </InputGroup>
            </Col>
        </>
    )
}
