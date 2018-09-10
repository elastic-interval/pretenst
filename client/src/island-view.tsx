import {CellHexagon} from './island/cell-hexagon';
import {Cell} from './island/cell';
import {HEXAGON_POINTS, IGotchPattern} from './island/constants';
import * as React from 'react';
import {Gotch} from './island/gotch';
import {Island} from './island/island';

interface IslandViewState {
    selectedGotch?: Gotch;
    gotchMode: boolean;
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
            gotchMode: false,
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
        return this.state.island.freeGotches.length === 0;
    }

    private purchaseFreeGotches() {
        const owns = this.owns;
        this.state.island.freeGotches.forEach(gotch => owns[gotch.createFingerprint()] = this.state.owner);
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
        if (this.state.selectedGotch) {
            const gotch = this.state.selectedGotch;
            const className = 'gotch-highlight ' + (gotch.owner ?
                gotch.owner === this.state.owner ?
                    'gotch-highlight-owned' : 'gotch-highlight-taken' : 'gotch-highlight-free');
            return <polygon key={this.state.selectedGotch.coords.x}
                            points={HEXAGON_POINTS}
                            transform={this.state.selectedGotch.transform}
                            className={className}/>
        } else {
            return null
        }
    }

    private get lights() {
        const cellEnter = (cell: Cell, inside: boolean) => {
            if (inside) {
                const gotchMode = !!cell.centerOfGotch || cell.canBeNewGotch || cell.free;
                this.setState({gotchMode});
            }
            if (cell.centerOfGotch) {
                const selectedGotch = inside ? cell.centerOfGotch : undefined;
                this.setState({selectedGotch});
            }
        };
        const cellClicked = (cell: Cell) => {
            if (cell.free) {
                cell.lit = !cell.lit;
                this.setGotch(this.state.island);
            } else if (cell.canBeNewGotch) {
                const gotch = this.state.island.withGotchAroundCell(cell);
                this.setGotch(gotch);
            } else {
                const selectedGotch = cell.centerOfGotch;
                this.setState({selectedGotch});
            }
        };
        return this.state.island.cells.map((cell: Cell, index: number) => {
            return <CellHexagon key={index}
                                cell={cell}
                                isSelf={(owner: string) => owner === this.state.owner}
                                gotchMode={this.state.gotchMode}
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
