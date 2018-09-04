import * as React from 'react';
import './app.css';
import {IFabricExports} from './gotchi/fabric-exports';
import {GotchiView} from './gotchi/gotchi-view';

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
                {/*<PatchView/>*/}
            </div>
        );
    }

}

export default App;
