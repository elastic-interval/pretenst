import * as React from 'react';
import './app.css';
import {IFabricExports} from './body/fabric-exports';
import {Island} from './island/island';
import {GotchiView} from './view/gotchi-view';
import {Fabric} from './body/fabric';
import {Gotchi} from './gotchi/gotchi';
import {Genome} from './genetics/genome';
import {Vector3} from 'three';
import {Physics} from './body/physics';
import {IdentityPanel} from './view/identity-panel';
import {Spot} from './island/spot';
import {Evolution} from './gotchi/evolution';
import {Gotch} from './island/gotch';
import {InsetStyle, insetStyle} from './view/layout';
import {BehaviorSubject} from 'rxjs/BehaviorSubject';
import {OrbitState} from './view/orbit';
import {AppStorage} from './app-storage';
import {Subscription} from 'rxjs/Subscription';

interface IAppProps {
    createFabricInstance: () => Promise<IFabricExports>;
    storage: AppStorage;
}

export interface IAppState {
    island: Island;
    width: number;
    height: number;

    orbitState: OrbitState;
    gotch?: Gotch;
    gotchi?: Gotchi;
    evolution?: Evolution;
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

// function startEvolution(gotch: Gotch) {
//     return (state: IAppState, props: IAppProps) => {
//         dispose(state);
//         return {
//             gotchi: undefined,
//             evolution: new Evolution(gotch, new Trip([]), (genomeData: IGenomeData) => {
//                 console.log(`Saving genome data`);
//                 props.storage.setGenome(gotch, genomeData);
//             })
//         };
//     };
// }
//
// function startGotchi(gotchi: Gotchi) {
//     return (state: IAppState) => {
//         dispose(state);
//         // gotchi.travel = state.trip.createTravel(0);
//         return {
//             gotchi,
//             evolution: undefined,
//         };
//     };
// }

function selectGotch(gotch: Gotch) {
    return (state: IAppState) => {
        dispose(state);
        return {
            gotch,
            gotchi: undefined,
            evolution: undefined,
        };
    };
}

class App extends React.Component<IAppProps, IAppState> {
    private subs: Subscription[] = [];
    private orbitState = new BehaviorSubject<OrbitState>(OrbitState.HELICOPTER);
    private selectedSpot = new BehaviorSubject<Spot | undefined>(undefined);

    private physics: Physics;

    constructor(props: IAppProps) {
        super(props);
        this.physics = new Physics(props.storage);
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
            orbitState: this.orbitState.getValue(),
            island: new Island('GalapagotchIsland', gotchiFactory, this.props.storage),
            width: window.innerWidth,
            height: window.innerHeight
        };
    }

    public componentDidMount() {
        window.addEventListener("resize", () => this.setState(updateDimensions));
        this.subs.push(this.selectedSpot.subscribe(this.spotSelected));
        this.subs.push(this.orbitState.subscribe(orbitState => this.setState({orbitState})));
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
                    selectedSpot={this.selectedSpot}
                    orbitState={this.orbitState}
                    gotch={this.state.gotch}
                    evolution={this.state.evolution}
                    gotchi={this.state.gotchi}
                />
                {this.insetPanel}
            </div>
        );
    }

    private get insetPanel() {
        const style = insetStyle(
            this.state.orbitState === OrbitState.CRUISE ? InsetStyle.TOP_MIDDLE : InsetStyle.BOTTOM_MIDDLE
        );
        return (
            <div style={style}>
                <IdentityPanel
                    island={this.state.island}
                    master={undefined}
                    selectedSpot={this.selectedSpot}
                    storage={this.props.storage}
                />
            </div>
        );
    }

    private spotSelected = (spot?: Spot) => {
        if (spot) {
            if (spot.centerOfGotch) {
                this.setState(selectGotch(spot.centerOfGotch));
            }
        }
        // const island = this.state.island;
        // const centerOfGotch = spot.centerOfGotch;
        // if (centerOfGotch) {
        //     if (centerOfGotch.genome) {
        //         return;
        //     }
        //     if (island.legal && centerOfGotch === island.freeGotch) {
        //         // centerOfGotch.genome = freshGenomeFor(MASTER);
        //         island.refresh();
        //         island.save();
        //     }
        // } else if (spot.free) {
        //     switch (spot.surface) {
        //         case Surface.Unknown:
        //             spot.surface = Surface.Water;
        //             break;
        //         case Surface.Land:
        //             spot.surface = Surface.Water;
        //             break;
        //         case Surface.Water:
        //             spot.surface = Surface.Land;
        //             break;
        //     }
        //     island.refresh();
        // } else if (spot.canBeNewGotch) {
        // // } else if (spot.canBeNewGotch && !this.state.masterGotch) {
        //     island.removeFreeGotches();
        //     if (spot.canBeNewGotch) {
        //         // island.createGotch(spot, MASTER);
        //     }
        //     island.refresh();
        // }
    };
}

export default App;
