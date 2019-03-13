import * as React from "react"
import {Button, ButtonGroup, ButtonToolbar} from "reactstrap"
import {Subscription} from "rxjs"
import {BehaviorSubject} from "rxjs/BehaviorSubject"
import {Vector3} from "three"

import {Hexalot} from "../island/hexalot"
import {IslandMode, IslandState} from "../island/island-state"

import {OrbitDistance} from "./orbit"

export enum Command {
    DETACH = "Detach",
    SAVE_GENOME = "Save genome",
    RANDOM_GENOME = "Random genome",
    RETURN_TO_SEED = "Return to seed",
    DRIVE_FREE = "Drive free",
    DRIVE_JOURNEY = "Drive journey",
    TURN_LEFT = "Left",
    TURN_RIGHT = "Right",
    COME_HERE = "Come Here",
    GO_THERE = "Go There",
    STOP = "Stop",
    EVOLVE = "Evolve",
    FORGET_JOURNEY = "Forget journey",
    CLAIM_HEXALOT = "Claim Hexalot",
    CREATE_LAND = "Create Land",
    CREATE_WATER = "Create Water",
}

export interface IActionsPanelProps {
    orbitDistance: BehaviorSubject<OrbitDistance>
    cameraLocation: Vector3
    islandStateSubject: BehaviorSubject<IslandState>
    doCommand: (command: Command, location?: Vector3) => void
}

interface IActionPanelState {
    islandState: IslandState
}

interface IActionPanelProps {
    children: Array<JSX.Element | null> | JSX.Element
}

const ActionFrame = (props: IActionPanelProps) => (
    <div className="action-frame">
        {props.children}
    </div>
)

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
                        <p>Strange state</p>
                    </ActionFrame>
                )
        }
    }

    private get planningJourney(): JSX.Element {
        return (
            <ActionFrame>
                <p>Planning journey</p>
            </ActionFrame>
        )
    }

    private get planningDrive(): JSX.Element {
        return (
            <ActionFrame>
                <p>Planning Drive</p>
            </ActionFrame>
        )
    }

    private foreignHexalot(hexalot: Hexalot): JSX.Element {
        return (
            <ActionFrame>
                {this.buttons("Foreign", [
                    Command.DRIVE_FREE,
                    Command.DETACH,
                ])}
            </ActionFrame>
        )
    }

    private homeHexalot(hexalot: Hexalot): JSX.Element {
        return (
            <ActionFrame>
                {this.buttons("Landed", [
                    Command.TURN_LEFT,
                    Command.TURN_RIGHT,
                    Command.DRIVE_FREE,
                    Command.DRIVE_JOURNEY,
                    Command.EVOLVE,
                    Command.FORGET_JOURNEY,
                    Command.DETACH,
                    Command.RANDOM_GENOME,
                ])}
            </ActionFrame>
        )
    }

    private get drivingGotchi(): JSX.Element {
        return (
            <ActionFrame>
                {this.buttons("Driving", [
                    Command.RETURN_TO_SEED,
                    Command.COME_HERE,
                    Command.GO_THERE,
                    Command.STOP,
                ])}
            </ActionFrame>
        )
    }

    private get evolving(): JSX.Element {
        return (
            <ActionFrame>
                {this.buttons("Evolving", [
                    Command.RETURN_TO_SEED,
                ])}
            </ActionFrame>
        )
    }

    private get availableHexalot(): JSX.Element {
        return (
            <ActionFrame>
                {this.buttons("Available", [
                    Command.CLAIM_HEXALOT,
                ])}
            </ActionFrame>
        )
    }

    private get freeSpot(): JSX.Element {
        return (
            <ActionFrame>
                {this.buttons("Free", [Command.CREATE_LAND, Command.CREATE_WATER])}
            </ActionFrame>
        )
    }

    private buttons(prompt: string, commands: Command[]): JSX.Element {
        return (
            <ButtonToolbar>
                <span className="action-prompt">{prompt}:</span>
                <ButtonGroup>{
                    commands.map(command => this.commandButton(command))
                }</ButtonGroup>
            </ButtonToolbar>
        )
    }

    private commandButton(command: Command): JSX.Element {
        return (
            <Button key={command} outline={true} color="primary" className="command-button"
                    onClick={() => this.props.doCommand(command)}>{command}</Button>
        )
    }
}
