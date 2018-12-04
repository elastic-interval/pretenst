import * as React from 'react';
import {Spot} from '../island/spot';
import {Gotchi} from '../gotchi/gotchi';
import {Evolution} from '../gotchi/evolution';
import {Gotch} from '../island/gotch';
import {OrbitState} from './orbit';
import {InfoPanel} from './info-panel';
import {Button} from 'reactstrap';

export enum Command {
    RETURN_TO_SEED,
    LAUNCH_GOTCHI,
    TURN_LEFT,
    TURN_RIGHT,
    LAUNCH_EVOLUTION
}

export interface IActionsPanelProps {
    orbitState: OrbitState;
    master?: string;
    spot?: Spot;
    gotch?: Gotch;
    gotchi?: Gotchi;
    evolution?: Evolution;
    do: (command: Command) => void;
}

interface IClicky {
    label: string;
    click: () => void;
}

function Clicky(params: IClicky) {
    return (
        <span style={{padding: '5px 5px 5px 5px'}}>
            <Button onClick={params.click}>{params.label}</Button>
        </span>
    );
}

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
        return <InfoPanel exit={() => console.log('outa here')}/>;
    }

    private foreignGotch(gotch: Gotch) {
        return (
            <div>
                <h3>This is "{gotch.master}"</h3>
                <p>
                    You can
                    <Clicky label={`Launch ${gotch.master}`} click={() => this.props.do(Command.LAUNCH_GOTCHI)}/>
                    to see it grow from the seed.
                </p>
                <p>
                    For the time being you can also try to
                    <Clicky label="Evolve" click={() => this.props.do(Command.LAUNCH_EVOLUTION)}/>
                    it for a while so it learns muscle coordination.
                </p>
            </div>
        );
    }

    private homeGotch(gotch: Gotch) {
        return <div>
            <h3>This is your gotch!</h3>
            <p>
                You can
                <Clicky label={`Launch ${gotch.master}`} click={() => this.props.do(Command.LAUNCH_GOTCHI)}/>
                and drive it around.
            </p>
            <p>
                If it doesn't work well enough, you can
                <Clicky label="Evolve" click={() => this.props.do(Command.LAUNCH_EVOLUTION)}/>
                it for a while so it learns muscle coordination.
            </p>
        </div>;
    }

    private drivingGotchi(gotchi: Gotchi) {
        return (
            <div>
                <h3>{gotchi.master}</h3>
                <p>
                    <p>Driving!</p>
                    <Clicky label="Enough" click={() => this.props.do(Command.RETURN_TO_SEED)}/>
                </p>
                <p>
                    <Clicky label="Left" click={() => this.props.do(Command.TURN_LEFT)}/>
                    <Clicky label="Right" click={() => this.props.do(Command.TURN_RIGHT)}/>
                </p>
            </div>
        );
    }

    private evolving(evolution: Evolution) {
        return (
            <div>
                <p>
                    You are evolving. Fancy that!
                </p>
                <Clicky label="Enough" click={() => this.props.do(Command.RETURN_TO_SEED)}/>
            </div>
        );
    }

    private availableSpot(spot: Spot) {
        return (
            <div>
                <p>
                    This one can be your new home!
                    <Clicky label={'Make this home'} click={() => console.log('HOME')}/>
                </p>
            </div>
        );
    }

    private occupiedGotch(gotch: Gotch) {
        return (
            <div>
                <h3>This is &quot;{gotch.master}&quot;</h3>
                <p>
                    You can
                    <Clicky label={`Visit ${gotch.master}`} click={() => console.log('VISIT')}/>
                    or choose another one.
                </p>
                {
                    this.props.master ? (
                        <p>This shouldn't happen</p>
                    ) : (
                        <p>Choose a green one and you can make it your new home.</p>
                    )
                }
            </div>
        );
    }

// private spotSelected = (spot?: Spot) => {
    //     if (spot) {
    //         if (spot.centerOfGotch) {
    //             console.log('spot selected');
    //             this.setState(selectGotch(spot.centerOfGotch));
    //         }
    //     }
    //     const island = this.state.island;
    //     const centerOfGotch = spot.centerOfGotch;
    //     if (centerOfGotch) {
    //         if (centerOfGotch.genome) {
    //             return;
    //         }
    //         if (island.legal && centerOfGotch === island.freeGotch) {
    //             // centerOfGotch.genome = freshGenomeFor(MASTER);
    //             island.refresh();
    //             island.save();
    //         }
    //     } else if (spot.free) {
    //         switch (spot.surface) {
    //             case Surface.Unknown:
    //                 spot.surface = Surface.Water;
    //                 break;
    //             case Surface.Land:
    //                 spot.surface = Surface.Water;
    //                 break;
    //             case Surface.Water:
    //                 spot.surface = Surface.Land;
    //                 break;
    //         }
    //         island.refresh();
    //     } else if (spot.canBeNewGotch) {
    //     // } else if (spot.canBeNewGotch && !this.state.masterGotch) {
    //         island.removeFreeGotches();
    //         if (spot.canBeNewGotch) {
    //             // island.createGotch(spot, MASTER);
    //         }
    //         island.refresh();
    //     }
    // };

}