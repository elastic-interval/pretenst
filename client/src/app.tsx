import * as React from 'react';
import './app.css';
import {IFabricExports} from './body/fabric-exports';
import {Island} from './island/island';
import {BrowserRouter, Link, Route, Switch} from 'react-router-dom'
import {GotchiView} from './view/gotchi-view';
import {Fabric} from './body/fabric';
import {Gotchi, IGotchiFactory} from './gotchi/gotchi';
import {Genome} from './genetics/genome';
import {Vector3} from 'three';
import {Physics} from './body/physics';
import {ControlPanel} from './view/control-panel';

interface IAppProps {
    createFabricInstance: () => Promise<IFabricExports>;
}

interface IAppState {
    island: Island;
    mainWidth: number;
    mainHeight: number;
    sideWidth: number;
    sideHeight: number;
}

const HORIZONTAL_SPLIT = 0.9;
const VERTICAL_SPLIT = 0.3;

const updateDimensions = (): any => {
    return {
        mainWidth: window.innerWidth * HORIZONTAL_SPLIT,
        mainHeight: window.innerHeight,
        sideWidth: window.innerWidth * (1 - HORIZONTAL_SPLIT),
        sideHeight: window.innerHeight * VERTICAL_SPLIT
    };
};

class App extends React.Component<IAppProps, IAppState> {
    private gotchiFactory: IGotchiFactory;
    private physics = new Physics();

    constructor(props: IAppProps) {
        super(props);
        this.gotchiFactory = {
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
            island: new Island('GalapagotchIsland', this.gotchiFactory),
            mainWidth: window.innerWidth * HORIZONTAL_SPLIT,
            mainHeight: window.innerHeight,
            sideWidth: window.innerWidth * (1 - HORIZONTAL_SPLIT),
            sideHeight: window.innerHeight * VERTICAL_SPLIT
        };
    }

    public componentDidMount() {
        window.addEventListener("resize", () => this.setState(updateDimensions));
    }

    public componentWillUnmount() {
        window.removeEventListener("resize", () => this.setState(updateDimensions));
    }

    public render() {
        return (
            <BrowserRouter forceRefresh={true}>
                <Switch>
                    <Route exact={true} path="/" component={this.homeView}/>
                    <Route path="/:identity" component={this.gotchiView}/>
                </Switch>
            </BrowserRouter>
        );
    }

    private homeView = () => (
        <div className="App">
            <div className="explanation">
                <h1>Galapagotchi</h1>
                <p>
                    The native animals on the Galapagotch Islands are members of
                    various species of robot runners, each one evolved and driven
                    by its master.
                </p>
                <p>
                    So far a work-in-progress, but stay tuned!
                </p>
                <h2>@fluxe</h2>
                <hr/>
                <ul>
                    {
                        this.state.island.gotches
                            .filter(gotch => !!gotch.master)
                            .map(gotch => {
                                    const master = gotch.master;
                                    return (
                                        <li key={master}>
                                            <Link to={master}>{master}</Link>
                                        </li>
                                    );
                                }
                            )
                    }
                </ul>
            </div>
        </div>
    );

    // private islandView = (ctxt: any) => {
    //     const master = ctxt.match.params.identity;
    //     this.state.island.master = master;
    //     return (
    //         <IslandView key="IslandMain"
    //                     className="main-view"
    //                     width={this.state.mainWidth + this.state.sideWidth}
    //                     height={this.state.mainHeight}
    //                     island={this.state.island}
    //                     master={master}
    //         />
    //     );
    // };

    private gotchiView = (ctxt: any) => {
        const master = ctxt.match.params.identity;
        this.state.island.master = master;
        return (
            <div>
                <GotchiView width={this.state.mainWidth}
                            height={this.state.mainHeight}
                            island={this.state.island}
                            master={master}
                />
                <ControlPanel physics={this.physics}/>
            </div>
        );
    };

}

export default App;
