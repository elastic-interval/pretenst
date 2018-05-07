import * as React from 'react';
import './app.css'
import {Cell} from './patch-token/cell';
import {Patch} from './patch-token/patch';
import {PatchToken} from './patch-token/patch-token';
import {HEXAGON_POINTS} from './patch-token/constants';
import {CellHexagon} from './cell-hexagon';

interface IPatchViewProps {
    patch: Patch;
    owner: string;
    setPatch: (patch: Patch) => void;
}

interface IPatchViewState {
    selectedToken?: PatchToken;
    tokenMode: boolean;
}

class PatchView extends React.Component<IPatchViewProps, IPatchViewState> {

    constructor(props: IPatchViewProps) {
        super(props);
        this.state = {
            tokenMode: false
        };
    }

    public render() {
        return (
            <div>
                <svg className="TokenView"
                     viewBox={this.props.patch.mainViewBox}
                     width={window.innerWidth}
                     height={window.innerHeight}>
                    {this.selectedToken}
                    {this.lights}
                </svg>
            </div>
        );
    }

    private get selectedToken() {
        if (this.state.selectedToken) {
            const token = this.state.selectedToken;
            const className = 'token-highlight ' + (token.owner ?
                token.owner === this.props.owner ?
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
                this.props.setPatch(this.props.patch);
            } else if (cell.canBeNewToken) {
                const patch = this.props.patch.withTokenAroundCell(cell);
                this.props.setPatch(patch);
            } else {
                const selectedToken = cell.centerOfToken;
                this.setState({selectedToken});
            }
        };
        return this.props.patch.cells.map((cell: Cell, index: number) => {
            return <CellHexagon key={index}
                                cell={cell}
                                isSelf={(owner: string) => owner === this.props.owner}
                                tokenMode={this.state.tokenMode}
                                cellClicked={cellClicked}
                                cellEntered={cellEnter}/>
        })
    }
}

export default PatchView;
