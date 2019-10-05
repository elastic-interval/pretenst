/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import * as React from "react"
import { useEffect, useState } from "react"
import { FaArrowDown, FaArrowUp } from "react-icons/all"
import { Badge, Button, ButtonGroup, Col, Container, Row } from "reactstrap"

import { IFabricEngine } from "../fabric/fabric-engine"
import { applyPhysicsFeature, IFeature } from "../fabric/features"
import { TensegrityFabric } from "../fabric/tensegrity-fabric"
import { featureMultiplier, multiplierSymbol, multiplierValue } from "../storage/local-storage"

export function FeaturePanel({engine, features, isPhysics, fabric}: {
    engine: IFabricEngine,
    features: IFeature[],
    isPhysics: boolean,
    fabric?: TensegrityFabric,
}): JSX.Element {

    function Factor({feature}: { feature: IFeature }): JSX.Element {
        function renderFactor(value: number): string {
            const physicsFeature = feature.name.physicsFeature
            if (physicsFeature !== undefined) {
                const multiplier = featureMultiplier(physicsFeature)
                const scaledValue = value * multiplierValue(multiplier)
                return scaledValue.toFixed(1) + multiplierSymbol(multiplier)
            } else {
                return value.toFixed(3)
            }
        }

        const [factor, setFactor] = useState<string>(renderFactor(feature.factor$.getValue()))
        useEffect(() => {
            const subscription = feature.factor$.subscribe(newFactor => {
                setFactor(renderFactor(newFactor))
            })
            return () => {
                subscription.unsubscribe()
            }
        })
        const difference = Math.abs(feature.factor$.getValue() - feature.defaultValue)
        const atDefault = difference < 0.00001 * Math.abs(feature.defaultValue)
        const className = "float-right physics-factor" + (atDefault ? "" : " physics-factor-adjusted")
        return <strong className={className}>{factor}</strong>
    }

    return (
        <div className="features-panel flex flex-column my-4">
            {
                features.map(feature => {
                    const setFactor = (factor?: number): void => {
                        feature.setFactor(factor === undefined ? feature.defaultValue : factor)
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
                    const change = 1 + (isPhysics ? 0.1 : 0.01)
                    return (
                        <Container key={feature.label} className="feature-control my-3">
                            <Row noGutters={true}>
                                <Col xs={{size: 9}}>
                                    <Button onClick={() => setFactor(undefined)}
                                            className="w-100 border-info text-left">
                                        <Badge>{feature.label}</Badge> <Factor feature={feature}/>
                                    </Button>
                                </Col>
                                <Col xs={{size: 3}}>
                                    <ButtonGroup className="h-100 mx-1">
                                        <Button className="border-info" size="sm" onClick={() => {
                                            setFactor(feature.factor$.getValue() * change)
                                        }}><FaArrowUp/></Button>
                                        <Button className="border-info" size="sm" onClick={() => {
                                            setFactor(feature.factor$.getValue() / change)
                                        }}> <FaArrowDown/></Button>
                                    </ButtonGroup>
                                </Col>
                            </Row>
                        </Container>
                    )
                })
            }
        </div>
    )
}
