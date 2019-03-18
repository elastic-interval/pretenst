import * as React from "react"
import {Button, ButtonGroup, ButtonToolbar} from "reactstrap"
import {Subscription} from "rxjs"
import {BehaviorSubject} from "rxjs/BehaviorSubject"
import {Vector3} from "three"

import {Command, IslandMode, IslandState} from "../island/island-state"

import {OrbitDistance} from "./orbit"

export interface IActionsPanelProps {
    orbitDistance: BehaviorSubject<OrbitDistance>
    islandState: IslandState
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
        this.subs.push(this.props.islandState.subject.subscribe(islandState => this.setState({islandState})))
    }

    public componentWillUnmount(): void {
        this.subs.forEach(s => s.unsubscribe())
    }

    public render(): JSX.Element {
        const islandState = this.props.islandState
        switch (islandState.islandMode) {


            case IslandMode.FixingIsland: // ===========================================================================
                const spot = islandState.selectedSpot
                if (spot) {
                    if (islandState.islandIsLegal && spot.canBeClaimed) {
                        return (
                            <ActionFrame>
                                {this.buttons("Available", [
                                    Command.ClaimHexalot,
                                ])}
                            </ActionFrame>
                        )
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
                    if (spot.centerOfHexalot && !spot.centerOfHexalot.occupied) {
                        return (
                            <ActionFrame>
                                <p>You can claim this hexalot when the island has been fixed.</p>
                                {this.buttons("Fixing..", [
                                    Command.JumpToFix,
                                    Command.AbandonFix,
                                ])}
                            </ActionFrame>
                        )
                    }
                }
                return (
                    <ActionFrame>
                        <Message>
                            The island is not yet correct according to the rules.
                            Land must be either at the edge or have two land neighbors.
                            Water must have at least one land neighbor.
                            Click on the marked spots and you can choose to switch them to fix the island.
                        </Message>
                    </ActionFrame>
                )


            case IslandMode.Visiting: // ===============================================================================
                const hexalot = islandState.selectedHexalot
                if (hexalot) {
                    if (hexalot.centerSpot.canBeClaimed) {
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
                                Command.DriveFree,
                            ])}
                        </ActionFrame>
                    )
                }
                return (
                    <ActionFrame>
                        <p>
                            To login, select an existing hexalot.
                            You can also claim one of the green available hexalots,
                            but you will probably have to fix the island before you can claim it.
                        </p>
                    </ActionFrame>
                )


            case IslandMode.Landed: // =================================================================================
                if (islandState.selectedHome) {
                    return (
                        <ActionFrame>
                            {this.buttons("Home", [
                                Command.PrepareDrive,
                                Command.PlanJourney,
                                Command.DriveJourney,
                                Command.Evolve,
                                Command.RandomGenome,
                                Command.Logout,
                            ])}
                        </ActionFrame>
                    )
                } else {
                    return (
                        <ActionFrame>
                            {this.buttons("Visiting", [
                                Command.DriveFree,
                                Command.Logout,
                            ])}
                        </ActionFrame>
                    )
                }


            case IslandMode.PlanningJourney: // ========================================================================
                return (
                    <ActionFrame>
                        {this.buttons("Planning journey", [
                            Command.ForgetJourney,
                            Command.DriveJourney,
                            Command.Evolve,
                            Command.Return,
                        ])}
                    </ActionFrame>
                )


            case IslandMode.PreparingDrive: // ==========================================================================
                return (
                    <ActionFrame>
                        {this.buttons("Drive", [
                            Command.RotateLeft,
                            Command.RotateRight,
                            Command.DriveFree,
                            Command.Return,
                        ])}
                    </ActionFrame>
                )


            case IslandMode.Evolving: // ===============================================================================
                return (
                    <ActionFrame>
                        {this.buttons("Evolving", [
                            Command.Return,
                        ])}
                    </ActionFrame>
                )


            case IslandMode.DrivingFree: // ============================================================================
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


            case IslandMode.DrivingJourney: // =========================================================================
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
                        <p>Strange state {islandState.islandMode}</p>
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
                onClick={() => this.props.islandState.stateAfterCommand(command, this.props.location).dispatch()}
            >{command}</Button>
        )
    }
}
