/*
 * Copyright (c) 2019. Beautiful Code BV, Rotterdam, Netherlands
 * Licensed under GNU GENERAL PUBLIC LICENSE Version 3.
 */

import * as React from "react"
import { Button, ButtonGroup, ButtonToolbar } from "reactstrap"
import { Subject, Subscription } from "rxjs"
import { BehaviorSubject } from "rxjs/BehaviorSubject"
import { Vector3 } from "three"

import { Command, homeHexalotSelected, IAppState, Mode } from "../state/app-state"
import { CommandHandler } from "../state/command-handler"

import { OrbitDistance } from "./orbit"

export interface IActionsPanelProps {
    orbitDistance: BehaviorSubject<OrbitDistance>
    stateSubject: Subject<IAppState>
    appState: IAppState
    location: Vector3
}

interface IContainerProps {
    children: Array<JSX.Element | null> | JSX.Element | string
}

const ActionFrame = (props: IContainerProps) => <div className="action-frame">{props.children}</div>

const Message = (props: IContainerProps) => <p>{props.children}</p>

export class ActionsPanel extends React.Component<IActionsPanelProps, object> {
    private subs: Subscription[] = []

    constructor(props: IActionsPanelProps) {
        super(props)
    }

    public componentDidMount(): void {
        this.subs.push(this.props.stateSubject.subscribe(appState => this.setState({appState})))
    }

    public componentWillUnmount(): void {
        this.subs.forEach(s => s.unsubscribe())
    }

    public render(): JSX.Element {

        const appState = this.props.appState
        const island = appState.island
        const vacant = island.vacantHexalot
        const spot = appState.selectedSpot
        const singleHexalot = island.hexalots.length === 1 ? island.hexalots[0] : undefined

        switch (appState.mode) {


            case Mode.FixingIsland: // ===========================================================================
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


            case Mode.Visiting: // ===============================================================================
                const hexalot = appState.selectedHexalot
                if (hexalot) {
                    if (hexalot.centerSpot.isCandidateHexalot(vacant)) {
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
                                Command.RideFree,
                            ])}
                        </ActionFrame>
                    )
                }
                return (
                    <ActionFrame>
                        <p>
                            You can click on one of the hexalots and go for a ride.
                        </p>
                    </ActionFrame>
                )


            case Mode.Landed: // =================================================================================
                if (homeHexalotSelected(appState)) {
                    return (
                        <ActionFrame>
                            {this.buttons("Home", [
                                Command.PrepareToRide,
                                Command.PlanJourney,
                                Command.RideJourney,
                                Command.Evolve,
                                Command.RandomGenome,
                            ])}
                        </ActionFrame>
                    )
                } else if (appState.selectedHexalot) {
                    return (
                        <ActionFrame>
                            {this.buttons("Visiting", [
                                Command.RideFree,
                                Command.Return,
                            ])}
                        </ActionFrame>
                    )
                } else {
                    return (
                        <ActionFrame>
                            {this.buttons("Empty spot", [
                                Command.Return,
                            ])}
                        </ActionFrame>
                    )
                }


            case Mode.PlanningJourney: // ========================================================================
                return (
                    <ActionFrame>
                        {this.buttons("Planning journey", [
                            Command.ForgetJourney,
                            Command.RideJourney,
                            Command.Evolve,
                            Command.Return,
                        ])}
                    </ActionFrame>
                )


            case Mode.PreparingRide: // ==========================================================================
                return (
                    <ActionFrame>
                        {this.buttons("Drive", [
                            Command.RotateLeft,
                            Command.RotateRight,
                            Command.RideFree,
                            Command.Return,
                        ])}
                    </ActionFrame>
                )


            case Mode.Evolving: // ===============================================================================
                return (
                    <ActionFrame>
                        {this.buttons("Evolving", [
                            Command.Return,
                        ])}
                    </ActionFrame>
                )


            case Mode.RidingFree: // ============================================================================
                return (
                    <ActionFrame>
                        {this.buttons("Driving free", [
                            Command.Return,
                            Command.ComeHere,
                            Command.GoThere,
                            Command.StopMoving,
                        ])}
                    </ActionFrame>
                )


            case Mode.RidingJourney: // =========================================================================
                return (
                    <ActionFrame>
                        {this.buttons("Driving journey", [
                            Command.Return,
                            Command.StopMoving,
                        ])}
                    </ActionFrame>
                )


            default: // ================================================================================================
                return (
                    <ActionFrame>
                        <p>Strange state {appState.mode}</p>
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
                color="primary"
                className="command-button"
                onClick={() => this.execute(command)}
            >{command}</Button>
        )
    }

    private async execute(command: Command): Promise<void> {
        const props = this.props
        const nextState = await new CommandHandler(props.appState).afterCommand(command, props.location)
        props.stateSubject.next(nextState)
    }
}
