/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import * as React from "react"
import { Button } from "reactstrap"
import { Vector3 } from "three"

import { ToolbarState } from "../docs/toolbar-state-docs"
import { Island } from "../island/island"
import { AppMode, Command, homeHexalotSelected, IAppState, isInTransit } from "../state/app-state"
import { CommandHandler } from "../state/command-handler"
import { Transition } from "../state/transition"

import { HelpPanel } from "./help-panel"

export interface IControlProps {
    appState: IAppState
    location: Vector3
}

export interface IControlState {
    visible: boolean
    toolbarState: ToolbarState
    command?: Command
}

interface IContainerProps {
    children: Array<JSX.Element | null> | JSX.Element | string
}

export class ControlPanel extends React.Component<IControlProps, IControlState> {

    constructor(props: IControlProps) {
        super(props)
        const visible = !isInTransit(props.appState)
        const toolbarState = ToolbarState.Unknown
        this.state = {visible, toolbarState}
    }

    public componentWillReceiveProps(nextProps: Readonly<IControlProps>): void {
        const visible = !isInTransit(nextProps.appState)
        this.setState({visible})
    }

    public render(): JSX.Element | boolean {
        const island = this.props.appState.island
        if (!this.state.visible || !island) {
            return false
        }
        return (
            <div className="control-panel-outer">
                <div className="control-panel-inner">
                    {this.frameContents(island)}
                    <HelpPanel
                        appState={this.props.appState}
                        toolbarState={this.state.toolbarState}
                        command={this.state.command}
                    />
                </div>
            </div>
        )
    }

    // =================================================================================================================

    private frameContents(island: Island): JSX.Element {
        const appState = this.props.appState
        const vacant = island.vacantHexalot
        const spot = appState.selectedSpot
        const hexalot = appState.selectedHexalot
        const homeHexalot = appState.homeHexalot
        const singleHexalot = island.hexalots.length === 1 ? island.hexalots[0] : undefined

        const Message = (props: IContainerProps) => <p>{props.children}</p>


        switch (appState.appMode) {


            case AppMode.Terraforming:
                if (spot) {
                    if (singleHexalot && spot.coords === singleHexalot.centerSpot.coords) {
                        return this.buttonToolbar(ToolbarState.Pioneering,
                            Command.ClaimHexalot,
                        )
                    }
                    if (spot.isCandidateHexalot(vacant) && !singleHexalot) {
                        if (appState.islandIsLegal) {
                            return this.buttonToolbar(ToolbarState.AvailableSpot,
                                Command.ClaimHexalot,
                            )
                        } else {
                            return this.buttonToolbar(ToolbarState.Terraforming,
                                Command.Terraform,
                                Command.AbandonTerraforming,
                            )
                        }
                    }
                    if (spot.free) {
                        return this.buttonToolbar(ToolbarState.FreeSpot,
                            Command.MakeLand,
                            Command.MakeWater,
                        )
                    }
                }
                return (
                    <Message>
                        The island is not yet correct according to the rules.
                        Land must be either at the edge or have two land neighbors.
                        Water must have at least one land neighbor.
                        Click on the marked spots and you can choose to switch them to fix the island.
                    </Message>
                )


            case AppMode.Exploring:
                if (homeHexalotSelected(appState)) {
                    return this.buttonToolbar(ToolbarState.Home,
                        Command.Plan,
                        Command.Ride,
                        Command.Evolve,
                        Command.DiscardGenes,
                    )
                } else if (hexalot) {
                    if (!homeHexalot && hexalot.centerSpot.isCandidateHexalot(vacant)) {
                        return this.buttonToolbar(ToolbarState.AvailableSpot,
                            Command.ClaimHexalot,
                        )
                    }
                    return this.buttonToolbar(ToolbarState.Foreign,
                        Command.Ride,
                        Command.Home,
                    )
                } else {
                    return (
                        <p>
                            You can click on one of the hexalots and go for a ride.
                        </p>
                    )
                }


            case AppMode.Planning:
                return this.buttonToolbar(ToolbarState.Planning,
                    Command.Home,
                )


            case AppMode.Evolving:
                return this.buttonToolbar(ToolbarState.Evolving,
                    Command.Ride,
                    Command.Home,
                )


            case AppMode.Riding:
                return this.buttonToolbar(ToolbarState.Riding,
                    Command.Home,
                    Command.Stop,
                )


            case AppMode.Stopped:
                return this.buttonToolbar(ToolbarState.Riding,
                    Command.Home,
                    Command.Start,
                    Command.Evolve,
                )


            default:
                return (
                    <p>Strange state {appState.appMode}</p>
                )


        }
    }

    private buttonToolbar(toolbarState: ToolbarState, ...commands: Command[]): JSX.Element {
        setTimeout(() => {
            this.setState({toolbarState})
        })
        return (
            <div>
                <Button
                    color="info"
                    className="command-button"
                    active={!this.props.appState.helpVisible}
                    onClick={() => this.toggleHelp(toolbarState)}
                >{toolbarState}: </Button>
                {commands.map(command => this.commandButton(command))}
                <Button
                    color="info"
                    className="command-button"
                    active={!this.props.appState.helpVisible}
                    onClick={() => this.toggleHelp(toolbarState)}
                >?</Button>
            </div>
        )
    }

    private toggleHelp(toolbarState: ToolbarState): void {
        const appState = this.props.appState
        const helpVisible = !appState.helpVisible
        appState.updateState(new Transition(appState).withHelpVisible(helpVisible).appState)
        this.setState({toolbarState, command: undefined})
    }

    private commandButton(command: Command): JSX.Element {
        const helpVisible = this.props.appState.helpVisible
        return (
            <Button
                key={command}
                color="success"
                className="command-button"
                onClick={() => {
                    if (helpVisible) {
                        this.setState({command})
                    } else {
                        this.execute(command)
                    }
                }}
            >{helpVisible ? `?${command}?` : command}</Button>
        )
    }

    private async execute(command: Command): Promise<void> {
        const props = this.props
        const nextState = await new CommandHandler(props.appState).afterCommand(command, props.location)
        props.appState.updateState(nextState)
    }
}
