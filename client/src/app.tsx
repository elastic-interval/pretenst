import * as React from 'react';
import './app.css';
import {EigView} from './eig/eig-view';
import {IEigWasm} from './eig-wasm';

interface IAppProps {
    eigWasm: IEigWasm;
}

class App extends React.Component<IAppProps, any> {

    constructor(props: IAppProps) {
        super(props);
    }

    public render() {
        return (
            <div className="App">
                <EigView width={window.innerWidth} height={window.innerHeight} eigWasm={this.props.eigWasm}/>
                {/*<PatchView hello={this.state.hello}/>*/}
            </div>
        );
    }

}

export default App;
