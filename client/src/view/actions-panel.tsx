import * as React from 'react';
import {Spot} from '../island/spot';
import {Gotchi} from '../gotchi/gotchi';
import {Evolution} from '../gotchi/evolution';
import {Gotch} from '../island/gotch';
import {OrbitState} from './orbit';
import {Button, ButtonGroup, Col, Container, Row} from 'reactstrap';

export enum Command {
    RETURN_TO_SEED = 'Return to seed',
    LAUNCH_GOTCHI = 'Launch Gotchi',
    TURN_LEFT = 'Turn Left',
    TURN_RIGHT = 'Turn Right',
    LAUNCH_EVOLUTION = 'Launch Evolution',
    CLAIM_GOTCH = 'Claim Gotch',
    CREATE_LAND = 'Create Land',
    CREATE_WATER = 'Create Water',
}

export interface IActionsPanelProps {
    orbitState: OrbitState;
    master?: string;
    spot?: Spot;
    gotch?: Gotch;
    gotchi?: Gotchi;
    evolution?: Evolution;
    doCommand: (command: Command) => void;
}

interface IClicky {
    props: IActionsPanelProps;
    command: Command;
}

function Clicky(params: IClicky) {
    return (
        <span style={{padding: '5px 5px 5px 5px'}}>
            <Button onClick={() => params.props.doCommand(params.command)}>{params.command}</Button>
        </span>
    );
}

const ActionPanel = (props: any) => (
    <div className="action-panel">
        {props.children}
    </div>
);

export class ActionsPanel extends React.Component<IActionsPanelProps, any> {

    constructor(props: IActionsPanelProps) {
        super(props);
    }

    public render() {
        const evolution = this.props.evolution;
        if (evolution) {
            return this.evolving(evolution);
        }
        const gotchi = this.props.gotchi;
        if (gotchi) {
            return this.drivingGotchi(gotchi)
        }
        const gotch = this.props.gotch;
        if (gotch) {
            if (gotch.master === this.props.master) {
                return this.homeGotch(gotch);
            } else if (gotch.master) {
                return this.foreignGotch(gotch);
            }
        }
        const spot = this.props.spot;
        if (spot) {
            if (spot.free) {
                return this.freeSpot(spot)
            } else if (spot.canBeNewGotch) {
                return this.availableGotch(spot);
            }
        }
        return (
            <ActionPanel>
                <h1>Click on something or whatever</h1>
            </ActionPanel>
        );
    }

    private foreignGotch(gotch: Gotch) {
        return (
            <ActionPanel>
                <h3>{gotch.master}</h3>
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
        );
    }

    private homeGotch(gotch: Gotch) {
        return (
            <ActionPanel>
                <p>
                    This is your gotch!
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
        );
    }

    private drivingGotchi(gotchi: Gotchi) {
        return (
            <ActionPanel>
                <p>
                    Driving "{gotchi.master}"
                </p>
                <p>
                    <Clicky props={this.props} command={Command.RETURN_TO_SEED}/>
                    <ButtonGroup>
                        <Button onClick={() => this.props.doCommand(Command.TURN_LEFT)}>
                            <img src="/turn-l.png" width="64" height="64"/>
                        </Button>
                        &nbsp;
                        <Button onClick={() => this.props.doCommand(Command.TURN_RIGHT)}>
                            <img src="/turn-r.png" width="64" height="64"/>
                        </Button>
                    </ButtonGroup>
                </p>
            </ActionPanel>
        );
    }

    private evolving(evolution: Evolution) {
        return (
            <ActionPanel>
                <p>
                    You are evolving. Fancy that!
                </p>
                <Clicky props={this.props} command={Command.RETURN_TO_SEED}/>
            </ActionPanel>
        );
    }

    private availableGotch(spot: Spot) {
        return (
            <ActionPanel>
                <p>
                    This one can be your new home!
                </p>
                {!spot.canBeNewGotch ? null : (
                    <p>
                        <Clicky props={this.props} command={Command.CLAIM_GOTCH}/>
                    </p>
                )}
            </ActionPanel>
        );
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
        );
    }
}
