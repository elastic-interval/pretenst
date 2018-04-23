import * as React from 'react';
import {HEXAGON_POINTS} from './patch-token/constants';
import './app.css'

class PatchView extends React.Component {

    public sayHello(event: React.MouseEvent<SVGPolygonElement>): void {
        console.log('hello!', event);
    }

    public render() {
        return (
            <svg className="TokenView" viewBox="-1,-1,2,2"
                 width={window.innerWidth} height={window.innerHeight}>
                <polygon points={HEXAGON_POINTS} onClick={this.sayHello}/>
            </svg>
        );
    }
}

export default PatchView;

/*

  get mainViewBox() {
    return this.patch ? this.zoomViewBox ? this.zoomViewBox : this.patch.mainViewBox : '-1,-1,2,2';
  }

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