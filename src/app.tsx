import * as React from 'react';
import './app.css';

import PatchView from './patch-view';
import {Patch} from './patch-token/patch';
import {IPatchPattern} from './patch-token/constants';

class App extends React.Component<any, any> {

    private patch: Patch;

    constructor(props: any) {
        super(props);
        const pattern: IPatchPattern = {patches: '0', lights: '0'};
        this.patch = new Patch(pattern, this.ownerLookup);
    }

    public render() {
        return (
            <div className="App">
                <PatchView patch={this.patch}/>
            </div>
        );
    }

    private ownerLookup = (fingerprint: string): string => '';

}

export default App;
