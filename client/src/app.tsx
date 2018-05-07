import * as React from 'react';
import './app.css';

import PatchView from './patch-view';
import {Patch} from './patch-token/patch';
import {IPatchPattern} from './patch-token/constants';

interface IAppState {
    patch: Patch;
    owner: string
}

class App extends React.Component<any, IAppState> {

    private ownershipCache: Map<string, string>;

    constructor(props: any) {
        super(props);
        const existingOwner = localStorage.getItem('owner');
        const owner = existingOwner ? existingOwner : 'gumby';
        const existingPattern = localStorage.getItem(owner);
        const patch = new Patch(this.ownerLookup);
        const pattern: IPatchPattern = existingPattern ? JSON.parse(existingPattern) : {patches: '0', lights: '0'};
        patch.apply(pattern);
        this.state = {patch, owner};
    }

    public render() {
        return (
            <div className="App">
                <PatchView patch={this.state.patch} owner={this.state.owner} setPatch={this.setPatch}/>
                <div className="BottomView">
                    <button onClick={() => this.purchaseFreeTokens()}
                            disabled={this.purchaseDisabled}>Purchase free tokens
                    </button>
                </div>
            </div>
        );
    }

    private get purchaseDisabled(): boolean {
        return this.state.patch.freeTokens.length === 0;
    }

    private purchaseFreeTokens() {
        const owns = this.owns;
        this.state.patch.freeTokens.forEach(token => owns[token.createFingerprint()] = this.state.owner);
        localStorage.setItem('ownership', JSON.stringify(this.ownershipCache));
        this.setState({patch: this.state.patch.dumbClone}); // force repaint
    }

    private get owns(): Map<string, string> {
        if (!this.ownershipCache) {
            const ownership = localStorage.getItem('ownership');
            this.ownershipCache = ownership ? JSON.parse(ownership) : new Map<string, string>();
        }
        return this.ownershipCache;
    }

    private setPatch = (patch: Patch) => {
        setTimeout(() => {
            localStorage.setItem(this.state.owner, JSON.stringify(patch.pattern))
        });
        this.setState({patch});
    };

    private ownerLookup = (fingerprint: string) => this.owns[fingerprint];
}

export default App;
