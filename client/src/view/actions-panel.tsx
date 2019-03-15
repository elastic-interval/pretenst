import * as React from "react"
import {Button, ButtonGroup, ButtonToolbar} from "reactstrap"
import {Subscription} from "rxjs"
import {BehaviorSubject} from "rxjs/BehaviorSubject"

import {Hexalot} from "../island/hexalot"
import {IslandMode, IslandState} from "../island/island-state"
import {Spot} from "../island/spot"

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
    PlanFreeDrive = "Plan free drive",
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
    islandState: IslandState
    doCommand: (command: Command) => void
}

interface IActionPanelState {
    islandState: IslandState
}

interface IContainerProps {
    children: Array<JSX.Element | null> | JSX.Element | string
}

const ActionFrame = (props: IContainerProps) => <div className="action-frame">{props.children}</div>

const Message = (props: IContainerProps) => <p>{props.children}</p>

export class ActionsPanel extends React.Component<IActionsPanelProps, IActionPanelState> {
    private subs: Subscription[] = []

    constructor(props: IActionsPanelProps) {
        super(props)
        this.state = {islandState: props.islandState}
    }

    public componentDidMount(): void {
        this.subs.push(this.props.islandState.subject.subscribe(islandState => this.setState({islandState})))
    }

    public componentWillUnmount(): void {
        this.subs.forEach(s => s.unsubscribe())
    }

    public render(): JSX.Element {
        const islandState = this.state.islandState
        switch (islandState.islandMode) {
            case IslandMode.FixingIsland:
                return this.fixingIsland(islandState.selectedSpot)
            case IslandMode.Visiting:
                return this.visiting(islandState.selectedHexalot)
            case IslandMode.Landed:
                const homeHexalot = islandState.homeHexalot
                if (!homeHexalot) {
                    throw new Error("Landed with no home?")
                }
                return this.landed(homeHexalot, islandState.selectedHexalot)
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

    private fixingIsland(selectedSpot?: Spot): JSX.Element {
        if (selectedSpot) {
            if (selectedSpot.free) {
                return this.freeSpot
            } else if (selectedSpot.available) {
                return this.availableHexalot
            } else {
                return (
                    <ActionFrame>
                        <p>You can claim this hexalot when the island has been fixed.</p>
                    </ActionFrame>
                )
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

    private visiting(selectedHexalot?: Hexalot): JSX.Element {
        if (selectedHexalot) {
            if (selectedHexalot.centerSpot.available) {
                return this.availableHexalot
            } else {
                return this.foreignHexalot(selectedHexalot)
            }
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

    private landed(homeHexalot: Hexalot, selectedHexalot?: Hexalot): JSX.Element {
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
