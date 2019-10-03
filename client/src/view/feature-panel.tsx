/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import * as React from "react"
import { useEffect, useState } from "react"
import { FaArrowDown, FaArrowUp } from "react-icons/all"
import { Badge, Button, ButtonGroup, Col, Container, Row } from "reactstrap"

import { IFabricEngine } from "../fabric/fabric-engine"
import { applyFeatureToEngine, applyFeatureToInstance, IFeature } from "../fabric/features"
import { TensegrityFabric } from "../fabric/tensegrity-fabric"

export function FeaturePanel({engine, features, physics, fabric}: {
    engine: IFabricEngine,
    features: IFeature[],
    physics: boolean,
    fabric?: TensegrityFabric,
}): JSX.Element {

    function Factor({feature}: { feature: IFeature }): JSX.Element {
        const [factor, setFactor] = useState<string>(feature.factor$.getValue().toFixed(10))
        useEffect(() => {
            const subscription = feature.factor$.subscribe(newFactor => {
                setFactor(newFactor.toFixed(5))
            })
            return () => {
                subscription.unsubscribe()
            }
        })
        const atDefault = Math.abs(feature.factor$.getValue() - feature.defaultValue) < 0.00001
        const className = "float-right physics-factor" + (atDefault ? "" : " physics-factor-adjusted")
        return <strong className={className}>{factor}</strong>
    }

    return (
        <div className="features-panel flex flex-column my-4">
            {
                features.map(feature => {
                    const setFactor = (factor?: number): void => {
                        if (factor === undefined) {
                            feature.setFactor(feature.defaultValue)
                        } else if (factor > 0) {
                            feature.setFactor(factor)
                        }
                        if (physics) {
                            features.forEach(applyFeatureToEngine(engine))
                        } else if (fabric) {
                            features.forEach(applyFeatureToInstance(fabric.instance))
                        }
                    }
                    const change = 1 + (feature.isPhysics ? 0.1 : 0.01)
                    return (
                        <Container key={feature.label} className="feature-control my-3">
                            <Row noGutters={true}>
                                <Col xs={{size: 9}}>
                                    <Button onClick={() => setFactor(undefined)} className="w-100 border-info text-left">
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
