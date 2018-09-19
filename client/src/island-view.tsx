import {CellHexagon} from './island/cell-hexagon';
import {Cell} from './island/cell';
import {HEXAGON_POINTS, IGotchPattern} from './island/constants';
import * as React from 'react';
import {Island} from './island/island';
import {Token} from './island/token';

interface IslandViewState {
    selectedToken?: Token;
    tokenMode: boolean;
    island: Island;
    owner: string
}

class IslandView extends React.Component<any, IslandViewState> {

    private ownershipCache: Map<string, string>;

    constructor(props: any) {
        super(props);
        const existingOwner = localStorage.getItem('owner');
        const owner = existingOwner ? existingOwner : 'gumby';
        const existingPattern = localStorage.getItem(owner);
        const island = new Island(this.ownerLookup);
        const pattern: IGotchPattern = existingPattern ? JSON.parse(existingPattern) : {gotches: '0', lights: '0'};
        island.apply(pattern);

        this.state = {
            tokenMode: false,
            island,
            owner
        };
    }

    public render() {
        return (
            <div>
                <svg className="GotchView"
                     viewBox={this.state.island.mainViewBox}
                     width={window.innerWidth}
                     height={window.innerHeight}>
                    {this.selectedGotch}
                    {this.lights}
                </svg>
                <div className="BottomView">
                    <button onClick={() => this.purchaseFreeGotches()}
                            disabled={this.purchaseDisabled}>Purchase free gotches
                    </button>
                </div>
            </div>
        );
    }

    private get purchaseDisabled(): boolean {
        return this.state.island.freeTokens.length === 0;
    }

    private purchaseFreeGotches() {
        const owns = this.owns;
        this.state.island.freeTokens.forEach(gotch => owns[gotch.createFingerprint()] = this.state.owner);
        localStorage.setItem('ownership', JSON.stringify(this.ownershipCache));
        this.setState({island: this.state.island.dumbClone}); // force repaint
    }

    private get owns(): Map<string, string> {
        if (!this.ownershipCache) {
            const ownership = localStorage.getItem('ownership');
            this.ownershipCache = ownership ? JSON.parse(ownership) : new Map<string, string>();
        }
        return this.ownershipCache;
    }

    private get selectedGotch() {
        if (this.state.selectedToken) {
            const gotch = this.state.selectedToken;
            const className = 'gotch-highlight ' + (gotch.owner ?
                gotch.owner === this.state.owner ?
                    'gotch-highlight-owned' : 'gotch-highlight-taken' : 'gotch-highlight-free');
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
                this.setGotch(this.state.island);
            } else if (cell.canBeNewToken) {
                const gotch = this.state.island.withTokenAroundCell(cell);
                this.setGotch(gotch);
            } else {
                const selectedToken = cell.centerOfToken;
                this.setState({selectedToken});
            }
        };
        return this.state.island.cells.map((cell: Cell, index: number) => {
            return <CellHexagon key={index}
                                cell={cell}
                                isSelf={(owner: string) => owner === this.state.owner}
                                gotchMode={this.state.tokenMode}
                                cellClicked={cellClicked}
                                cellEntered={cellEnter}/>
        })
    }

    private ownerLookup = (fingerprint: string) => this.owns[fingerprint];

    private setGotch = (island: Island) => {
        setTimeout(() => {
            localStorage.setItem(this.state.owner, JSON.stringify(island.pattern))
        });
        this.setState({island});
    };

}

export default IslandView;
