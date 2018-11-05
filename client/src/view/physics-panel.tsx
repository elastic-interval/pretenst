import * as React from 'react';
import {IPhysicsFeature, Physics} from '../body/physics';

export interface IPhysicsPanelProps {
    physics: Physics;
}

export interface IPhysicsPanelState {
    feature?: IPhysicsFeature;
    value?: number;
}

function featureSelected(feature: IPhysicsFeature) {
    return (): any => {
        return {
            feature,
            value: feature.getFactor()
        };
    };
}

export class PhysicsPanel extends React.Component<IPhysicsPanelProps, IPhysicsPanelState> {

    constructor(props: IPhysicsPanelProps) {
        super(props);
        this.state = {};
    }

    public featureUp() {
        const feature = this.state.feature;
        if (feature) {
            feature.setFactor(feature.getFactor() * 1.1);
            this.setState(featureSelected(feature));
        }
    }

    public featureDown() {
        const feature = this.state.feature;
        if (feature) {
            feature.setFactor(feature.getFactor() * 0.9);
            this.setState(featureSelected(feature));
        }
    }

    public featureReset() {
        const feature = this.state.feature;
        if (feature) {
            feature.setFactor(1);
            this.setState(featureSelected(feature));
        }
    }

    public render() {
        const feature = this.state.feature;
        const value = this.state.value;
        return (
            <div key="control-panel">
                <h3>Physics</h3>
                <div>
                    {
                        this.props.physics.features.map(physicsFeature => {
                            return (
                                <span key={physicsFeature.feature}>
                                    <button onClick={() => this.setState(featureSelected(physicsFeature))}>
                                        {physicsFeature.feature}
                                    </button>
                                </span>);
                        })
                    }
                </div>
                <div>
                    {
                        !feature || !value ?
                            <div className="feature-prompt">choose one</div>
                            :
                            <div>
                                <div className="feature-prompt">{feature.feature}</div>
                                <div>
                                    <button onClick={() => this.featureUp()}>+</button>
                                    <button onClick={() => this.featureDown()}>-</button>
                                </div>
                                <div>
                                    <strong className="feature-value">{value}</strong>
                                </div>
                                <div>
                                    <button onClick={() => this.featureReset()}>reset</button>
                                </div>
                            </div>
                    }
                </div>
            </div>
        );
    }
}

//
