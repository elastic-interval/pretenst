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

    private ownershipCache = new Map<string, string>();

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
                <div>
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
        this.state.patch.refreshOwnership();
    }

    private get owns(): Map<string, string> {
        if (!this.ownershipCache) {
            const ownership = localStorage.getItem('ownership');
            if (ownership) {
                this.ownershipCache = JSON.parse(ownership);
            }
        }
        return this.ownershipCache;
    }

    private ownerLookup = (fingerprint: string) => {
        if (this.ownershipCache) {
            return this.ownershipCache[fingerprint];
        } else {
            const ownership = localStorage.getItem('ownership');
            if (ownership) {
                this.ownershipCache = JSON.parse(ownership);
                return this.ownershipCache[fingerprint];
            } else {
                return null;
            }
        }
    };
}

export default App;
