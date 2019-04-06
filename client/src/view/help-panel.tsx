/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import * as React from "react"
import {
    Button,
    Card,
    CardBody,
    CardFooter,
    CardHeader,
    CardText,
    CardTitle,
    Col,
    Container,
    Dropdown,
    DropdownItem,
    DropdownMenu,
    DropdownToggle,
    Row,
} from "reactstrap"

import { Command, IAppState } from "../state/app-state"
import { Transition } from "../state/transition"

import { IToolbarState } from "./control-panel"
import { GLOBAL_CARDS, GlobalCardName } from "./info-pages"

export interface IHelpProps {
    appState: IAppState
    toolbarState: IToolbarState
    command?: Command
}

export interface IHelpState {
    globalCardsOpen: boolean
    globalCardName?: GlobalCardName
}

export class HelpPanel extends React.Component<IHelpProps, IHelpState> {

    constructor(props: IHelpProps) {
        super(props)
        this.state = {globalCardsOpen: false}
    }

    public componentWillMount(): void {
        this.setState({globalCardName: undefined})
    }

    public render(): JSX.Element | boolean {
        if (!this.props.appState.helpVisible) {
            return false
        }
        const globalCardName = this.state.globalCardName
        if (globalCardName) {
            const foundCard = GLOBAL_CARDS.find(card => card.globalCardName === globalCardName)
            if (!foundCard) {
                return false
            }
            return (
                <Card>
                    <CardHeader>
                        <CardTitle>Global Card: {globalCardName}</CardTitle>
                    </CardHeader>
                    {foundCard.cardBody}
                    <CardFooter>{this.footer()}</CardFooter>
                </Card>
            )
        }
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Card for {this.props.toolbarState}</CardTitle>
                </CardHeader>
                <CardBody>
                    <CardText>
                        Hello this is the card text.  Command: {this.props.command}
                    </CardText>
                </CardBody>
                <CardFooter>{this.footer()}</CardFooter>
            </Card>
        )
    }

    private footer(): JSX.Element {
        return (
            <Container>
                <Row>
                    <Col>
                        <Dropdown group isOpen={this.state.globalCardsOpen} size="sm" toggle={() => {
                            this.setState({globalCardsOpen: !this.state.globalCardsOpen})
                        }}>
                            <DropdownToggle color="info" caret>General info</DropdownToggle>
                            <DropdownMenu>
                                {Object.keys(GlobalCardName).map(key => {
                                    return (
                                        <DropdownItem key={key} onClick={() => {
                                            this.setState({globalCardName: GlobalCardName[key]})
                                        }}>{key}</DropdownItem>
                                    )
                                })}
                            </DropdownMenu>
                        </Dropdown>
                    </Col>
                    <Col/>
                    <Col>
                        <Button
                            color="info"
                            onClick={() => {
                                this.setState({globalCardName: undefined})
                                const appState = this.props.appState
                                appState.updateState(new Transition(appState).withHelpVisible(false).appState)
                            }}
                        >Ok, got it</Button>
                    </Col>
                </Row>
            </Container>
        )
    }
}

const VISIBLE_KEY = "HelpPanel.visible"

export function loadHelpVisible(): boolean {
    return "true" === localStorage.getItem(VISIBLE_KEY)
}

export function saveHelpVisible(helpVisible: boolean): void {
    localStorage.setItem(VISIBLE_KEY, helpVisible ? "true" : "false")
}

