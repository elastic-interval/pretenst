import * as React from 'react';
import {Evolution} from '../gotchi/evolution';
import {IPhysicsFeature} from '../body/physics';

export interface IControlPanelProps {
    evolution: Evolution;
}

export interface IControlPanelState {
    feature?: IPhysicsFeature;
    value?: number;
}

export class ControlPanel extends React.Component<IControlPanelProps, IControlPanelState> {

    constructor(props: IControlPanelProps) {
        super(props);
        this.state = {};
    }

    public selectFeature(feature: IPhysicsFeature) {
        this.setState({feature, value: feature.getFactor()});
    }

    public featureUp() {
        const feature = this.state.feature;
        if (feature) {
            feature.setFactor(feature.getFactor() * 1.1);
            this.setState({value: feature.getFactor()});
            this.props.evolution.applyPhysics();
        }
    }

    public featureDown() {
        const feature = this.state.feature;
        if (feature) {
            feature.setFactor(feature.getFactor() * 0.9);
            this.setState({value: feature.getFactor()});
            this.props.evolution.applyPhysics();
        }
    }

    public featureReset() {
        const feature = this.state.feature;
        if (feature) {
            feature.setFactor(1);
            this.setState({value: feature.getFactor()});
            this.props.evolution.applyPhysics();
        }
    }

    public render() {
        const feature = this.state.feature;
        const value = this.state.value;
        return (
            <div key="control-panel">
                <strong className="dice">&#x2680;&#x2681;&#x2682;&#x2683;&#x2684;&#x2685;</strong>
                <div>
                    {
                        this.props.evolution.physics.features.map(physicsFeature => {
                            return <div key={physicsFeature.feature}>
                                <button onClick={() => this.selectFeature(physicsFeature)}>
                                    {physicsFeature.feature}
                                </button>
                            </div>;
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
