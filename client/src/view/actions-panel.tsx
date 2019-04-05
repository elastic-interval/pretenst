/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import * as React from "react"
import { Button, ButtonGroup, ButtonToolbar } from "reactstrap"
import { Vector3 } from "three"

import { AppMode, Command, homeHexalotSelected, IAppState } from "../state/app-state"
import { CommandHandler } from "../state/command-handler"

export interface IActionsPanelProps {
    appState: IAppState
    location: Vector3
}

export interface IActionsPanelState {
    visible: boolean
}

interface IContainerProps {
    children: Array<JSX.Element | null> | JSX.Element | string
}

const ActionFrame = (props: IContainerProps) => (
    <div className="actions-panel-outer floating-panel">
        <div className="actions-panel-inner">
            <div className="action-frame">{props.children}</div>
        </div>
    </div>
)

const Message = (props: IContainerProps) => <p>{props.children}</p>

export class ActionsPanel extends React.Component<IActionsPanelProps, IActionsPanelState> {

    constructor(props: IActionsPanelProps) {
        super(props)
        this.state = {visible: props.appState.appMode !== AppMode.Arriving}
    }

    public componentWillReceiveProps(nextProps: Readonly<IActionsPanelProps>): void {
        this.setState({visible: nextProps.appState.appMode !== AppMode.Arriving})
    }

    public render(): JSX.Element | boolean {

        if (!this.state.visible) {
            return false
        }

        const appState = this.props.appState
        const island = appState.island

        if (!island) {
            return false
        }

        const vacant = island.vacantHexalot
        const spot = appState.selectedSpot
        const hexalot = appState.selectedHexalot
        const homeHexalot = appState.homeHexalot
        const singleHexalot = island.hexalots.length === 1 ? island.hexalots[0] : undefined

        switch (appState.appMode) {


            case AppMode.FixingIsland: // ==============================================================================
                if (spot) {
                    if (singleHexalot && spot.coords === singleHexalot.centerSpot.coords) {
                        return (
                            <ActionFrame>
                                {this.buttons("First hexalot available", [
                                    Command.ClaimHexalot,
                                ])}
                            </ActionFrame>
                        )
                    }
                    if (spot.isCandidateHexalot(vacant) && !singleHexalot) {
                        if (appState.islandIsLegal) {
                            return (
                                <ActionFrame>
                                    {this.buttons("Available", [
                                        Command.ClaimHexalot,
                                    ])}
                                </ActionFrame>
                            )
                        } else {
                            return (
                                <ActionFrame>
                                    <p>You can claim this hexalot when the island has been fixed.</p>
                                    {this.buttons("Fixing island", [
                                        Command.Terraform,
                                        Command.AbandonFix,
                                    ])}
                                </ActionFrame>
                            )
                        }
                    }
                    if (spot.free) {
                        return (
                            <ActionFrame>
                                {this.buttons("Free", [
                                    Command.MakeLand,
                                    Command.MakeWater,
                                ])}
                            </ActionFrame>
                        )
                    }
                }
                return (
                    <ActionFrame>
                        <Message>
                            Hello.
                            The island is not yet correct according to the rules.
                            Land must be either at the edge or have two land neighbors.
                            Water must have at least one land neighbor.
                            Click on the marked spots and you can choose to switch them to fix the island.
                        </Message>
                    </ActionFrame>
                )


            case AppMode.Visiting: // ==================================================================================
                if (homeHexalotSelected(appState)) {
                    return (
                        <ActionFrame>
                            {this.buttons("Home", [
                                Command.PlanJourney,
                                Command.Ride,
                                Command.Evolve,
                                Command.RandomGenome,
                            ])}
                        </ActionFrame>
                    )
                } else if (hexalot) {
                    if (!homeHexalot && hexalot.centerSpot.isCandidateHexalot(vacant)) {
                        return (
                            <ActionFrame>
                                {this.buttons("Available", [
                                    Command.ClaimHexalot,
                                ])}
                            </ActionFrame>
                        )
                    }
                    return (
                        <ActionFrame>
                            {this.buttons("Foreign", [
                                Command.Ride,
                                Command.Return,
                            ])}
                        </ActionFrame>
                    )
                } else {
                    return (
                        <ActionFrame>
                            <p>
                                You can click on one of the hexalots and go for a ride.
                            </p>
                        </ActionFrame>
                    )
                }


            case AppMode.PlanningJourney: // ===========================================================================
                return (
                    <ActionFrame>
                        {this.buttons("Planning journey", [
                            Command.ForgetJourney,
                            Command.Ride,
                            Command.Evolve,
                            Command.Return,
                        ])}
                    </ActionFrame>
                )


            case AppMode.Evolving: // ==================================================================================
                return (
                    <ActionFrame>
                        {this.buttons("Evolving", [
                            Command.Return,
                        ])}
                    </ActionFrame>
                )


            case AppMode.Riding: // ====================================================================================
                return (
                    <ActionFrame>
                        {this.buttons("Riding journey", [
                            Command.Return,
                            Command.StopMoving,
                        ])}
                    </ActionFrame>
                )


            default: // ================================================================================================
                return (
                    <ActionFrame>
                        <p>Strange state {appState.appMode}</p>
                    </ActionFrame>
                )


        }
    }

    // =================================================================================================================

    private buttons(prompt: string, commands: Command[]): JSX.Element {
        return (
            <ButtonToolbar>
                <span className="action-prompt">{prompt}:</span>
                <ButtonGroup>{commands.map(command => this.commandButton(command))}</ButtonGroup>
            </ButtonToolbar>
        )
    }

    private commandButton(command: Command): JSX.Element {
        return (
            <Button
                key={command}
                outline={true}
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
}
