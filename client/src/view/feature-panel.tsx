
/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import * as React from "react"
import { CSSProperties, useEffect, useState } from "react"
import { FaArrowDown, FaArrowUp, FaEquals, FaGlobe } from "react-icons/all"
import { Button, ButtonGroup, Input, InputGroup, InputGroupAddon, InputGroupText } from "reactstrap"

import { FloatFeature } from "../fabric/fabric-features"
import { FabricInstance } from "../fabric/fabric-instance"
import { LifePhase } from "../fabric/life-phase"

export function FeaturePanel({featureSet, lifePhase, instance}: {
    featureSet: FloatFeature[],
    lifePhase: LifePhase,
    instance: FabricInstance,
}): JSX.Element {

    function Factor({feature, mutable}: { feature: FloatFeature, mutable: boolean }): JSX.Element {

        const [factorString, setFactorString] = useState<string>(feature.toString)

        useEffect(() => {
            const subscription = feature.onChange(() => {
                instance.applyFeature(feature)
                setFactorString(feature.formatted)
            })
            return () => subscription.unsubscribe()
        })

        const basicStyle: CSSProperties = {
            textAlign: "right",
            width: "6em",
        }
        const inputStyle: CSSProperties = feature.atDefault ? basicStyle : {
            ...basicStyle,
            color: "green",
        }
        const UpdateButtonGroup = (): JSX.Element => (
            <ButtonGroup className="mx-1">
                <Button size="sm" onClick={() => feature.adjustValue(true)}><FaArrowUp/></Button>
                <Button size="sm" onClick={() => feature.adjustValue(false)}><FaArrowDown/></Button>
                <Button size="sm" onClick={() => feature.reset()}><FaEquals/></Button>
            </ButtonGroup>
        )
        return (
            <InputGroup size="sm">
                <strong>&nbsp;&nbsp;<FaGlobe/>&nbsp;&nbsp;</strong>
                <InputGroupAddon addonType="prepend">
                    <InputGroupText>{feature.title}</InputGroupText>
                </InputGroupAddon>
                {feature.multiplierSymbol.length === 0 ? undefined :
                    <InputGroupAddon addonType="prepend">
                        <InputGroupText>{feature.multiplierSymbol}</InputGroupText>
                    </InputGroupAddon>
                }
                <Input style={inputStyle} value={factorString} disabled={true}/>
                {mutable ? <UpdateButtonGroup/> : undefined}
            </InputGroup>
        )
    }

    return (
        <div>
            {featureSet
                .filter(feature => feature.showDuring(lifePhase))
                .map(feature => (
                    <div key={feature.title} style={{
                        borderStyle: "solid",
                        borderColor: "white",
                        borderWidth: "0.1em",
                        borderRadius: "0.7em",
                        padding: "0.2em",
                        marginTop: "0.3em",
                        color: "white",
                        backgroundColor: "#545454",
                    }}>
                        <Factor feature={feature} mutable={true}/>
                    </div>
                ))}
        </div>
    )
}
