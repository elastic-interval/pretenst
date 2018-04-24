import * as React from 'react';
import './app.css'
import {Light} from './patch-token/light';
import {Patch} from './patch-token/patch';
import {PatchToken} from './patch-token/patch-token';
import {Hexagon} from './hexagon';

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
                {this.selectedToken}
                <svg className="TokenView"
                     viewBox={this.props.patch.mainViewBox}
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
        const lightEnter = (light: Light, inside: boolean) => {
            if (inside) {
                const tokenMode = !!light.centerOfToken || light.canBeNewToken || light.free;
                this.setState({tokenMode});
            }
            if (light.centerOfToken) {
                const selectedToken = inside ? light.centerOfToken : undefined;
                this.setState({selectedToken});
            }
        };
        const lightClicked = (light: Light) => {
            if (light.free) {
                light.lit = !light.lit;
                this.props.setPatch(this.props.patch);
            } else if (light.canBeNewToken) {
                const patch = this.props.patch.withTokenAroundLight(light);
                this.props.setPatch(patch);
            } else {
                const selectedToken = light.centerOfToken;
                this.setState({selectedToken});
            }
        };
        return this.props.patch.lights.map((light: Light, index: number) => {
            return <Hexagon key={index}
                            light={light}
                            isSelf={(owner: string) => owner === this.props.owner}
                            tokenMode={this.state.tokenMode}
                            lightClicked={lightClicked}
                            lightEnter={lightEnter}/>
        })
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