import * as React from "react"
import {Button, ButtonGroup, ButtonToolbar} from "reactstrap"
import {Subscription} from "rxjs"
import {BehaviorSubject} from "rxjs/BehaviorSubject"

import {Hexalot} from "../island/hexalot"
import {IslandMode, IslandState} from "../island/island-state"

import {OrbitDistance} from "./orbit"

export enum Command {
    ClaimHexalot = "Claim hexalot",
    ComeHere = "Come here",
    DriveFree = "Drive free",
    DriveJourney = "Drive journey",
    Evolve = "Evolve",
    ForgetJourney = "Forget journey",
    GoThere = "Go there",
    Logout = "Logout",
    MakeLand = "Make into land",
    MakeWater = "Make into water",
    PlanJourney = "Plan journey",
    RandomGenome = "Random genome",
    ReturnHome = "Return home",
    RotateLeft = "Rotate left",
    RotateRight = "Rotate right",
    SaveGenome = "Save genome",
    StopMoving = "Stop moving",
}

export interface IActionsPanelProps {
    orbitDistance: BehaviorSubject<OrbitDistance>
    islandStateSubject: BehaviorSubject<IslandState>
    doCommand: (command: Command) => void
}

interface IActionPanelState {
    islandState: IslandState
}

interface IActionPanelProps {
    children: Array<JSX.Element | null> | JSX.Element
}

const ActionFrame = (props: IActionPanelProps) => <div className="action-frame">{props.children}</div>

export class ActionsPanel extends React.Component<IActionsPanelProps, IActionPanelState> {
    private subs: Subscription[] = []

    constructor(props: IActionsPanelProps) {
        super(props)
        this.state = {islandState: props.islandStateSubject.getValue()}
    }

    public componentDidMount(): void {
        this.subs.push(this.props.islandStateSubject.subscribe(islandState => this.setState({islandState})))
    }

    public componentWillUnmount(): void {
        this.subs.forEach(s => s.unsubscribe())
    }

    public render(): JSX.Element {
        const islandState = this.state.islandState
        const homeHexalot = islandState.homeHexalot
        const selectedHexalot = islandState.selectedHexalot
        switch (islandState.islandMode) {
            case IslandMode.FixingIsland:
                const spot = islandState.selectedSpot
                if (spot) {
                    if (spot.free) {
                        return this.freeSpot
                    } else if (spot.available) {
                        return this.availableHexalot
                    } else {
                        return (
                            <ActionFrame>
                                <p>You can claim this hexalot when the island has been fixed.</p>
                            </ActionFrame>
                        )
                    }
                }
                return (
                    <ActionFrame>
                        <p>Fixing island?</p>
                    </ActionFrame>
                )
            case IslandMode.Visiting:
                if (selectedHexalot) {
                    if (homeHexalot) {
                        if (homeHexalot.id === selectedHexalot.id) {
                            return this.homeHexalot(selectedHexalot)
                        } else {
                            return this.foreignHexalot(selectedHexalot)
                        }
                    } else {
                        return this.availableHexalot
                    }
                }
                return (
                    <ActionFrame>
                        <p>Select a hexalot</p>
                    </ActionFrame>
                )
            case IslandMode.Landed:
                return this.landed
            case IslandMode.PlanningJourney:
                return this.planningJourney
            case IslandMode.PlanningDrive:
                return this.planningDrive
            case IslandMode.Evolving:
                return this.evolving
            case IslandMode.DrivingFree:
            case IslandMode.DrivingJourney:
                return this.drivingGotchi
            default:
                return (
                    <ActionFrame>
                        <p>Strange state {islandState.islandMode}</p>
                    </ActionFrame>
                )
        }
    }

    private get planningJourney(): JSX.Element {
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

    private get planningDrive(): JSX.Element {
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
                    Command.Logout,
                ])}
            </ActionFrame>
        )
    }

    private homeHexalot(hexalot: Hexalot): JSX.Element {
        return (
            <ActionFrame>
                {this.buttons("Landed", [
                    Command.PlanJourney,
                    Command.DriveJourney,
                    Command.Evolve,
                    Command.Logout,
                    Command.RandomGenome,
                ])}
            </ActionFrame>
        )
    }

    private get drivingGotchi(): JSX.Element {
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

    private get evolving(): JSX.Element {
        return (
            <ActionFrame>
                {this.buttons("Evolving", [
                    Command.ReturnHome,
                ])}
            </ActionFrame>
        )
    }

    private get landed(): JSX.Element {
        return (
            <ActionFrame>
                {this.buttons("Landed", [
                    Command.PlanJourney,
                    Command.Evolve,
                    Command.DriveFree,
                    Command.Logout,
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
                onClick={() => this.props.doCommand(command)}
            >{command}</Button>
        )
    }
}
