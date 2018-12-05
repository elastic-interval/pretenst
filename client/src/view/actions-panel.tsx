import * as React from 'react';
import {Spot} from '../island/spot';
import {Gotchi} from '../gotchi/gotchi';
import {Evolution} from '../gotchi/evolution';
import {Gotch} from '../island/gotch';
import {OrbitState} from './orbit';
import {Button} from 'reactstrap';

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
        if (this.props.orbitState === OrbitState.HELICOPTER && this.props.spot) {
            if (this.props.gotch && this.props.gotch.master) {
                return this.occupiedGotch(this.props.gotch);
            } else {
                return this.availableSpot(this.props.spot);
            }
        }
        if (this.props.evolution) {
            return this.evolving(this.props.evolution);
        }
        if (this.props.gotchi) {
            return this.drivingGotchi(this.props.gotchi)
        }
        if (this.props.gotch) {
            const home = this.props.gotch.master === this.props.master;
            return home ? this.homeGotch(this.props.gotch) : this.foreignGotch(this.props.gotch);
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
                <p>
                    This is "{gotch.master}"
                </p>
                <p>
                    You can
                    <Clicky props={this.props} command={Command.LAUNCH_GOTCHI}/>
                    to see it grow from the seed.
                </p>
                <p>
                    For the time being you can also try to
                    <Clicky props={this.props} command={Command.LAUNCH_EVOLUTION}/>
                    it for a while so it learns muscle coordination.
                </p>
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
                    <Clicky props={this.props}  command={Command.RETURN_TO_SEED}/>
                    <Clicky props={this.props} command={Command.TURN_LEFT}/>
                    <Clicky props={this.props} command={Command.TURN_RIGHT}/>
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

    private availableSpot(spot: Spot) {
        return (
            <ActionPanel>
                <p>
                    This one can be your new home!
                </p>
                {!spot.canBeNewGotch? null : (
                    <p>
                       <Clicky props={this.props} command={Command.CLAIM_GOTCH}/>
                    </p>
                )}
            </ActionPanel>
        );
    }

    private occupiedGotch(gotch: Gotch) {
        return (
            <ActionPanel>
                <p>
                    This is &quot;{gotch.master}&quot;
                </p>
                <p>
                    You can zoom in for a visit or choose another one.
                </p>
                {
                    this.props.master ? (
                        <p>This shouldn't happen</p>
                    ) : (
                        <p>Choose a green one and you can make it your new home.</p>
                    )
                }
            </ActionPanel>
        );
    }
}