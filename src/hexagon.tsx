import * as React from 'react';
import {Light} from './patch-token/light';
import {HEXAGON_POINTS} from './patch-token/constants';

interface IHexagonProps {
    light: Light;
    isSelf: (owner: string) => boolean;
    tokenMode: boolean;
    lightClicked: () => void;
    lightEnter: (inside: boolean) => void;
}

export class Hexagon extends React.Component<IHexagonProps, any> {

    constructor(props: IHexagonProps) {
        super(props);
    }

    public render() {
        return <polygon key={this.props.light.coords.x}
                        points={HEXAGON_POINTS}
                        transform={this.props.light.transform}
                        className={this.className}
                        onClick={this.props.lightClicked}
                        onMouseEnter={e => this.props.lightEnter(true)}
                        onMouseLeave={e => this.props.lightEnter(false)}/>;
    }

    private get className() {
        const light = this.props.light;
        const onOff = light.lit ? 'on' : 'off';
        const insideOutside = this.props.tokenMode ? 'inside' : 'outside';
        const baseClass = `light-${onOff}-${insideOutside}`;
        if (this.props.tokenMode) {
            if (light.centerOfToken) {
                const owner = light.centerOfToken.owner;
                const ownership = owner ? this.props.isSelf(owner) ? 'self-owned' : 'other-owned' : 'free';
                return `${baseClass}-${ownership}`;
            } else if (light.canBeNewToken) {
                return `${baseClass}-new`;
            } else {
                return baseClass;
            }
        } else {
            return baseClass;
        }
    }
}