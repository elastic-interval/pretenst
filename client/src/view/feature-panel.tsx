/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import * as React from "react"
import { CSSProperties, useEffect, useState } from "react"
import { FaGlobe } from "react-icons/all"
import { Button, ButtonGroup, Input, InputGroup, InputGroupAddon, InputGroupText } from "reactstrap"

import { FloatFeature } from "../fabric/fabric-features"

export function FeaturePanel({feature}: { feature: FloatFeature }): JSX.Element {

    const [factorString, setFactorString] = useState<string>(feature.toString)

    useEffect(() => {
        const subscription = feature.onChange(() => {
            setFactorString(feature.formatted)
        })
        return () => subscription.unsubscribe()
    })

    const basicStyle: CSSProperties = {
        textAlign: "right",
        width: "6em",
    }
    const inputStyle: CSSProperties = feature.isAtDefault ? basicStyle : {
        ...basicStyle,
        color: "red",
        borderStyle: "solid",
        borderWidth: "1px",
        borderColor: "red",
    }
    return (
        <InputGroup size="sm">
            <strong>&nbsp;&nbsp;<FaGlobe/>&nbsp;&nbsp;</strong>
            <InputGroupAddon addonType="prepend">
                <InputGroupText>{feature.title}</InputGroupText>
            </InputGroupAddon>
            <Input style={inputStyle} value={factorString} disabled={true}/>
            <ButtonGroup className="mx-1">
                {feature.percentChoices.map(percent => (
                    <Button
                        key={`${feature.config.name}-${percent}`}
                        size="x-sm"
                        onClick={() => feature.percent = percent}
                    >{percent}%</Button>
                ))}
            </ButtonGroup>
        </InputGroup>
    )
}
