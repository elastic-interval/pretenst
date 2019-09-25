/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import * as React from "react"
import { useEffect, useState } from "react"
import { FaArrowDown, FaArrowUp, FaSlidersH } from "react-icons/all"
import { Button, ButtonGroup, Col, Collapse, Container, Row } from "reactstrap"

import { IFabricEngine } from "../fabric/fabric-engine"
import { FabricInstance } from "../fabric/fabric-kernel"
import { IPhysicsFeature, Physics } from "../fabric/physics"

export function PhysicsPanel({engine, physics, instance}: {
    engine: IFabricEngine,
    physics: Physics,
    instance: FabricInstance,
}): JSX.Element {

    const [open, setOpen] = useState<boolean>(false)

    function FactorButton({feature}: { feature: IPhysicsFeature }): JSX.Element {
        const [factor, setFactor] = useState<string>(feature.factor$.getValue().toFixed(10))
        useEffect(() => {
            const subscription = feature.factor$.subscribe(newFactor => {
                setFactor(newFactor.toFixed(10))
            })
            return () => {
                subscription.unsubscribe()
            }
        })
        return <strong className="physics-factor">{factor}</strong>
    }

    return (
        <div className="physics-panel flex flex-column">
            <Button block={true} onClick={() => setOpen(!open)}><FaSlidersH/></Button>
            <Collapse isOpen={open}>
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
                        <div key={feature.label} className="physics-feature">
                            <Container>
                                <Row>
                                    <Col>
                                        {feature.label}
                                    </Col>
                                </Row>
                                <Row>
                                    <Col>
                                        <ButtonGroup>
                                            <Button size="sm" onClick={() => {
                                                setFactor(feature.factor$.getValue() / change)
                                            }}> <FaArrowDown/></Button>
                                            <Button size="sm" onClick={() => {
                                                setFactor(feature.factor$.getValue() * change)
                                            }}><FaArrowUp/></Button>
                                            <Button size="sm" onClick={() => {
                                                setFactor(undefined)
                                            }}><FactorButton feature={feature}/></Button>
                                        </ButtonGroup>
                                    </Col>
                                </Row>
                            </Container>
                        </div>
                    )
                })}
            </Collapse>
        </div>
    )
}
