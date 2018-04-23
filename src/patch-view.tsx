import * as React from 'react';
import {HEXAGON_POINTS} from './patch-token/constants';
import './app.css'
import {Light} from './patch-token/light';
import {Patch} from './patch-token/patch';
import {PatchToken} from './patch-token/patch-token';

interface IPatchViewProps {
    patch: Patch;
    owner: string;
}

interface IPatchViewState {
    patch: Patch;
    owner: string;
    selectedToken?: PatchToken;
    detailMode: boolean;
    lightMode: boolean;
    purchaseEnabled: boolean;
}

class PatchView extends React.Component<IPatchViewProps, IPatchViewState> {

    constructor(props: any) {
        super(props);
        this.state = {
            patch: props.patch,
            owner: props.owner,
            detailMode: false,
            lightMode: false,
            purchaseEnabled: false
        };
    }

    public render() {
        return (
            <div>
                {this.selectedToken}
                <svg className="TokenView"
                     viewBox={this.state.patch.mainViewBox}
                     width={window.innerWidth}
                     height={window.innerHeight}>
                    {this.lights}
                </svg>
            </div>
        );
    }

    private get selectedToken() {
        if (this.state.selectedToken) {
            return <h3>selected</h3>
        } else {
            return <h3>nope</h3>
        }
    }

    private get lights() {
        return this.state.patch.lights.map((light: Light, index: number) => {
            return <polygon key={index}
                            points={HEXAGON_POINTS}
                            transform={light.transform}
                            className={this.getLightClassses(light)}
                            onClick={e => this.lightClicked(light)}
                            onMouseEnter={e => this.lightEnter(light, true)}
                            onMouseLeave={e => this.lightEnter(light, false)}/>;
        })
    }

    private lightEnter(light: Light, inside: boolean): void {
        if (inside) {
            this.setState({
                detailMode: !!light.centerOfToken || light.canBeNewToken || light.free,
                lightMode: light.free
            });
        }
        if (light.centerOfToken) {
            this.setState({
                selectedToken: inside ? light.centerOfToken : undefined
            });
        }
    };

    private lightClicked(light: Light) {
        if (light.free) {
            light.lit = !light.lit;
            this.state.patch.refreshPattern();
        } else if (light.canBeNewToken) {
            const patchToken = this.state.patch.patchTokenAroundLight(light);
            if (patchToken) {
                this.setState({
                    selectedToken: patchToken,
                    purchaseEnabled: patchToken.canBePurchased
                });
                this.state.patch.refreshViewBox();
            }
        } else {
            const selectedToken = light.centerOfToken;
            this.setState({
                selectedToken,
                purchaseEnabled: selectedToken ? selectedToken.canBePurchased : false
            });
        }
        this.state.patch.refreshOwnership();
    }

    private getLightClassses(light: Light): string {
        const map = {'light': true};
        if (this.state.detailMode) {
            if (this.state.lightMode) {
                map['light-lit'] = light.lit;

                map['light-background'] = !light.lit;
            } else {
                map['light-lit-dim'] = light.lit;
                map['light-background'] = !light.lit;
                const possible = light.canBeNewToken;
                map[`light-token-available`] = possible;
                map['light-token-highlighted'] = possible || light.centerOfToken;
                if (light.centerOfToken) {
                    if (light.centerOfToken.owner) {
                        map['light-token-center-taken'] = light.centerOfToken.owner !== this.state.owner;
                        map[`light-token-center-owned`] = light.centerOfToken.owner === this.state.owner;
                    } else {
                        map['light-token-center-free'] = true;
                    }
                }
            }
            if (light.free && !this.state.patch.isSingleToken) {
                map['light-token-highlighted'] = true;
                map['light-toggle-enabled'] = true;
            }
        } else {
            map['light-lit'] = light.lit;
            // map['light-background'] = !light.lit;
            const thickness = light.memberOfToken.length > 80 ? 80 : light.memberOfToken.length;
            map[`light-background-${thickness}`] = !light.lit;
        }
        return Object.keys(map).filter(key => map[key]).join(' ');
    }


}

export default PatchView;

/*

<svg [attr.viewBox]="mainViewBox" (click)="clickBackground()" class="main-panel">
  <g *ngIf="selectedToken && !patch.isSingleToken" [attr.transform]="selectedToken.transform" [ngClass]="selectedTokenClassMap">
    <polygon id="selected" [attr.points]="hexagonPoints"/>
  </g>
  <g *ngFor="let light of lights; let lightIndex=index;">
    <g [ngClass]="patchViewClassMap(light)" (click)="clickLight(light, $event)"
           (mouseenter)="lightEnter(light, true)" (mouseleave)="lightEnter(light, false)">
      <polygon
        [id]="'hex' + lightIndex"
        [attr.transform]="light.transform"
        [attr.points]="hexagonPoints"/>
    </g>
  </g>
</svg>

<div className="token-container">
  <svg  xmlns:svg="http://www.w3.org/2000/svg" [attr.viewBox]="tokenViewBox" class="token-panel">
    <g *ngFor="let frame of tokenFrames; let frameIndex = index;" (click)="clickToken(frame)">
      <g *ngIf="frame" [attr.transform]="frame.transform">
        <polygon
          [ngClass]="{'token-background': frame.owner === owner, 'token-background-free': !frame.owner }"
          [id]="'frame' + frameIndex"
          transform="rotate(30) scale(1.47)"
          [attr.points]="hexagonPoints"/>
        <g *ngFor="let light of frame.lights; let lightIndex=index;">
          <g [ngClass]="tokenViewClassMap(light)">
            <polygon
              [id]="'tlight' + lightIndex"
              [attr.transform]="light.transform"
              [attr.points]="hexagonPoints"/>
          </g>
        </g>
      </g>
    </g>
  </svg>
</div>
 */