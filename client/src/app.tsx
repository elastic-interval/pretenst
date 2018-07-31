import * as React from 'react';
import './app.css';
import {Panorama} from './experimental/panorama';

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
                <Panorama width={window.innerWidth} height={window.innerHeight}/>
                {/*<PatchView hello={this.state.hello}/>*/}
            </div>
        );
    }

}

export default App;
