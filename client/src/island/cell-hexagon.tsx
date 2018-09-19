import * as React from 'react';
import {Cell} from './cell';
import {HEXAGON_POINTS} from './constants';

interface IHexagonProps {
    cell: Cell;
    isSelf: (owner: string) => boolean;
    gotchMode: boolean;
    cellClicked: (cell: Cell) => void;
    cellEntered: (cell: Cell, inside: boolean) => void;
}

interface IHexagonState {
    cell: Cell;
}

export class CellHexagon extends React.Component<IHexagonProps, IHexagonState> {

    constructor(props: IHexagonProps) {
        super(props);
        this.state = {cell: props.cell};
    }

    public render() {
        const lightClicked = (cell: Cell) => {
            this.props.cellClicked(cell);
            this.setState({cell: this.props.cell}); // forcing repaint
        };
        return <polygon key={this.state.cell.coords.x}
                        points={HEXAGON_POINTS}
                        transform={this.state.cell.transform}
                        className={this.className}
                        onClick={e => lightClicked(this.state.cell)}
                        onMouseEnter={e => this.props.cellEntered(this.state.cell, true)}
                        onMouseLeave={e => this.props.cellEntered(this.state.cell, false)}/>;
    }

    private get className() {
        const cell = this.state.cell;
        const onOff = cell.lit ? 'on' : 'off';
        const insideOutside = this.props.gotchMode ? 'inside' : 'outside';
        const baseClass = `cell-${onOff}-${insideOutside}`;
        if (this.props.gotchMode) {
            if (cell.centerOfToken) {
                const owner = cell.centerOfToken.owner;
                const ownership = owner ? this.props.isSelf(owner) ? 'self-owned' : 'other-owned' : 'gotch-free';
                return `${baseClass} cell-${ownership}`;
            } else if (cell.canBeNewToken) {
                return `${baseClass} cell-new`;
            } else if (cell.free) {
                return `${baseClass} cell-free`;
            } else {
                return baseClass;
            }
        } else {
            return cell.free ? `${baseClass} cell-free` : baseClass;
        }
    }
}