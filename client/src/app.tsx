import * as React from 'react';
import './app.css';
import {IFabricExports} from './body/fabric-exports';
import {Population} from './gotchi/population';
import {Island, IslandPattern} from './island/island';
import {IslandView} from './view/island-view';
import {BrowserRouter, Link, Route, Switch} from 'react-router-dom'
import {GotchiView} from './view/gotchi-view';

interface IAppProps {
    createFabricInstance: () => Promise<IFabricExports>;
}

interface IAppState {
    population: Population;
    island: Island;
    mainWidth: number;
    mainHeight: number;
    sideWidth: number;
    sideHeight: number;
}

const HORIZONTAL_SPLIT = 1;
// const HORIZONTAL_SPLIT = 0.7;
const VERTICAL_SPLIT = 0.4;

class App extends React.Component<IAppProps, IAppState> {

    constructor(props: IAppProps) {
        super(props);
        const existingOwner = localStorage.getItem('owner');
        const owner = existingOwner ? existingOwner : 'gumby';
        const existingPattern = localStorage.getItem(owner);
        const pattern: IslandPattern = existingPattern ? JSON.parse(existingPattern) : {gotches: '', spots: ''};
        this.state = {
            population: new Population(props.createFabricInstance),
            island: new Island(pattern, owner, props.createFabricInstance),
            mainWidth: window.innerWidth * HORIZONTAL_SPLIT,
            mainHeight: window.innerHeight,
            sideWidth: window.innerWidth * (1 - HORIZONTAL_SPLIT),
            sideHeight: window.innerHeight * VERTICAL_SPLIT
        };
    }

    public componentDidMount() {
        window.addEventListener("resize", this.updateDimensions);
    }

    public componentWillUnmount() {
        window.removeEventListener("resize", this.updateDimensions);
    }

    public render() {
        return (
            <BrowserRouter>
                <Switch>
                    <Route exact={true} path="/" component={this.homeView}/>
                    <Route exact={true} path="/gotchi" component={this.gotchiView}/>
                    <Route exact={true} path="/island" component={this.islandView}/>
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
                    <li>
                        <Link to="/gotchi">Gotchi</Link>
                    </li>
                    <li>
                        <Link to="/island">Island</Link>
                    </li>
                </ul>
            </div>
        </div>
    );

    private islandView = () => (
        <div className="App">
            <IslandView width={this.state.mainWidth}
                        height={this.state.mainHeight}
                        island={this.state.island}/>
        </div>
    );

    private gotchiView = () => (
        <div className="App">
            <GotchiView width={this.state.mainWidth}
                        height={this.state.mainHeight}
                        population={this.state.population}
                        island={this.state.island}/>
        </div>
    );

    private updateDimensions = () => {
        this.setState({
            mainWidth: window.innerWidth * HORIZONTAL_SPLIT,
            mainHeight: window.innerHeight,
            sideWidth: window.innerWidth * (1 - HORIZONTAL_SPLIT),
            sideHeight: window.innerHeight * VERTICAL_SPLIT
        });
    };

}

export default App;
