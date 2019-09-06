/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import * as React from "react"
import { Badge, Button, ButtonGroup, Col, Container, Row } from "reactstrap"
import { Subscription } from "rxjs"

import { IFabricExports } from "../fabric/fabric-exports"
import { InstanceExports } from "../fabric/fabric-kernel"
import { IPhysicsFeature, Physics } from "../fabric/physics"

export interface IPhysicsPanelProps {
    physics: Physics
    fabricExports: IFabricExports
    instanceExports: InstanceExports
}

export class PhysicsPanel extends React.Component<IPhysicsPanelProps, object> {

    constructor(props: IPhysicsPanelProps) {
        super(props)
        this.state = {}
    }

    public applyPhysics(): void {
        this.props.physics.applyGlobal(this.props.fabricExports)
        this.props.physics.applyLocal(this.props.instanceExports)
    }

    public render(): JSX.Element {
        return (
            <div className="physics-panel">
                <h3>Physics</h3>
                <Container>
                    {this.props.physics.features.map(feature => {
                        const setFactor = (factor: number): void => {
                            feature.setFactor(factor)
                            this.applyPhysics()
                        }
                        return (
                            <div key={feature.name}>
                                <Row>
                                    <Badge color="secondary">{feature.name}</Badge>
                                </Row>
                                <Row>
                                    <Col xs="6">
                                        <ButtonGroup className="physics-button-group">
                                            <Button className="physics-adjust-button" color="primary"
                                                    onClick={() => setFactor(feature.factor$.getValue() * 1.1)}>+</Button>
                                            <Button className="physics-adjust-button" color="primary"
                                                    onClick={() => setFactor(feature.factor$.getValue() * 0.9)}>-</Button>
                                            <Button className="physics-adjust-button" color="danger"
                                                    onClick={() => setFactor(1)}>1</Button>
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
            </div>
        )
    }
}

interface IBadgeProps {
    feature: IPhysicsFeature
}

interface IBadgeState {
    formattedValue: string
}

class FactorBadge extends React.Component<IBadgeProps, IBadgeState> {

    private subscription: Subscription

    constructor(props: IBadgeProps) {
        super(props)
        this.state = {formattedValue: "?"}
    }

    public componentDidMount(): void {
        this.subscription = this.props.feature.factor$.subscribe(factor => {
            this.setState({formattedValue: factor.toFixed(4)})
        })
    }

    public componentWillUnmount(): void {
        this.subscription.unsubscribe()
    }

    public render(): JSX.Element {
        return (
            <Badge color="light">{this.state.formattedValue}</Badge>
        )
    }
}
