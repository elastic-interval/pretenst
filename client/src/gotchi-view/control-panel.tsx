
/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import * as React from "react"
import { CSSProperties } from "react"
import { Button } from "reactstrap"
import { Vector3 } from "three"

import { APP_EVENT, AppEvent } from "../app-event"
import { ToolbarState } from "../docs/gotchidocs/toolbar-state-docs"
import { Island } from "../island/island"
import { AppMode, Command, homeHexalotSelected, IAppState } from "../state/app-state"
import { CommandHandler } from "../state/command-handler"
import { IUser } from "../storage/remote-storage"

import { HelpPanel } from "./help-panel"

export interface IControlProps {
    appState: IAppState
    location: Vector3
    user?: IUser
}

export interface IControlState {
    helpVisible: boolean
    toolbarState: ToolbarState
    toolbarCommands: Command[]
}

interface IContainerProps {
    children: (JSX.Element | null)[] | JSX.Element | string
}

const style: CSSProperties = {
    height: "auto",
    width: "auto",
    maxWidth: "70%",
    display: "inline-flex",
    textAlign: "left",
    background: "black",
    padding: "4px",
    margin: "5px",
    borderColor: "inherit",
    borderWidth: "2px",
    borderStyle: "solid",
    borderRadius: "10px",
}

export class ControlPanel extends React.Component<IControlProps, IControlState> {

    constructor(props: IControlProps) {
        super(props)
        const toolbarState = ToolbarState.Unknown
        this.state = {toolbarState, toolbarCommands: [], helpVisible: false}
    }

    public render(): JSX.Element | boolean {
        const island = this.props.appState.island
        return (
            <div style={style}>
                {this.props.appState.appMode === AppMode.Flying || !island ?
                    (
                        <Button
                            color="info"
                            className="command-button"
                        >Hold on!</Button>
                    ) :
                    (
                        <div>
                            {this.commandButtons(island)}
                            {!this.state.helpVisible ? false : (
                                <HelpPanel
                                    appState={this.props.appState}
                                    toolbarState={this.state.toolbarState}
                                    toolbarCommands={this.state.toolbarCommands}
                                    cancelHelp={() => this.setState({helpVisible: false})}
                                />
                            )}
                        </div>
                    )}
            </div>
        )
    }

    // =================================================================================================================

    private commandButtons(island: Island): JSX.Element {
        const appState = this.props.appState
        const vacant = island.vacantHexalot
        const spot = appState.selectedSpot
        const hexalot = appState.selectedHexalot
        const homeHexalot = appState.homeHexalot
        const singleHexalot = island.singleHexalot
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
                                Command.Cancel,
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
                    return this.buttonToolbar(ToolbarState.Friend,
                        Command.Ride,
                        Command.Home,
                    )
                } else if (this.props.user) {
                    return (
                        <p>
                            You are logged in but you have not yet claimed a hexalot.
                            The spots highlighted in green are places that you can claim.
                            You can also click on one of the existing hexalots and go for a ride on the galapagotchi
                            there.
                        </p>
                    )
                } else {
                    return (
                        <p>
                            You can click on one of the hexalots and go for a ride on the galapagotchi who lives there.
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

    private buttonToolbar(toolbarState: ToolbarState, ...toolbarCommands: Command[]): JSX.Element {
        setTimeout(() => {
            this.setState({toolbarState, toolbarCommands})
        })
        return (
            <div>
                <Button
                    color="info"
                    className="command-button"
                    onClick={() => this.setState({helpVisible: !this.state.helpVisible})}
                >{toolbarState}: </Button>
                {this.state.helpVisible ? false : (
                    toolbarCommands.map(command => this.commandButton(command))
                )}
            </div>
        )
    }

    private commandButton(command: Command): JSX.Element {
        return (
            <Button
                key={command}
                color="success"
                className="command-button"
                onClick={async () => this.execute(command)}
            >{command}</Button>
        )
    }

    private async execute(command: Command): Promise<void> {
        const props = this.props
        const nextState = await new CommandHandler(props.appState).afterCommand(command, props.location)
        APP_EVENT.next({event: AppEvent.Command, command})
        props.appState.updateState(nextState)
    }
}
