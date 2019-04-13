/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import * as React from "react"
import {
    Button,
    ButtonToolbar,
    Card,
    CardBody,
    CardFooter,
    CardHeader,
    CardText,
    CardTitle,
    Dropdown,
    DropdownItem,
    DropdownMenu,
    DropdownToggle,
} from "reactstrap"

import { COMMAND_DOCS } from "../docs/command-docs"
import { GLOBAL_DOCS, GlobalDocTitle } from "../docs/global-docs"
import { TOOLBAR_STATE_DOCS, ToolbarState } from "../docs/toolbar-state-docs"
import { Command, IAppState } from "../state/app-state"
import { Transition } from "../state/transition"


export interface IHelpProps {
    appState: IAppState
    toolbarState: ToolbarState
    command?: Command
}

export interface IHelpState {
    globalShowing: boolean
    globalDocTitle?: GlobalDocTitle
}

export class HelpPanel extends React.Component<IHelpProps, IHelpState> {

    constructor(props: IHelpProps) {
        super(props)
        this.state = {globalShowing: false}
    }

    public componentWillMount(): void {
        this.setState({globalDocTitle: undefined})
    }

    public render(): JSX.Element | boolean {
        if (!this.props.appState.helpVisible) {
            return false
        }
        const globalCardName = this.state.globalDocTitle
        if (globalCardName) {
            const foundCard = GLOBAL_DOCS.find(card => card.title === globalCardName)
            if (!foundCard) {
                return false
            }
            return (
                <Card>
                    <CardHeader>
                        <CardTitle>{globalCardName}</CardTitle>
                    </CardHeader>
                    {foundCard.body}
                    <CardFooter>{this.footer()}</CardFooter>
                </Card>
            )
        }
        const toolbarStateDoc = TOOLBAR_STATE_DOCS.find(d => d.title === this.props.toolbarState)
        const commandDoc = COMMAND_DOCS.find(d => d.title === this.props.command)
        return (
            <Card>
                <CardBody>
                    {toolbarStateDoc ? (
                        <div>
                            <CardTitle>{toolbarStateDoc.title}</CardTitle>
                            {toolbarStateDoc.body}
                        </div>
                    ) : false}
                    <br/>
                    {commandDoc ? (
                        <div>
                            <CardTitle>{commandDoc.title}</CardTitle>
                            {commandDoc.body}
                        </div>
                    ) : (
                        <CardText>Click on a command button to get info about each one.</CardText>
                    )}
                </CardBody>
                <CardFooter>{this.footer()}</CardFooter>
            </Card>
        )
    }

    private footer(): JSX.Element {
        return (
            <ButtonToolbar>
                <Dropdown group={true} isOpen={this.state.globalShowing} size="sm" toggle={() => {
                    this.setState({globalShowing: !this.state.globalShowing})
                }}>
                    <DropdownToggle color="info" caret={true}>About Galapagotchi</DropdownToggle>
                    <DropdownMenu>
                        {Object.keys(GlobalDocTitle).map(key => {
                            return (
                                <DropdownItem key={key} onClick={() => {
                                    this.setState({globalDocTitle: GlobalDocTitle[key]})
                                }}>{key}</DropdownItem>
                            )
                        })}
                    </DropdownMenu>
                </Dropdown>
                <Button
                    size="sm"
                    className="float-right"
                    color="info"
                    onClick={() => {
                        this.setState({globalDocTitle: undefined})
                        const appState = this.props.appState
                        appState.updateState(new Transition(appState).withHelpVisible(false).appState)
                    }}
                >Ok, got it</Button>
            </ButtonToolbar>
        )
    }
}
