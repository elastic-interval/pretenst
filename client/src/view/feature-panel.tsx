
/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import * as React from "react"
import { CSSProperties, useEffect, useState } from "react"
import { FaArrowDown, FaArrowUp, FaEquals, FaGlobe } from "react-icons/all"
import { Button, ButtonGroup, Input, InputGroup, InputGroupAddon, InputGroupText } from "reactstrap"

import { FeatureMultiplier, FloatFeature } from "../fabric/fabric-features"
import { FabricInstance } from "../fabric/fabric-instance"
import { LifePhase } from "../fabric/life-phase"

function multiplierSymbol(multiplier: FeatureMultiplier): JSX.Element {
    switch (multiplier) {
        case FeatureMultiplier.OneThousand:
            return <span className="small">10<sup>3</sup></span>
        case FeatureMultiplier.One:
            return <span>1</span>
        case FeatureMultiplier.NegativeThousandths:
        case FeatureMultiplier.Thousandths:
            return <span className="small">10<sup>-3</sup></span>
        case FeatureMultiplier.Millionths:
        case FeatureMultiplier.NegativeMillionths:
            return <span className="small">10<sup>-6</sup></span>
        case FeatureMultiplier.Billionths:
        case FeatureMultiplier.NegativeBillionths:
            return <span className="small">10<sup>-9</sup></span>
        default:
            throw new Error("Bad multiplier")
    }
}


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
        const inputStyle: CSSProperties = feature.isAtDefault ? basicStyle : {
            ...basicStyle,
            color: "red",
            borderStyle: "solid",
            borderWidth: "1px",
            borderColor: "red",
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
                    <InputGroupAddon addonType="prepend">
                        <InputGroupText>{multiplierSymbol(feature.config.multiplier)}</InputGroupText>
                    </InputGroupAddon>
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
