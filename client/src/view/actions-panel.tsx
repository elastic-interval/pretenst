import * as React from "react"
import {Button, ButtonGroup, ButtonToolbar} from "reactstrap"
import {BehaviorSubject} from "rxjs/BehaviorSubject"
import {Vector3} from "three"

import {Evolution} from "../gotchi/evolution"
import {Gotchi} from "../gotchi/gotchi"
import {Hexalot} from "../island/hexalot"
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
    spot?: Spot
    hexalot?: Hexalot
    gotchi?: Gotchi
    evolution?: Evolution
    doCommand: (command: Command, location?: Vector3) => void
}

interface IActionPanelProps {
    children: Array<JSX.Element | null> | JSX.Element
}

const ActionFrame = (props: IActionPanelProps) => (
    <div className="action-frame">
        {props.children}
    </div>
)

export class ActionsPanel extends React.Component<IActionsPanelProps, object> {

    constructor(props: IActionsPanelProps) {
        super(props)
    }

    public render(): JSX.Element {
        const evolution = this.props.evolution
        if (evolution) {
            return this.evolving(evolution)
        }
        const gotchi = this.props.gotchi
        if (gotchi) {
            return this.drivingGotchi(gotchi)
        }
        const hexalot = this.props.hexalot
        if (hexalot) {
            const homeHexalot = this.props.homeHexalot.getValue()
            if (homeHexalot && homeHexalot.id === hexalot.id) {
                return this.homeHexalot(hexalot)
            } else {
                return this.foreignHexalot(hexalot)
            }
        }
        const spot = this.props.spot
        if (spot) {
            if (spot.free) {
                return this.freeSpot(spot)
            } else if (spot.canBeNewHexalot) {
                return this.availableHexalot(spot)
            }
        }
        return (
            <ActionFrame>
                <p>Choose a hexalot by clicking on one</p>
            </ActionFrame>
        )
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
                {this.buttons("Home", [
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

    private drivingGotchi(gotchi: Gotchi): JSX.Element {
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

    private evolving(evolution: Evolution): JSX.Element {
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
            <Button key={command} outline color="primary" className="command-button"
                    onClick={() => this.props.doCommand(command)}>{command}</Button>
        )
    }
}
