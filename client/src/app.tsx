import * as React from 'react';
import './app.css';
import {IFabricExports} from './body/fabric-exports';
import {Population} from './gotchi/population';
import {Island, IslandPattern} from './island/island';
import {GotchiView} from './view/gotchi-view';
import {IslandView} from './view/island-view';

interface IAppProps {
    createFabricInstance: () => Promise<IFabricExports>;
}

interface IAppState {
    population: Population;
    island: Island;
    gotchiViewWidth: number;
    gotchiViewHeight: number;
    islandViewWidth: number;
    islandViewHeight: number;
}

const HORIZONTAL_SPLIT = 0.7;
const VERTICAL_SPLIT = 0.4;

class App extends React.Component<IAppProps, IAppState> {

    constructor(props: IAppProps) {
        super(props);
        const existingOwner = localStorage.getItem('owner');
        const owner = existingOwner ? existingOwner : 'gumby';
        const existingPattern = localStorage.getItem(owner);
        const pattern: IslandPattern = existingPattern ? JSON.parse(existingPattern) : {gotches: '0', spots: '0'};
        this.state = {
            population: new Population(props.createFabricInstance),
            island: new Island(pattern, owner, props.createFabricInstance),
            gotchiViewWidth: window.innerWidth * HORIZONTAL_SPLIT,
            gotchiViewHeight: window.innerHeight,
            islandViewWidth: window.innerWidth * (1 - HORIZONTAL_SPLIT),
            islandViewHeight: window.innerHeight * VERTICAL_SPLIT
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
            <div className="App">
                <div className="gotchi-view">
                    <GotchiView width={this.state.gotchiViewWidth}
                                height={this.state.gotchiViewHeight}
                                population={this.state.population}
                                island={this.state.island}/>
                </div>
                <div className="control-panel">
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
                    </div>
                    {/*<ControlPanel population={this.state.population}/>*/}
                </div>
                <div className="island-view">
                    <IslandView width={this.state.islandViewWidth}
                                height={this.state.islandViewHeight}
                                island={this.state.island}/>
                </div>
            </div>
        );
    }

    private updateDimensions = () => {
        this.setState({
            gotchiViewWidth: window.innerWidth * HORIZONTAL_SPLIT,
            gotchiViewHeight: window.innerHeight,
            islandViewWidth: window.innerWidth * (1 - HORIZONTAL_SPLIT),
            islandViewHeight: window.innerHeight * VERTICAL_SPLIT
        });
    };

}

export default App;
