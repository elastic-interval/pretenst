import * as React from 'react';
import './app.css';
import {IFabricExports} from './body/fabric-exports';
import {Population} from './gotchi/population';
import {Island, IslandPattern} from './island/island';
import {IslandView} from './view/island-view';

interface IAppProps {
    createFabricInstance: () => Promise<IFabricExports>;
}

interface IAppState {
    population: Population;
    island: Island;
    mainViewWidth: number;
    mainViewHeight: number;
    islandViewWidth: number;
    islandViewHeight: number;
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
            mainViewWidth: window.innerWidth * HORIZONTAL_SPLIT,
            mainViewHeight: window.innerHeight,
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
                    {/*<GotchiView width={this.state.mainViewWidth}*/}
                                {/*height={this.state.mainViewHeight}*/}
                                {/*population={this.state.population}*/}
                                {/*island={this.state.island}/>*/}
                    <IslandView width={this.state.mainViewWidth}
                                height={this.state.mainViewHeight}
                                island={this.state.island}/>
                </div>
                {/*<div className="control-panel">*/}
                {/*<div className="explanation">*/}
                {/*<h1>Galapagotchi</h1>*/}
                {/*<p>*/}
                {/*The native animals on the Galapagotch Islands are members of*/}
                {/*various species of robot runners, each one evolved and driven*/}
                {/*by its master.*/}
                {/*</p>*/}
                {/*<p>*/}
                {/*So far a work-in-progress, but stay tuned!*/}
                {/*</p>*/}
                {/*<h2>@fluxe</h2>*/}
                {/*</div>*/}
                {/*/!*<ControlPanel population={this.state.population}/>*!/*/}
                {/*</div>*/}
            </div>
        );
    }

    private updateDimensions = () => {
        this.setState({
            mainViewWidth: window.innerWidth * HORIZONTAL_SPLIT,
            mainViewHeight: window.innerHeight,
            islandViewWidth: window.innerWidth * (1 - HORIZONTAL_SPLIT),
            islandViewHeight: window.innerHeight * VERTICAL_SPLIT
        });
    };

}

export default App;
