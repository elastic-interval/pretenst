/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import * as React from "react"
import { Badge, Col, Container, Row } from "reactstrap"

import { ISelection } from "../fabric/tensegrity-brick-types"

export function BuildingPanel({selection}: {
    selection: ISelection,
}): JSX.Element {
    return (
        <div className="building-panel floating w-25 flex flex-column align-items-center">
            <h1>Building</h1>
            <Container>
                <Row>
                    <Col>
                        <Badge color="warn">Here!</Badge>
                    </Col>
                </Row>
                <Row>
                    <Col>
                        {!selection.selectedInterval ? undefined : (
                            <Badge color="warn">Interval</Badge>
                        )}
                    </Col>
                </Row>
                <Row>
                    <Col>
                        {!selection.selectedJoint ? undefined : (
                            <Badge color="warn">Joint</Badge>
                        )}
                    </Col>
                </Row>
                <Row>
                    <Col>
                        {!selection.selectedFace ? undefined : (
                            <Badge color="warn">Face</Badge>
                        )}
                    </Col>
                </Row>
            </Container>
        </div>
    )
}
