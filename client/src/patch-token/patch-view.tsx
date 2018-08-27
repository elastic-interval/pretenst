import {CellHexagon} from './cell-hexagon';
import {Patch} from './patch';
import {PatchToken} from './patch-token';
import {Cell} from './cell';
import {HEXAGON_POINTS, IPatchPattern} from './constants';
import * as React from 'react';

interface IPatchViewProps {
}

interface IPatchViewState {
    selectedToken?: PatchToken;
    tokenMode: boolean;
    patch: Patch;
    owner: string
}

class PatchView extends React.Component<IPatchViewProps, IPatchViewState> {

    private ownershipCache: Map<string, string>;

    constructor(props: IPatchViewProps) {
        super(props);
        const existingOwner = localStorage.getItem('owner');
        const owner = existingOwner ? existingOwner : 'gumby';
        const existingPattern = localStorage.getItem(owner);
        const patch = new Patch(this.ownerLookup);
        const pattern: IPatchPattern = existingPattern ? JSON.parse(existingPattern) : {patches: '0', lights: '0'};
        patch.apply(pattern);

        this.state = {
            tokenMode: false,
            patch,
            owner
        };
    }

    public render() {
        return (
            <div>
                <svg className="TokenView"
                     viewBox={this.state.patch.mainViewBox}
                     width={window.innerWidth}
                     height={window.innerHeight}>
                    {this.selectedToken}
                    {this.lights}
                </svg>
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

    private get selectedToken() {
        if (this.state.selectedToken) {
            const token = this.state.selectedToken;
            const className = 'token-highlight ' + (token.owner ?
                token.owner === this.state.owner ?
                    'token-highlight-owned' : 'token-highlight-taken' : 'token-highlight-free');
            return <polygon key={this.state.selectedToken.coords.x}
                            points={HEXAGON_POINTS}
                            transform={this.state.selectedToken.transform}
                            className={className}/>
        } else {
            return null
        }
    }

    private get lights() {
        const cellEnter = (cell: Cell, inside: boolean) => {
            if (inside) {
                const tokenMode = !!cell.centerOfToken || cell.canBeNewToken || cell.free;
                this.setState({tokenMode});
            }
            if (cell.centerOfToken) {
                const selectedToken = inside ? cell.centerOfToken : undefined;
                this.setState({selectedToken});
            }
        };
        const cellClicked = (cell: Cell) => {
            if (cell.free) {
                cell.lit = !cell.lit;
                this.setPatch(this.state.patch);
            } else if (cell.canBeNewToken) {
                const patch = this.state.patch.withTokenAroundCell(cell);
                this.setPatch(patch);
            } else {
                const selectedToken = cell.centerOfToken;
                this.setState({selectedToken});
            }
        };
        return this.state.patch.cells.map((cell: Cell, index: number) => {
            return <CellHexagon key={index}
                                cell={cell}
                                isSelf={(owner: string) => owner === this.state.owner}
                                tokenMode={this.state.tokenMode}
                                cellClicked={cellClicked}
                                cellEntered={cellEnter}/>
        })
    }

    private ownerLookup = (fingerprint: string) => this.owns[fingerprint];

    private setPatch = (patch: Patch) => {
        setTimeout(() => {
            localStorage.setItem(this.state.owner, JSON.stringify(patch.pattern))
        });
        this.setState({patch});
    };

}

export default PatchView;
