import * as React from "react"
import {Button, ButtonGroup, ButtonToolbar} from "reactstrap"
import {Subscription} from "rxjs"
import {BehaviorSubject} from "rxjs/BehaviorSubject"
import {Vector3} from "three"

import {Hexalot} from "../island/hexalot"
import {IslandMode, IslandState} from "../island/island-state"
import {Spot} from "../island/spot"

import {OrbitDistance} from "./orbit"

export enum Command {
    DETACH = "Detach",
    SAVE_GENOME = "Save genome",
    DELETE_GENOME = "Delete genome",
    RETURN_TO_SEED = "Return to seed",
    DRIVE = "Launch Gotchi",
    TURN_LEFT = "Turn Left",
    TURN_RIGHT = "Turn Right",
    COME_HERE = "Come Here",
    GO_THERE = "Go There",
    STOP = "Stop",
    EVOLVE = "Launch evolution",
    FORGET_JOURNEY = "Forget journey",
    CLAIM_HEXALOT = "Claim Hexalot",
    CREATE_LAND = "Create Land",
    CREATE_WATER = "Create Water",
}

export interface IActionsPanelProps {
    orbitDistance: BehaviorSubject<OrbitDistance>
    homeHexalot: BehaviorSubject<Hexalot | undefined>
    cameraLocation: Vector3
    islandState: BehaviorSubject<IslandState>
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
        this.state = {islandState: props.islandState.getValue()}
    }

    public componentDidMount(): void {
        this.subs.push(this.props.islandState.subscribe(islandState => this.setState({islandState})))
    }

    public componentWillUnmount(): void {
        this.subs.forEach(s => s.unsubscribe())
    }

    public render(): JSX.Element {
        switch (this.state.islandState.islandMode) {
            case IslandMode.FixingIsland:
                const spot = this.state.islandState.selectedSpot
                if (spot) {
                    if (spot.free || !spot.legal) {
                        return this.freeSpot(spot)
                    } else if (spot.canBeNewHexalot) {
                        return this.availableHexalot(spot)
                    }
                }
                return (
                    <ActionFrame>
                        <p>Fixing island?</p>
                    </ActionFrame>
                )
            case IslandMode.Visiting:
                return (
                    <ActionFrame>
                        <p>Choose a hexalot by clicking on one</p>
                    </ActionFrame>
                )
            case IslandMode.Landed:
                const hexalot = this.state.islandState.selectedHexalot
                if (hexalot) {
                    const homeHexalot = this.props.homeHexalot.getValue()
                    if (homeHexalot && homeHexalot.id === hexalot.id) {
                        return this.homeHexalot(hexalot)
                    } else {
                        return this.foreignHexalot(hexalot)
                    }
                }
                return (
                    <ActionFrame>
                        <p>No selected hexalot?</p>
                    </ActionFrame>
                )
            case IslandMode.PlanningJourney:
                return (
                    <ActionFrame>
                        <p>Planning journey</p>
                    </ActionFrame>
                )
            case IslandMode.PlanningDrive:
                return (
                    <ActionFrame>
                        <p>Planning Drive</p>
                    </ActionFrame>
                )
            case IslandMode.Evolving:
                return this.evolving
            case IslandMode.DrivingFree:
            case IslandMode.DrivingJourney:
                return this.drivingGotchi
        }
    }

    private foreignHexalot(hexalot: Hexalot): JSX.Element {
        return (
            <ActionFrame>
                {this.buttons("Foreign", [
                    Command.DRIVE,
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
                    Command.DRIVE,
                    Command.EVOLVE,
                    Command.FORGET_JOURNEY,
                    Command.DETACH,
                    Command.DELETE_GENOME,
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

    private availableHexalot(spot: Spot): JSX.Element {
        return (
            <ActionFrame>
                {!spot.canBeNewHexalot ? <h2>Cannot claim</h2> : this.buttons("Available", [
                    Command.CLAIM_HEXALOT,
                ])}
            </ActionFrame>
        )
    }

    private freeSpot(spot: Spot): JSX.Element {
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
