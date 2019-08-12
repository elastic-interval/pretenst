/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import * as React from "react"
import { Badge, Button, ButtonGroup, Col, Container, Row } from "reactstrap"
import { Subscription } from "rxjs"

import { IFabricExports, IFabricInstanceExports } from "../fabric/fabric-exports"
import { IPhysicsFeature, Physics } from "../fabric/physics"

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
                        const currentValue = feature.factor$.getValue()
                        const setFactor = (factor: number): void => {
                            feature.setFactor(factor)
                            this.applyPhysics()
                        }
                        return (
                            <Row key={feature.name}>
                                <Col xs="6">
                                    <Badge color="secondary">{feature.name}</Badge>
                                </Col>
                                <Col xs="3">
                                    <ButtonGroup>
                                        <Button size="sm" color="primary"
                                                onClick={() => setFactor(currentValue * 1.1)}>+</Button>
                                        <Button size="sm" color="primary"
                                                onClick={() => setFactor(currentValue * 0.9)}>-</Button>
                                        <Button size="sm" color="danger"
                                                onClick={() => setFactor(1)}>1</Button>
                                    </ButtonGroup>
                                </Col>
                                <Col xs="3">
                                    <FactorBadge feature={feature}/>
                                </Col>
                            </Row>
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
            <Badge className="float-right" color="light">{this.state.formattedValue}</Badge>
        )
    }
}
