import * as React from 'react';
import './app.css';
import {IFabricExports} from './body/fabric-exports';
import {GotchiView} from './gotchi-view';
import {ControlPanel} from './control-panel';
import {Population} from './gotchi/population';

interface IAppProps {
    createFabricInstance: () => Promise<IFabricExports>;
}

class App extends React.Component<IAppProps, any> {

    private population: Population;

    constructor(props: IAppProps) {
        super(props);
        this.population = new Population(props.createFabricInstance);
    }

    public render() {
        return (
            <div className="App">
                <div className="gotchi-panel">
                    <GotchiView width={window.innerWidth} height={window.innerHeight * 0.96} population={this.population}/>
                </div>
                <div className="control-panel">
                    <ControlPanel population={this.population}/>
                </div>
            </div>
        );
    }

}

export default App;
