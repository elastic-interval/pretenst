
/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import * as React from "react"
import { useEffect, useState } from "react"
import { FaArrowDown, FaArrowUp } from "react-icons/all"
import { Button, ButtonGroup, Col, Container, Row } from "reactstrap"

import { IFabricEngine } from "../fabric/fabric-engine"
import { IPhysicsFeature, Physics } from "../fabric/physics"
import { TensegrityFabric } from "../fabric/tensegrity-fabric"

export function PhysicsPanel({engine, physics, fabric}: {
    engine: IFabricEngine,
    physics: Physics,
    fabric?: TensegrityFabric,
}): JSX.Element {

    function Factor({feature}: { feature: IPhysicsFeature }): JSX.Element {
        const [factor, setFactor] = useState<string>(feature.factor$.getValue().toFixed(10))
        useEffect(() => {
            const subscription = feature.factor$.subscribe(newFactor => {
                setFactor(newFactor.toFixed(10))
            })
            return () => {
                subscription.unsubscribe()
            }
        })
        const atDefault = Math.abs(feature.factor$.getValue() - feature.defaultValue) < 0.00001
        const className = "physics-factor" + (atDefault ? "" : " physics-factor-adjusted")
        return <strong className={className}>{factor}</strong>
    }

    return (
        <div className="physics-panel flex flex-column">
            {
                physics.features.map(feature => {
                    const setFactor = (factor?: number): void => {
                        if (factor === undefined) {
                            feature.setFactor(feature.defaultValue)
                        } else if (factor > 0) {
                            feature.setFactor(factor)
                        }
                        physics.applyGlobalFeatures(engine)
                        if (fabric) {
                            feature.apply(fabric.instance)
                        }
                    }
                    const change = 1 + (feature.isGlobal ? 0.1 : 0.01)
                    return (
                        <Container key={feature.label} className="physics-feature no-gutters my-1">
                            <Row noGutters={true}>
                                <Col xs={{size: 9}}>
                                    <Button onClick={() => setFactor(undefined)} className="w-100 border-info">
                                        <div className="small">{feature.label}</div>
                                        <Factor feature={feature}/>
                                    </Button>
                                </Col>
                                <Col xs={{size: 3}}>
                                    <ButtonGroup className="h-100">
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
