/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import * as React from "react"
import { Button, ButtonToolbar, Card, CardBody, CardFooter, CardHeader, CardTitle } from "reactstrap"

import { getCommandDoc } from "../docs/command-docs"
import { GLOBAL_DOCS, GlobalDocTitle } from "../docs/global-docs"
import { TOOLBAR_STATE_DOCS, ToolbarState } from "../docs/toolbar-state-docs"
import { Command, IAppState } from "../state/app-state"

export interface IHelpProps {
    appState: IAppState
    toolbarState: ToolbarState
    toolbarCommands: Command[]
    cancelHelp: () => void
    globalDocTitle?: GlobalDocTitle
}

export interface IHelpState {
    placeholder?: boolean
}

export class HelpPanel extends React.Component<IHelpProps, IHelpState> {

    constructor(props: IHelpProps) {
        super(props)
        this.state = {}
    }

    public render(): JSX.Element | boolean {
        const globalCardName = this.props.globalDocTitle
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
        const commandDocs = this.props.toolbarCommands.map(getCommandDoc)
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
                    {commandDocs.map(commandDoc => (
                        <div key={commandDoc.title}>
                            <Button color="success" className="command-button">{commandDoc.title}</Button>
                            {commandDoc.body}
                        </div>
                    ))}
                </CardBody>
                <CardFooter>{this.footer()}</CardFooter>
            </Card>
        )
    }

    private footer(): JSX.Element {
        return (
            <ButtonToolbar>
                <Button
                    size="sm"
                    className="float-right"
                    color="info"
                    onClick={() => this.props.cancelHelp()}
                >Ok, got it</Button>
            </ButtonToolbar>
        )
    }
}
