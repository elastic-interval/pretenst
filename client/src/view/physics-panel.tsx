/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import * as React from "react"
import {Badge, Button, ButtonGroup, Col, Container, Row} from "reactstrap"

import {IFabricExports, IFabricInstanceExports} from "../fabric/fabric-exports"
import {Physics} from "../fabric/physics"

export interface IPhysicsPanelProps {
    physics: Physics
    fabricExports: IFabricExports
    fabricInstanceExports: IFabricInstanceExports
}

export class PhysicsPanel extends React.Component<IPhysicsPanelProps, object> {

    constructor(props: IPhysicsPanelProps) {
        super(props)
        this.state = {}
    }

    public applyPhysics(): void {
        this.props.physics.applyGlobal(this.props.fabricExports)
        this.props.physics.applyLocal(this.props.fabricInstanceExports)
    }

    public render(): JSX.Element {
        return (
            <div className="physics-panel">
                <h3>Physics</h3>
                <Container>
                    {this.props.physics.features.map(feature => {
                        return (
                            <Row key={feature.name}>
                                <Col xs="6">
                                    <Badge color="secondary">{feature.name}</Badge>
                                </Col>
                                <Col xs="3">
                                    <ButtonGroup>
                                        <Button size="sm" color="primary"
                                                onClick={() => feature.setFactor(feature.factor * 1.1)}>+</Button>
                                        <Button size="sm" color="primary"
                                                onClick={() => feature.setFactor(feature.factor * 0.9)}>-</Button>
                                        <Button size="sm" color="danger"
                                                onClick={() => feature.setFactor(1)}>1</Button>
                                    </ButtonGroup>
                                </Col>
                                <Col xs="3">
                                    <Badge className="float-right" color="light">{feature.factor.toFixed(4)}</Badge>
                                </Col>
                            </Row>
                        )
                    })}
                </Container>
            </div>
        )
    }
}

//
