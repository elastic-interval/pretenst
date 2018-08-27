import * as React from 'react';
import './app.css';
import {IFabricExports} from './fabric-exports';
import {EigView} from './eig/eig-view';

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
                <EigView createFabricInstance={this.props.createFabricInstance}/>
                {/*<PatchView/>*/}
            </div>
        );
    }

}

export default App;
