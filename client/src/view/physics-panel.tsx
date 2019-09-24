/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import * as React from "react"
import { useEffect, useState } from "react"
import { FaSlidersH } from "react-icons/all"
import { Badge, Button, ButtonGroup, Col, Collapse, Container, Row } from "reactstrap"

import { IFabricEngine } from "../fabric/fabric-engine"
import { FabricInstance } from "../fabric/fabric-kernel"
import { IPhysicsFeature, Physics } from "../fabric/physics"

export function PhysicsPanel({engine, physics, instance}: {
    engine: IFabricEngine,
    physics: Physics,
    instance: FabricInstance,
}): JSX.Element {

    const [open, setOpen] = useState<boolean>(false)

    function FactorBadge({feature}: { feature: IPhysicsFeature }): JSX.Element {
        const [factor, setFactor] = useState<string>(feature.factor$.getValue().toFixed(10))
        useEffect(() => {
            const subscription = feature.factor$.subscribe(newFactor => {
                setFactor(newFactor.toFixed(10))
            })
            return () => {
                subscription.unsubscribe()
            }
        })
        return <Badge color="light">{factor}</Badge>
    }

    return (
        <div className="physics-panel flex flex-column">
            <Button size="md" block={true} onClick={() => setOpen(!open)}><FaSlidersH/></Button>
            <Collapse isOpen={open}>
                <hr/>
                <Container className="col-12">
                    {physics.features.map(feature => {
                        const setFactor = (factor?: number): void => {
                            if (factor === undefined) {
                                feature.setFactor(feature.defaultValue)
                            } else if (factor > 0) {
                                feature.setFactor(factor)
                            }
                            physics.applyGlobal(engine)
                            physics.applyLocal(instance)
                        }
                        const change = 1 + (feature.isGlobal ? 0.1 : 0.01)
                        return (
                            <div key={feature.label}>
                                <Row>
                                    <Badge color="secondary">{feature.label}</Badge>
                                </Row>
                                <Row>
                                    <Col xs="6">
                                        <ButtonGroup className="physics-button-group">
                                            <Button className="physics-adjust-button" color="primary"
                                                    onClick={() => {
                                                        setFactor(feature.factor$.getValue() * change)
                                                    }}>⨉</Button>
                                            <Button className="physics-adjust-button" color="primary"
                                                    onClick={() => {
                                                        setFactor(feature.factor$.getValue() / change)
                                                    }}>÷</Button>
                                            <Button className="physics-adjust-button" color="danger"
                                                    onClick={() => {
                                                        setFactor(undefined)
                                                    }}>=</Button>
                                        </ButtonGroup>
                                    </Col>
                                    <Col xs="6">
                                        <FactorBadge feature={feature}/>
                                    </Col>
                                </Row>
                            </div>
                        )
                    })}
                </Container>
            </Collapse>
        </div>
    )
}
