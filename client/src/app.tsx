import * as React from 'react';
import './app.css';
import {IFabricExports} from './body/fabric-exports';
import {Population} from './gotchi/population';
import {ControlPanel} from './view/control-panel';
import {Island, IslandPattern} from './island/island';
import {GotchiView} from './view/gotchi-view';

interface IAppProps {
    createFabricInstance: () => Promise<IFabricExports>;
}

interface IAppState {
    population: Population;
    island: Island;
    viewWidth: number;
    viewHeight: number;
}

const MAIN_VIEW_HEIGHT = 0.96;

class App extends React.Component<IAppProps, IAppState> {

    constructor(props: IAppProps) {
        super(props);
        const existingOwner = localStorage.getItem('owner');
        const owner = existingOwner ? existingOwner : 'gumby';
        const existingPattern = localStorage.getItem(owner);
        const pattern: IslandPattern = existingPattern ? JSON.parse(existingPattern) : {gotches: '0', spots: '0'};
        this.state = {
            population: new Population(props.createFabricInstance),
            island: new Island(pattern),
            viewWidth: window.innerWidth,
            viewHeight: window.innerHeight * MAIN_VIEW_HEIGHT
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
                <div id="view-panel">
                    {/*<IslandView width={this.state.viewWidth}*/}
                                {/*height={this.state.viewHeight}*/}
                                {/*island={this.state.island}/>*/}
                    <GotchiView width={this.state.viewWidth}
                                height={this.state.viewHeight}
                                population={this.state.population}
                                island={this.state.island}/>
                </div>
                <div className="control-panel">
                    <ControlPanel population={this.state.population}/>
                </div>
            </div>
        );
    }

    private updateDimensions = () => {
        this.setState({viewWidth: window.innerWidth, viewHeight: window.innerHeight * MAIN_VIEW_HEIGHT});
        console.log(`w=${this.state.viewWidth}, h=${this.state.viewHeight}`);
    };

}

export default App;
