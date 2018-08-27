import * as React from 'react';
import './app.css';
import {EigView} from './eig/eig-view';
import {IFabricExports} from './fabric-exports';

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
                {/*<PatchView hello={this.state.hello}/>*/}
            </div>
        );
    }

}

export default App;
