import * as React from 'react';
import './app.css';
import {Direction, IFabricExports} from './body/fabric-exports';
import {Island} from './island/island';
import {GotchiView} from './view/gotchi-view';
import {Fabric} from './body/fabric';
import {Gotchi} from './gotchi/gotchi';
import {Genome, IGenomeData} from './genetics/genome';
import {Vector3} from 'three';
import {Physics} from './body/physics';
import {Spot} from './island/spot';
import {Evolution, INITIAL_JOINT_COUNT} from './gotchi/evolution';
import {Gotch} from './island/gotch';
import {InsetStyle, insetStyle} from './view/layout';
import {BehaviorSubject} from 'rxjs/BehaviorSubject';
import {OrbitState} from './view/orbit';
import {AppStorage} from './app-storage';
import {Subscription} from 'rxjs/Subscription';
import {Trip} from './island/trip';
import {Button} from 'reactstrap';

interface IAppProps {
    createFabricInstance: () => Promise<IFabricExports>;
    storage: AppStorage;
}

export interface IAppState {
    island: Island;
    width: number;
    height: number;

    master?: string
    orbitState: OrbitState;
    spot?: Spot;
    gotch?: Gotch;
    gotchi?: Gotchi;
    evolution?: Evolution;
    trip?: Trip;
}

const updateDimensions = (): any => {
    return {width: window.innerWidth, height: window.innerHeight};
};

function dispose(state: IAppState) {
    if (state.gotchi) {
        state.gotchi.dispose();
    }
    if (state.evolution) {
        state.evolution.dispose();
    }
}

function startEvolution(gotch: Gotch) {
    return (state: IAppState, props: IAppProps) => {
        dispose(state);
        state.island.setActive(gotch.master);
        const trip = gotch.createStupidTrip();
        return {
            gotchi: undefined,
            evolution: new Evolution(gotch, trip, (genomeData: IGenomeData) => {
                console.log(`Saving genome data`);
                props.storage.setGenome(gotch, genomeData);
            }),
            trip
        };
    };
}

function startGotchi(gotchi: Gotchi) {
    return (state: IAppState) => {
        dispose(state);
        // gotchi.travel = state.trip.createTravel(0);
        return {
            gotchi,
            evolution: undefined,
            trip: undefined
        };
    };
}

function selectSpot(spot?: Spot) {
    const gotch = spot ? spot.centerOfGotch : undefined;
    return (state: IAppState) => {
        dispose(state);
        state.island.setActive();
        return {
            spot,
            gotch,
            gotchi: undefined,
            evolution: undefined,
            trip: undefined
        };
    }
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

class App extends React.Component<IAppProps, IAppState> {
    private subs: Subscription[] = [];
    private orbitStateSubject = new BehaviorSubject<OrbitState>(OrbitState.HELICOPTER);
    private selectedSpotSubject = new BehaviorSubject<Spot | undefined>(undefined);
    private islandState: BehaviorSubject<boolean>;
    private physics: Physics;

    constructor(props: IAppProps) {
        super(props);
        this.physics = new Physics(props.storage);
        this.islandState = new BehaviorSubject<boolean>(false);
        const gotchiFactory = {
            createGotchiAt: (location: Vector3, jointCountMax: number, genome: Genome): Promise<Gotchi> => {
                return this.props.createFabricInstance().then(fabricExports => {
                    this.physics.applyToFabric(fabricExports);
                    const fabric = new Fabric(fabricExports, jointCountMax);
                    fabric.createSeed(location.x, location.z);
                    return new Gotchi(fabric, genome);
                });
            }
        };
        this.state = {
            orbitState: this.orbitStateSubject.getValue(),
            island: new Island('GalapagotchIsland', this.islandState, gotchiFactory, this.props.storage),
            master: this.props.storage.getMaster(),
            width: window.innerWidth,
            height: window.innerHeight
        };
    }

    public componentDidMount() {
        window.addEventListener("resize", () => this.setState(updateDimensions));
        this.subs.push(this.selectedSpotSubject.subscribe(spot => {
            if (spot && !this.state.evolution && !this.state.gotchi) {
                this.setState(selectSpot(spot));
            }
        }));
        this.subs.push(this.orbitStateSubject.subscribe(orbitState => this.setState({orbitState})));
    }

    public componentWillUnmount() {
        window.removeEventListener("resize", () => this.setState(updateDimensions));
        this.subs.forEach(s => s.unsubscribe());
    }

    public render() {
        return (
            <div>
                <GotchiView
                    island={this.state.island}
                    width={this.state.width}
                    height={this.state.height}
                    selectedSpot={this.selectedSpotSubject}
                    orbitState={this.orbitStateSubject}
                    gotch={this.state.gotch}
                    evolution={this.state.evolution}
                    trip={this.state.trip}
                    gotchi={this.state.gotchi}
                />
                {this.insetPanel}
            </div>
        );
    }

    private get insetPanel() {
        const userMessage = this.userMessage;
        if (!userMessage) {
            return null;
        }
        const cruising = this.state.orbitState === OrbitState.CRUISE;
        const style = insetStyle(cruising ? InsetStyle.TOP_MIDDLE : InsetStyle.BOTTOM_MIDDLE);
        return (
            <div style={style}>
                <div style={{textAlign: 'center'}}>
                    {userMessage}
                </div>
            </div>
        );
    }

    private get userMessage() {
        const orbitState = this.state.orbitState;
        const spot = this.state.spot;
        const gotch = this.state.gotch;
        const master = this.state.master;
        const gotchi = this.state.gotchi;
        const evolution = this.state.evolution;
        if (orbitState === OrbitState.HELICOPTER) {
            return (
                spot ? (
                    gotch && gotch.master ? (
                        <div>
                            <h3>This is &quot;{gotch.master}&quot;</h3>
                            <p>
                                You can
                                <Clicky label={`Visit ${gotch.master}`} click={() => console.log('VISIT')}/>
                                or choose another one.
                            </p>
                            {
                                master ? (
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
        if (evolution) {
            return (
                <div>
                    <p>
                        You are evolving. Fancy that!
                    </p>
                    <Clicky label="Enough" click={() => {
                        this.selectedSpotSubject.next(undefined);
                        this.setState(selectSpot(undefined));
                    }}/>
                </div>
            );
        }
        if (gotchi) {
            return (
                <div>
                    <h3>{gotchi.master}</h3>
                    <p>
                        <p>Driving!</p>
                        <Clicky label="Enough" click={() => {
                            this.selectedSpotSubject.next(undefined);
                            this.setState(selectSpot(undefined));
                        }}/>
                    </p>
                    <p>
                        <Clicky label="Left" click={() => this.gotchiGo(Direction.LEFT)}/>
                        <Clicky label="Right" click={() => this.gotchiGo(Direction.RIGHT)}/>
                        <Clicky label="Forward" click={() => this.gotchiGo(Direction.FORWARD)}/>
                        <Clicky label="Reverse" click={() => this.gotchiGo(Direction.REVERSE)}/>
                    </p>
                </div>
            );
        }
        if (gotch) {
            return (
                gotch.master === master ? (
                    <div>
                        <h3>This is your gotch!</h3>
                        <p>
                            You can
                            <Clicky label={`Launch ${gotch.master}`} click={() => this.createGotchi(gotch)}/>
                            and drive it around.
                        </p>
                        <p>
                            If it doesn't work well enough, you can
                            <Clicky label="Evolve" click={() => this.createEvolution(gotch)}/>
                            it for a while so it learns muscle coordination.
                        </p>
                    </div>

                ) : (
                    <div>
                        <h3>This is "{gotch.master}"</h3>
                        <p>
                            You can
                            <Clicky label={`Launch ${gotch.master}`} click={() => this.createGotchi(gotch)}/>
                            to see it grow from the seed.
                        </p>
                        <p>
                            For the time being you can also try to
                            <Clicky label="Evolve" click={() => this.createEvolution(gotch)}/>
                            it for a while so it learns muscle coordination.
                        </p>
                    </div>
                )
            );
        }
        return null;
    }

    private gotchiGo(direction: Direction) {
        const gotchi = this.state.gotchi;
        if (gotchi) {
            gotchi.direction = direction;
        }
    }

    private createEvolution(gotch: Gotch) {
        this.state.island.setActive(gotch.master);
        this.setState(startEvolution(gotch));
    }

    private createGotchi(gotch: Gotch) {
        this.state.island.setActive(gotch.master);
        gotch.createGotchi(INITIAL_JOINT_COUNT).then((freshGotchi: Gotchi) => {
            this.setState(startGotchi(freshGotchi));
        })
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

export default App;
