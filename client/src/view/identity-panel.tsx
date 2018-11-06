import * as React from 'react';
import {ChangeEvent, FormEvent} from 'react';
import {BehaviorSubject} from 'rxjs/BehaviorSubject';
import {Spot} from '../island/spot';
import {Subscription} from 'rxjs/Subscription';
import {AppStorage} from '../app-storage';
import {Island} from '../island/island';

export interface IIdentityPanelProps {
    storage: AppStorage;
    island: Island;
    selectedSpot: BehaviorSubject<Spot | undefined>;
    master?: string;
}

interface IIdentityPanelState {
    islandMasters: string[];
    selectedSpot?: Spot;
    name: string;
    error?: string;
}

export class IdentityPanel extends React.Component<IIdentityPanelProps, IIdentityPanelState> {
    private subs: Subscription[] = [];

    constructor(props: IIdentityPanelProps) {
        super(props);
        this.handleNameChange = this.handleNameChange.bind(this);
        this.handleSubmitName = this.handleSubmitName.bind(this);
        this.state = {
            name: props.master ? props.master : '',
            islandMasters: props.island.gotches.map(gotch => {
                const genome = props.storage.getGenome(gotch);
                return genome? genome.master : '';
            }).filter(master => master.length > 0)
        };
    }

    public componentDidMount() {
        this.subs.push(this.props.selectedSpot.subscribe(selectedSpot => this.setState({selectedSpot})));
    }

    public componentWillUnmount() {
        this.subs.forEach(s => s.unsubscribe());
    }

    public render() {
        if (this.props.master) {
            return (
                <div>
                    <strong>{this.props.master}</strong>
                </div>
            );
        } else {
            // const gotch = this.state.selectedSpot ? this.state.selectedSpot.centerOfGotch : null;
            const candidate = this.state.selectedSpot ? this.state.selectedSpot.canBeNewGotch : false;
            return (
                <div>
                    <p>
                        You do not yet have a home gotch,
                        but once you have decided upon a name for your Galapagotchi,
                        you can choose one of the green spots as its new home.
                    </p>
                    <form onSubmit={this.handleSubmitName}>
                        <label>
                            <strong>{candidate ? 'candidate':'your'} Name:</strong>
                            <input type="text" value={this.state.name} onChange={this.handleNameChange}/><strong>{this.state.error}</strong>
                        </label>
                        <input type="submit" disabled={!candidate} value="Choose this Gotch!"/>
                    </form>
                </div>
            );
        }
    }

    private handleNameChange(event: ChangeEvent<HTMLInputElement>) {
        const name = event.target.value;
        if (this.state.islandMasters.find(master => master === name)) {
            const error = 'Name exists!';
            this.setState({name, error});
        } else {
            this.setState({name, error: undefined});
        }
    }

    private handleSubmitName(event: FormEvent<HTMLFormElement>) {
        console.log('submit', event);
        event.preventDefault();
    }
}