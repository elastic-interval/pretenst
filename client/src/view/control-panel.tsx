/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import * as React from "react"
import { Button, Dropdown, DropdownItem, DropdownMenu, DropdownToggle } from "reactstrap"
import { Vector3 } from "three"

import { API_URI } from "../constants"
import { GlobalDocTitle } from "../docs/global-docs"
import { ToolbarState } from "../docs/toolbar-state-docs"
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
    visible: boolean
    helpVisible: boolean
    toolbarState: ToolbarState
    toolbarCommands: Command[]
    globalShowing: boolean
    globalDocTitle?: GlobalDocTitle
}

interface IContainerProps {
    children: Array<JSX.Element | null> | JSX.Element | string
}

export class ControlPanel extends React.Component<IControlProps, IControlState> {

    constructor(props: IControlProps) {
        super(props)
        const visible = props.appState.appMode !== AppMode.Flying
        const toolbarState = ToolbarState.Unknown
        this.state = {visible, toolbarState, toolbarCommands: [], globalShowing: false, helpVisible: false}
    }

    public componentWillReceiveProps(nextProps: Readonly<IControlProps>): void {
        const visible = nextProps.appState.appMode !== AppMode.Flying
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
                    <div className="control-panel-inner-left">
                        {this.innerLeft()}
                    </div>
                    <div className="control-panel-inner-middle">
                        {this.innerMiddle(island)}
                        {!this.state.helpVisible ? false : (
                            <HelpPanel
                                appState={this.props.appState}
                                toolbarState={this.state.toolbarState}
                                toolbarCommands={this.state.toolbarCommands}
                                globalDocTitle={this.state.globalDocTitle}
                                cancelHelp={() => this.setState({helpVisible: false})}
                            />
                        )}
                    </div>
                </div>
            </div>
        )
    }

    // =================================================================================================================

    private innerMiddle(island: Island): JSX.Element {
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
                    onClick={() => {
                        if (this.state.helpVisible) {
                            if (this.state.globalDocTitle) {
                                this.setState({globalDocTitle: undefined})
                            } else {
                                this.setState({helpVisible: false})
                            }
                        } else {
                            this.setState({helpVisible: true})
                        }
                    }}
                >{toolbarState}: </Button>

                {this.state.helpVisible ? false : toolbarCommands.map(command => this.commandButton(command))}

                <Dropdown className="about-dropdown" group={true} isOpen={this.state.globalShowing} size="sm"
                          toggle={() => {
                              this.setState({globalShowing: !this.state.globalShowing})
                          }}>
                    <DropdownToggle color="info" caret={true}>About</DropdownToggle>
                    <DropdownMenu>
                        {Object.keys(GlobalDocTitle).map(key => (
                            <DropdownItem key={key} onClick={() => {
                                this.setState({globalDocTitle: GlobalDocTitle[key], helpVisible: true})
                            }}>{key}</DropdownItem>
                        ))
                        }
                    </DropdownMenu>
                </Dropdown>

            </div>
        )
    }

    private commandButton(command: Command): JSX.Element {
        return (
            <Button
                key={command}
                color="success"
                className="command-button"
                onClick={() => this.execute(command)}
            >{command}</Button>
        )
    }

    private async execute(command: Command): Promise<void> {
        const props = this.props
        const nextState = await new CommandHandler(props.appState).afterCommand(command, props.location)
        props.appState.updateState(nextState)
    }

    private innerLeft(): JSX.Element | undefined {
        if (!this.props.user) {
            return (
                <a href={`${API_URI}/auth/twitter`}>
                    <img src="sign-in-with-twitter-gray.png" alt="Sign in with Twitter"/>
                </a>
            )
        }
        return (
            <a href={`${API_URI}/auth/logout`}>@{this.props.user.profile.username}</a>
        )
    }
}
