import * as React from 'react';
import {Light} from './patch-token/light';
import {HEXAGON_POINTS} from './patch-token/constants';

interface IHexagonProps {
    light: Light;
    isSelf: (owner: string) => boolean;
    tokenMode: boolean;
    lightClicked: (light: Light) => void;
    lightEnter: (light: Light, inside: boolean) => void;
}

interface IHexagonState {
    light: Light;
}

export class Hexagon extends React.Component<IHexagonProps, IHexagonState> {

    constructor(props: IHexagonProps) {
        super(props);
        this.state = {light: props.light};
    }

    public render() {
        const lightClicked = (light: Light) => {
            this.props.lightClicked(light);
            this.setState({light: this.props.light}); // forcing repaint
        };
        return <polygon key={this.state.light.coords.x}
                        points={HEXAGON_POINTS}
                        transform={this.state.light.transform}
                        className={this.className}
                        onClick={e => lightClicked(this.state.light)}
                        onMouseEnter={e => this.props.lightEnter(this.state.light, true)}
                        onMouseLeave={e => this.props.lightEnter(this.state.light, false)}/>;
    }

    private get className() {
        const light = this.state.light;
        const onOff = light.lit ? 'on' : 'off';
        const insideOutside = this.props.tokenMode ? 'inside' : 'outside';
        const baseClass = `light-${onOff}-${insideOutside}`;
        if (this.props.tokenMode) {
            if (light.centerOfToken) {
                const owner = light.centerOfToken.owner;
                const ownership = owner ? this.props.isSelf(owner) ? 'self-owned' : 'other-owned' : 'token-free';
                return `${baseClass} light-${ownership}`;
            } else if (light.canBeNewToken) {
                return `${baseClass} light-new`;
            } else if (light.free) {
                return `${baseClass} light-free`;
            } else {
                return baseClass;
            }
        } else {
            return light.free ? `${baseClass} light-free` : baseClass;
        }
    }
}