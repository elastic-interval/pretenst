import * as React from "react"
import {Button, ButtonGroup, ButtonToolbar} from "reactstrap"
import {Subscription} from "rxjs"
import {BehaviorSubject} from "rxjs/BehaviorSubject"
import {Vector3} from "three"

import {Hexalot} from "../island/hexalot"
import {Command, IslandMode, IslandState} from "../island/island-state"
import {Spot} from "../island/spot"

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
            case IslandMode.FixingIsland:
                return this.FixingIsland(islandState.selectedSpot)
            case IslandMode.Visiting:
                return this.Visiting(islandState.selectedHexalot)
            case IslandMode.Landed:
                const homeHexalot = islandState.homeHexalot
                if (!homeHexalot) {
                    throw new Error("Landed with no home?")
                }
                return this.Landed(homeHexalot, islandState.selectedHexalot)
            case IslandMode.PlanningJourney:
                return this.PlanningJourney
            case IslandMode.PlanningDrive:
                return this.PlanningDrive
            case IslandMode.Evolving:
                return this.Evolving
            case IslandMode.DrivingFree:
            case IslandMode.DrivingJourney:
                return this.DrivingGotchi
            default:
                return (
                    <ActionFrame>
                        <p>Strange state {islandState.islandMode}</p>
                    </ActionFrame>
                )
        }
    }

    private FixingIsland(selectedSpot?: Spot): JSX.Element {
        if (selectedSpot) {
            if (selectedSpot.free) {
                return this.freeSpot
            } else if (selectedSpot.available) {
                return this.availableHexalot
            } else {
                const hexalot = selectedSpot.centerOfHexalot
                if (hexalot) {
                    if (hexalot.occupied) {
                        return (
                            <ActionFrame>
                                <p>Occupied</p>
                            </ActionFrame>
                        )
                    } else {
                        return (
                            <ActionFrame>
                                <p>You can claim this hexalot when the island has been fixed.</p>
                                {this.buttons("Repair", [
                                    Command.JumpToFix,
                                    Command.AbandonFix,
                                ])}
                            </ActionFrame>
                        )
                    }
                } else {
                    return (
                        <ActionFrame>
                            <p>Nothing to see here.</p>
                        </ActionFrame>
                    )
                }
            }
        } else {
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
        }
    }

    private Visiting(selectedHexalot?: Hexalot): JSX.Element {
        if (selectedHexalot) {
            if (selectedHexalot.centerSpot.available) {
                return this.availableHexalot
            }
            return selectedHexalot.occupied ? this.foreignHexalot(selectedHexalot) : this.availableHexalot
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
    }

    private Landed(homeHexalot: Hexalot, selectedHexalot?: Hexalot): JSX.Element {
        return (
            <ActionFrame>
                {this.buttons("Landed", [
                    Command.PlanFreeDrive,
                    Command.PlanJourney,
                    Command.Evolve,
                    Command.DriveFree,
                    Command.Logout,
                ])}
            </ActionFrame>
        )
    }

    private get PlanningJourney(): JSX.Element {
        return (
            <ActionFrame>
                {this.buttons("Planning journey", [
                    Command.ForgetJourney,
                    Command.DriveJourney,
                    Command.Evolve,
                    Command.ReturnHome,
                ])}
            </ActionFrame>
        )
    }

    private get PlanningDrive(): JSX.Element {
        return (
            <ActionFrame>
                {this.buttons("Drive", [
                    Command.RotateLeft,
                    Command.RotateRight,
                    Command.DriveFree,
                ])}
            </ActionFrame>
        )
    }

    private foreignHexalot(hexalot: Hexalot): JSX.Element {
        return (
            <ActionFrame>
                {this.buttons("Foreign", [
                    Command.DriveFree,
                ])}
            </ActionFrame>
        )
    }

    private get DrivingGotchi(): JSX.Element {
        return (
            <ActionFrame>
                {this.buttons("Driving", [
                    Command.ReturnHome,
                    Command.ComeHere,
                    Command.GoThere,
                    Command.StopMoving,
                ])}
            </ActionFrame>
        )
    }

    private get Evolving(): JSX.Element {
        return (
            <ActionFrame>
                {this.buttons("Evolving", [
                    Command.ReturnHome,
                ])}
            </ActionFrame>
        )
    }

    private get availableHexalot(): JSX.Element {
        return (
            <ActionFrame>
                {this.buttons("Available", [
                    Command.ClaimHexalot,
                ])}
            </ActionFrame>
        )
    }

    private get freeSpot(): JSX.Element {
        return (
            <ActionFrame>
                {this.buttons("Free", [
                    Command.MakeLand,
                    Command.MakeWater,
                ])}
            </ActionFrame>
        )
    }

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
