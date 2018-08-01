import * as React from 'react';
import './app.css';
import {EigView} from './eig/eig-view';

// import PatchView from './patch-token/patch-view';

interface IAppState {
    hello: string;
}

class App extends React.Component<any, IAppState> {

    constructor(props: any) {
        super(props);
        this.state = {hello: 'hello'};
    }

    public render() {
        return (
            <div className="App">
                <EigView width={window.innerWidth} height={window.innerHeight}/>
                {/*<PatchView hello={this.state.hello}/>*/}
            </div>
        );
    }

}

export default App;
