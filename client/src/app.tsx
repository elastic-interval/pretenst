import * as React from 'react';
import './app.css';
import {IFabricExports} from './body/fabric-exports';
import {Population} from './gotchi/population';
import {GotchiView} from './view/gotchi-view';
import {ControlPanel} from './view/control-panel';

interface IAppProps {
    createFabricInstance: () => Promise<IFabricExports>;
}

interface IAppState {
    population: Population;
}

class App extends React.Component<IAppProps, IAppState> {

    constructor(props: IAppProps) {
        super(props);
        this.state = {population: new Population(props.createFabricInstance)};
    }

    public render() {
        return (
            <div className="App">
                <div className="gotchi-panel">
                    <GotchiView width={window.innerWidth}
                                height={window.innerHeight * 0.96}
                                population={this.state.population}/>
                </div>
                <div className="control-panel">
                    <ControlPanel population={this.state.population}/>
                </div>
            </div>
        );
    }

}

export default App;
