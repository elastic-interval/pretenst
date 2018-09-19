import * as React from 'react';
import {Population} from './gotchi/population';
import {IPhysicsFeature} from './body/physics';

export interface IControlPanelProps {
    population: Population;
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
            this.props.population.applyPhysics();
        }
    }

    public featureDown() {
        const feature = this.state.feature;
        if (feature) {
            feature.setFactor(feature.getFactor() * 0.9);
            this.setState({value: feature.getFactor()});
            this.props.population.applyPhysics();
        }
    }

    public featureReset() {
        const feature = this.state.feature;
        if (feature) {
            feature.setFactor(1);
            this.setState({value: feature.getFactor()});
            this.props.population.applyPhysics();
        }
    }

    public render() {
        const feature = this.state.feature;
        const value = this.state.value;
        return (
            <div>
                <strong className="dice">&#x2680;&#x2681;&#x2682;&#x2683;&#x2684;&#x2685;</strong>
                {
                    this.props.population.physics.features.map(physicsFeature => {
                        return <button key={physicsFeature.feature} onClick={() => this.selectFeature(physicsFeature)}>
                            {physicsFeature.feature}
                        </button>;
                    })
                }
                {
                    !feature || !value ?
                        <span className="feature-prompt">choose one</span>
                        :
                        <span>
                            <span className="feature-prompt">{feature.feature}</span>
                            &nbsp;
                            &nbsp;
                            <button onClick={() => this.featureUp()}>+</button>
                            &nbsp;
                            <button onClick={() => this.featureDown()}>-</button>
                            &nbsp;&nbsp;&nbsp;
                            <strong className="feature-value">{value}</strong>
                            &nbsp;
                            <button onClick={() => this.featureReset()}>reset</button>
                        </span>
                }
            </div>
        );
    }
}

//
