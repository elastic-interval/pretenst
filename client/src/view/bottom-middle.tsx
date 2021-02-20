/*
 * Copyright (c) 2021. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import { WorldFeature } from "eig"
import { useEffect, useState } from "react"
import * as React from "react"
import { ButtonDropdown, DropdownItem, DropdownMenu, DropdownToggle } from "reactstrap"

import { Tensegrity } from "../fabric/tensegrity"
import { FEATURE_VALUES, featureFilter } from "../storage/recoil"

import { FeatureSlider } from "./feature-slider"

export function BottomMiddle({tensegrity}: { tensegrity: Tensegrity }): JSX.Element {
    const [stage, updateStage] = useState(tensegrity.stage$.getValue())
    useEffect(() => {
        const sub = tensegrity.stage$.subscribe(updateStage)
        return () => sub.unsubscribe()
    }, [tensegrity])
    const [open, setOpen] = useState(false)
    const [featureValue, setFeatureValue] = useState(FEATURE_VALUES[WorldFeature.VisualStrain])
    return (
        <div className="w-100 d-flex">
            <ButtonDropdown isOpen={open} toggle={() => setOpen(!open)}>
                <DropdownToggle>Choose</DropdownToggle>
                <DropdownMenu>{
                    FEATURE_VALUES
                        .filter(featureFilter(stage))
                        .map((value) => (
                            <DropdownItem key={`fitem-${value.mapping.feature}`} onClick={() => setFeatureValue(value)}>
                                {value.mapping.name}
                            </DropdownItem>
                        ))
                }</DropdownMenu>
            </ButtonDropdown>
            <FeatureSlider
                featureValue={featureValue}
                apply={(feature, percent, value) => {
                    tensegrity.instance.applyFeature(feature, percent, value)
                }}
            />
        </div>
    )
}
