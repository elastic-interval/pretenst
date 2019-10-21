/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import * as React from "react"
import { CSSProperties, useEffect, useState } from "react"
import { FaArrowDown, FaArrowUp, FaEquals, FaGlobe, FaRuler } from "react-icons/all"
import { Button, ButtonGroup, Input, InputGroup, InputGroupAddon, InputGroupText } from "reactstrap"

import { IFabricEngine } from "../fabric/fabric-engine"
import { applyPhysicsFeature, IFeature } from "../fabric/features"
import { GLOBAL_FEATURE, multiplierSymbol, multiplierValue } from "../fabric/global-feature"
import { TensegrityFabric } from "../fabric/tensegrity-fabric"

export function FeaturePanel({engine, featureSet, fabric}: {
    engine: IFabricEngine,
    featureSet: IFeature[],
    fabric: TensegrityFabric,
}): JSX.Element {

    function Factor({feature, mutable}: { feature: IFeature, mutable: boolean }): JSX.Element {
        const updateFactor = (newFactor?: number): void => {
            feature.setFactor(newFactor === undefined ? feature.defaultValue : newFactor)
            if (feature.name.globalFeature !== undefined) {
                applyPhysicsFeature(fabric.instance, feature)
            }
            if (feature.name.intervalRole !== undefined) {
                fabric.intervals
                    .filter(interval => interval.intervalRole === feature.name.intervalRole)
                    .forEach(interval => engine.changeRestLength(interval.index, feature.factor$.getValue()))
            }
        }
        const [factor, setFactor] = useState<number>(feature.factor$.getValue())
        useEffect(() => {
            const subscription = feature.factor$.subscribe(newFactor => {
                setFactor(newFactor)
            })
            return () => {
                subscription.unsubscribe()
            }
        })

        const difference = Math.abs(feature.factor$.getValue() - feature.defaultValue)
        const atDefault = difference < 0.00001 * Math.abs(feature.defaultValue)
        const basicStyle: CSSProperties = {
            textAlign: "right",
            width: "6em",
        }
        const inputStyle: CSSProperties = atDefault ? basicStyle : {
            ...basicStyle,
            color: "green",
        }
        const UpdateButtonGroup = (): JSX.Element => (
            <ButtonGroup className="mx-1">
                <Button size="sm" onClick={() => {
                    updateFactor(feature.factor$.getValue() * feature.adjustmentFactor)
                }}><FaArrowUp/></Button>
                <Button size="sm" onClick={() => {
                    updateFactor(feature.factor$.getValue() / feature.adjustmentFactor)
                }}><FaArrowDown/></Button>
                <Button size="sm" onClick={() => {
                    updateFactor(undefined)
                }}><FaEquals/></Button>
            </ButtonGroup>
        )
        const globalFeature = feature.name.globalFeature
        if (globalFeature !== undefined) {
            const globalFeatureInfo = GLOBAL_FEATURE[globalFeature]
            const scaledValue = factor * multiplierValue(globalFeatureInfo.multiplier)
            const symbol = multiplierSymbol(globalFeatureInfo.multiplier)
            return (
                <InputGroup size="sm">
                    <strong>&nbsp;&nbsp;<FaGlobe/>&nbsp;&nbsp;</strong>
                    <InputGroupAddon addonType="prepend">
                        <InputGroupText>{feature.label}</InputGroupText>
                    </InputGroupAddon>
                    {symbol.length === 0 ? undefined : <InputGroupAddon addonType="prepend">
                        <InputGroupText>{symbol}</InputGroupText>
                    </InputGroupAddon>}
                    <Input style={inputStyle} value={scaledValue.toFixed(globalFeatureInfo.fixedDigits)} disabled={true}/>
                    {mutable ? <UpdateButtonGroup/> : undefined}
                </InputGroup>
            )
        } else {
            return (
                <InputGroup size="sm">
                    <strong>&nbsp;&nbsp;<FaRuler/>&nbsp;&nbsp;</strong>
                    <InputGroupAddon addonType="prepend">{feature.label}</InputGroupAddon>
                    <Input style={inputStyle} value={factor.toFixed(3)} disabled={true}/>
                    {mutable ? <UpdateButtonGroup/> : undefined}
                </InputGroup>
            )
        }
    }

    return (
        <div>
            {featureSet.map(f => (
                <div key={f.label} style={{
                    borderStyle: "solid",
                    borderColor: "white",
                    borderWidth: "0.1em",
                    borderRadius: "0.7em",
                    padding: "0.2em",
                    marginTop: "0.3em",
                    color: "white",
                    backgroundColor: "#545454",
                }}>
                    <Factor feature={f} mutable={true}/>
                </div>
            ))}
        </div>
    )
}
