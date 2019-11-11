/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import * as React from "react"
import { FaArrowDown, FaArrowUp, FaHammer, FaTimesCircle } from "react-icons/all"
import { Button, ButtonGroup } from "reactstrap"

import { lengthFeatureToRole } from "../fabric/fabric-engine"
import { FloatFeature } from "../fabric/fabric-features"
import { IBrick } from "../fabric/tensegrity-brick-types"
import { TensegrityFabric } from "../fabric/tensegrity-fabric"

import { FeaturePanel } from "./feature-panel"

export function ShapePanel({fabric, features, selectedBrick, setSelectedBrick}: {
    fabric: TensegrityFabric,
    features: FloatFeature[]
    selectedBrick?: IBrick,
    setSelectedBrick: (brick?: IBrick) => void,
}): JSX.Element {

    const adjustValue = (up: boolean) => () => {
        function adjustment(): number {
            const factor = 1.03
            return up ? factor : (1 / factor)
        }

        fabric.forEachSelected(interval => {
            fabric.instance.engine.multiplyRestLength(interval.index, adjustment())
        })
    }

    return (
        <div className="w-100">
            <div className="text-center">
                <h2><FaHammer/> Lengths</h2>
            </div>
            <div className="my-2">
            {features.filter(feature => !!lengthFeatureToRole(feature.fabricFeature)).map(feature => (
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
                    <FeaturePanel feature={feature} mutable={true}/>
                </div>
            ))}
            </div>
            {!selectedBrick ? undefined : (
                <div className="my-2">
                    <div className="text-center">
                        <h2>Editing <FaHammer/></h2>
                    </div>
                    <ButtonGroup className="w-100">
                        <Button disabled={!fabric.splitIntervals} onClick={adjustValue(true)}>
                            <FaArrowUp/><span> Bigger</span>
                        </Button>
                        <Button disabled={!fabric.splitIntervals} onClick={adjustValue(false)}>
                            <FaArrowDown/><span> Smaller</span>
                        </Button>
                        <Button onClick={() => {
                            setSelectedBrick()
                            fabric.clearSelection()
                        }}>
                            <FaTimesCircle/>
                        </Button>
                    </ButtonGroup>

                </div>
            )}
        </div>
    )
}
