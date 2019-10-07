/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import * as React from "react"
import { CSSProperties, useEffect, useState } from "react"
import { FaArrowDown, FaArrowUp, FaBalanceScale, FaGlobe, FaList, FaRuler } from "react-icons/all"
import {
    Button,
    ButtonDropdown,
    ButtonGroup,
    DropdownItem,
    DropdownMenu,
    DropdownToggle,
    Input,
    InputGroup,
    InputGroupAddon,
} from "reactstrap"

import { IFabricEngine } from "../fabric/fabric-engine"
import { applyPhysicsFeature, IFeature } from "../fabric/features"
import { TensegrityFabric } from "../fabric/tensegrity-fabric"
import { featureMultiplier, multiplierSymbol, multiplierValue } from "../storage/local-storage"

export function FeaturePanel({engine, featureSet, fabric}: {
    engine: IFabricEngine,
    featureSet: IFeature[],
    fabric?: TensegrityFabric,
}): JSX.Element {

    function Factor({feature, mutable}: { feature: IFeature, mutable: boolean }): JSX.Element {
        const updateFactor = (newFactor?: number): void => {
            feature.setFactor(newFactor === undefined ? feature.defaultValue : newFactor)
            if (feature.name.physicsFeature !== undefined) {
                applyPhysicsFeature(engine, feature)
            }
            if (feature.name.intervalRole !== undefined) {
                if (fabric) {
                    fabric.intervals
                        .filter(interval => interval.intervalRole === feature.name.intervalRole)
                        .forEach(interval => engine.changeRestLength(interval.index, feature.factor$.getValue()))
                }
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
        const inputStyle: CSSProperties = !atDefault ? {borderWidth: "2px", borderColor: "orange"} : {}
        const physicsFeature = feature.name.physicsFeature
        const UpdateButtonGroup = (): JSX.Element => (
            <ButtonGroup>
                <Button size="sm" onClick={() => {
                    updateFactor(feature.factor$.getValue() * feature.adjustmentFactor)
                }}><FaArrowUp/></Button>
                <Button size="sm" onClick={() => {
                    updateFactor(feature.factor$.getValue() / feature.adjustmentFactor)
                }}><FaArrowDown/></Button>
                <Button size="sm" onClick={() => {
                    updateFactor(undefined)
                }}><FaBalanceScale/></Button>
            </ButtonGroup>
        )
        if (physicsFeature !== undefined) {
            const multiplier = featureMultiplier(physicsFeature)
            const scaledValue = factor * multiplierValue(multiplier)
            const symbol = multiplierSymbol(multiplier)
            return (
                <InputGroup size="sm">
                    <strong><FaGlobe/>&nbsp;&nbsp;</strong>
                    <InputGroupAddon addonType="prepend">{feature.label}</InputGroupAddon>
                    <Input style={inputStyle} value={scaledValue.toFixed(1)} disabled={true}/>
                    {symbol.length === 0 ? undefined : <InputGroupAddon addonType="append">{symbol}</InputGroupAddon>}
                    {mutable ? <UpdateButtonGroup/> : undefined}
                </InputGroup>
            )
        } else {
            return (
                <InputGroup size="sm">
                    <strong><FaRuler/>&nbsp;&nbsp;</strong>
                    <InputGroupAddon addonType="prepend">{feature.label}</InputGroupAddon>
                    <Input style={inputStyle} value={factor.toFixed(3)} disabled={true}/>
                    {mutable ? <UpdateButtonGroup/> : undefined}
                </InputGroup>
            )
        }
    }

    const [open, setOpen] = useState<boolean>(false)
    const [selectedFeature, setSelectedFeature] = useState<IFeature>(featureSet[0])
    return (
        <div style={{position: "absolute", top: "1em", right: "1em", display: "flex"}}>
            <ButtonDropdown style={{display: "block"}} isOpen={open} toggle={() => setOpen(!open)}>
                <div className="float-left mx-3 h-100" style={{
                    color: "white",
                    paddingLeft: "0.6em",
                    borderColor: "#6c757d",
                    borderStyle: "solid",
                    borderWidth: "3px",
                    borderRadius: "3px",
                    backgroundColor: "#6c757d",
                }}>
                    <Factor feature={selectedFeature} mutable={true}/>
                </div>
                <DropdownToggle className="float-right"><FaList/></DropdownToggle>
                <DropdownMenu right={true} style={{backgroundColor: "#6c757d", marginLeft: "1em"}}>
                    {featureSet.map(f => (
                        <DropdownItem key={f.label} onClick={() => setSelectedFeature(f)}>
                            <Factor feature={f} mutable={false}/>
                        </DropdownItem>
                    ))}
                </DropdownMenu>
            </ButtonDropdown>
        </div>
    )

}
