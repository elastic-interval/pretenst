import * as React from 'react';
import './app.css';
import {IFabricExports} from './body/fabric-exports';
import {GotchiView} from './gotchi-view';

interface IAppProps {
    createFabricInstance: () => Promise<IFabricExports>;
}

class App extends React.Component<IAppProps, any> {

    constructor(props: IAppProps) {
        super(props);
    }

    public render() {
        return (
            <div className="App">
                <GotchiView createFabricInstance={this.props.createFabricInstance}/>
                <div>[R]=rebirth, [G]=new-genome, [M]=add-muscle, [space]=trigger-muscles</div>
                {/*<IslandView/>*/}
            </div>
        );
    }

}

export default App;
