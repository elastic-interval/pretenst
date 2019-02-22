import * as React from "react"
import {Button, ButtonGroup, Col, Container, Row} from "reactstrap"
import {BehaviorSubject} from "rxjs/BehaviorSubject"
import {Vector3} from "three"

import {Evolution} from "../gotchi/evolution"
import {Gotchi} from "../gotchi/gotchi"
import {Hexalot} from "../island/hexalot"
import {Spot} from "../island/spot"

import {OrbitDistance} from "./orbit"

export enum Command {
    RETURN_TO_SEED = "Return to seed",
    LAUNCH_GOTCHI = "Launch Gotchi",
    TURN_LEFT = "Turn Left",
    TURN_RIGHT = "Turn Right",
    COME_HERE = "Come Here",
    GO_THERE = "Go There",
    STOP = "Stop",
    LAUNCH_EVOLUTION = "Launch Evolution",
    CLAIM_GOTCH = "Claim Hexalot",
    CREATE_LAND = "Create Land",
    CREATE_WATER = "Create Water",
}

export interface IActionsPanelProps {
    orbitDistance: BehaviorSubject<OrbitDistance>
    cameraLocation: Vector3
    master?: string
    spot?: Spot
    hexalot?: Hexalot
    gotchi?: Gotchi
    evolution?: Evolution
    doCommand: (command: Command, location?: Vector3) => void
}

interface IClicky {
    props: IActionsPanelProps
    command: Command
}

function Clicky(params: IClicky) {
    return (
        <span style={{padding: "5px 5px 5px 5px"}}>
            <Button onClick={() => params.props.doCommand(params.command)}>{params.command}</Button>
        </span>
    )
}

interface IActionPanelProps {
    children: Array<JSX.Element | null> | JSX.Element
}

const ActionPanel = (props: IActionPanelProps) => (
    <div className="action-panel">
        {props.children}
    </div>
)

export class ActionsPanel extends React.Component<IActionsPanelProps, object> {

    constructor(props: IActionsPanelProps) {
        super(props)
    }

    public render() {
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
            if (hexalot.master === this.props.master) {
                return this.homeHexalot(hexalot)
            } else if (hexalot.master) {
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
            <ActionPanel>
                <h1>Click on something or whatever</h1>
            </ActionPanel>
        )
    }

    private foreignHexalot(hexalot: Hexalot) {
        return (
            <ActionPanel>
                <h3>{hexalot.master}</h3>
                <Container>
                    <Row>
                        <Col>
                            <Button onClick={() => this.props.doCommand(Command.LAUNCH_GOTCHI)}>
                                Launch
                            </Button>
                        </Col>
                        <Col>
                            <Button onClick={() => this.props.doCommand(Command.LAUNCH_EVOLUTION)}>
                                Evolve
                            </Button>
                        </Col>
                    </Row>
                </Container>
            </ActionPanel>
        )
    }

    private homeHexalot(hexalot: Hexalot) {
        return (
            <ActionPanel>
                <p>
                    This is your hexalot!
                </p>
                <p>
                    You can
                    <Clicky props={this.props} command={Command.LAUNCH_GOTCHI}/>
                    and drive it around.
                </p>
                <p>
                    If it doesn't work well enough, you can
                    <Clicky props={this.props} command={Command.LAUNCH_EVOLUTION}/>
                    it for a while so it learns muscle coordination.
                </p>
            </ActionPanel>
        )
    }

    private drivingGotchi(gotchi: Gotchi) {
        return (
            <ActionPanel>
                <p>
                    Driving "{gotchi.master}"
                </p>
                <div>
                    <Clicky props={this.props} command={Command.RETURN_TO_SEED}/>
                    <ButtonGroup>
                        <Button onClick={() => this.props.doCommand(Command.COME_HERE, this.props.cameraLocation)}>
                            Come here
                        </Button>
                        &nbsp;
                        <Button onClick={() => this.props.doCommand(Command.GO_THERE, this.props.cameraLocation)}>
                            Go There
                        </Button>
                        &nbsp;
                        <Button onClick={() => this.props.doCommand(Command.STOP)}>
                            Stop
                        </Button>
                    </ButtonGroup>
                    <ButtonGroup>
                        <Button onClick={() => this.props.doCommand(Command.TURN_LEFT)}>
                            Turn left
                        </Button>
                        &nbsp;
                        <Button onClick={() => this.props.doCommand(Command.TURN_RIGHT)}>
                            Turn right
                        </Button>
                    </ButtonGroup>
                </div>
            </ActionPanel>
        )
    }

    private evolving(evolution: Evolution) {
        return (
            <ActionPanel>
                <p>
                    You are evolving. Fancy that!
                </p>
                <Clicky props={this.props} command={Command.RETURN_TO_SEED}/>
            </ActionPanel>
        )
    }

    private availableHexalot(spot: Spot) {
        return (
            <ActionPanel>
                <p>
                    This one can be your new home!
                </p>
                {!spot.canBeNewHexalot ? null : (
                    <p>
                        <Clicky props={this.props} command={Command.CLAIM_GOTCH}/>
                    </p>
                )}
            </ActionPanel>
        )
    }

    private freeSpot(spot: Spot) {
        return (
            <ActionPanel>
                <p>
                    This spot needs to be turned into <strong>land</strong> or <strong>water</strong>.
                </p>
                <p>
                    <Clicky props={this.props} command={Command.CREATE_LAND}/>
                    <Clicky props={this.props} command={Command.CREATE_WATER}/>
                </p>
            </ActionPanel>
        )
    }
}
