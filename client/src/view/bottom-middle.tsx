/*
 * Copyright (c) 2021. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import * as React from "react"
import { useState } from "react"
import { ButtonDropdown, DropdownItem, DropdownMenu, DropdownToggle } from "reactstrap"
import { useRecoilState } from "recoil"

import { Tensegrity } from "../fabric/tensegrity"
import { currentFeature, FEATURE_VALUES } from "../storage/recoil"

import { FeatureSlider } from "./feature-slider"

export function BottomMiddle({tensegrity}: {
    tensegrity: Tensegrity,
}): JSX.Element {
    const [open, setOpen] = useState(false)
    const [worldFeature, setWorldFeature] = useRecoilState(currentFeature)
    const [featureValue, setFeatureValue] = useState(FEATURE_VALUES[worldFeature])
    return (
        <div className="w-100 d-flex">
            <ButtonDropdown isOpen={open} toggle={() => setOpen(!open)}>
                <DropdownToggle>Choose</DropdownToggle>
                <DropdownMenu>{
                    FEATURE_VALUES
                        .filter(value => !value.mapping.name.startsWith("-"))
                        .map((value) => (
                            <DropdownItem key={`fitem-${value.mapping.feature}`} onClick={() => {
                                setWorldFeature(value.mapping.feature)
                                setFeatureValue(value)
                            }}>
                                {value.mapping.name}
                            </DropdownItem>
                        ))
                }</DropdownMenu>
            </ButtonDropdown>
            <FeatureSlider
                mapping={featureValue.mapping}
                percentAtom={featureValue.percentAtom}
                apply={(feature, percent, value) => {
                    tensegrity.instance.applyFeature({feature, percent, value}, false)
                }}
            />
        </div>
    )
}
