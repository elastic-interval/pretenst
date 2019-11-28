/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import * as React from "react"
import { Button, ButtonToolbar, Card, CardBody, CardFooter, CardTitle } from "reactstrap"

import { DOCS_ON_GITHUB } from "../constants"
import { getCommandDoc } from "../docs/command-docs"
import { TOOLBAR_STATE_DOCS, ToolbarState } from "../docs/toolbar-state-docs"
import { Command, IAppState } from "../state/app-state"

export interface IHelpProps {
    appState: IAppState
    toolbarState: ToolbarState
    toolbarCommands: Command[]
    cancelHelp: () => void
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
                <a className="btn btn-info command-button" href={DOCS_ON_GITHUB} target="_blank">Background information</a>
                <Button
                    className="float-right"
                    color="info"
                    onClick={() => this.props.cancelHelp()}
                >Ok, got it</Button>
            </ButtonToolbar>
        )
    }
}
