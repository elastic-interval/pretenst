import * as React from 'react';
import {Spot} from '../island/spot';
import {Gotchi} from '../gotchi/gotchi';
import {Evolution} from '../gotchi/evolution';
import {Gotch} from '../island/gotch';
import {OrbitState} from './orbit';
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
            <button onClick={params.click}>{params.label}</button>
        </span>
    );
}

export class ActionsPanel extends React.Component<IActionsPanelProps, any> {

    constructor(props: IActionsPanelProps) {
        super(props);
    }

    public render() {
        if (this.props.orbitState === OrbitState.HELICOPTER) {
            return (
                this.props.spot ? (
                    this.props.gotch && this.props.gotch.master ? (
                        <div>
                            <h3>This is &quot;{this.props.gotch.master}&quot;</h3>
                            <p>
                                You can
                                <Clicky label={`Visit ${this.props.gotch.master}`} click={() => console.log('VISIT')}/>
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
                    ) : ( // spot and no gotch
                        <div>
                            <h3>Free Gotch!</h3>
                            <p>
                                This one can be your new home!
                                <Clicky label={'Make this home'} click={() => console.log('HOME')}/>
                            </p>
                        </div>
                    )
                ) : ( // no spot or gotch
                    <div>
                        <h3>Welcome to Galapagotch Island!</h3>
                        <Button color="danger">Danger!</Button>
                        <p>
                            You are seeing the island from above,
                            and in some places you see dormant gotchis. You can visit them.
                            Just click on one of them and zoom in.
                        </p>
                    </div>
                )
            );
        }
        if (this.props.evolution) {
            return (
                <div>
                    <p>
                        You are evolving. Fancy that!
                    </p>
                    <Clicky label="Enough" click={() => this.props.do(Command.RETURN_TO_SEED)}/>
                </div>
            );
        }
        if (this.props.gotchi) {
            return (
                <div>
                    <h3>{this.props.gotchi.master}</h3>
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
        if (this.props.gotch) {
            return (
                this.props.gotch.master === this.props.master ? (
                    <div>
                        <h3>This is your gotch!</h3>
                        <p>
                            You can
                            <Clicky label={`Launch ${this.props.gotch.master}`} click={() => this.props.do(Command.LAUNCH_GOTCHI)}/>
                            and drive it around.
                        </p>
                        <p>
                            If it doesn't work well enough, you can
                            <Clicky label="Evolve" click={() => this.props.do(Command.LAUNCH_EVOLUTION)}/>
                            it for a while so it learns muscle coordination.
                        </p>
                    </div>

                ) : (
                    <div>
                        <h3>This is "{this.props.gotch.master}"</h3>
                        <p>
                            You can
                            <Clicky label={`Launch ${this.props.gotch.master}`} click={() => this.props.do(Command.LAUNCH_GOTCHI)}/>
                            to see it grow from the seed.
                        </p>
                        <p>
                            For the time being you can also try to
                            <Clicky label="Evolve" click={() => this.props.do(Command.LAUNCH_EVOLUTION)}/>
                            it for a while so it learns muscle coordination.
                        </p>
                    </div>
                )
            );
        }
        return null;
    }




}