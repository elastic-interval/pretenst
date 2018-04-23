import * as React from 'react';
import './app.css';

import PatchView from './patch-view';
import {Patch} from './patch-token/patch';
import {IPatchPattern} from './patch-token/constants';

interface IAppState {
    patch: Patch;
    owner: string;
}

class App extends React.Component<any, IAppState> {

    constructor(props: any) {
        super(props);
        const pattern: IPatchPattern = {patches: '0', lights: '0'};
        this.state = {
            patch: new Patch(pattern, this.ownerLookup),
            owner: 'gumby'
        };
    }

    public render() {
        return (
            <div className="App">
                <PatchView patch={this.state.patch} owner={this.state.owner}/>
            </div>
        );
    }

    private ownerLookup = (fingerprint: string): string => '';

}

export default App;
