import * as React from 'react';
import {ChangeEvent, FormEvent} from 'react';

export interface IIdentityPanelProps {
    master?: string;
}

interface IIdentityPanelState {
    name: string;
}

export class IdentityPanel extends React.Component<IIdentityPanelProps, IIdentityPanelState> {

    constructor(props: IIdentityPanelProps) {
        super(props);
        this.handleNameChange = this.handleNameChange.bind(this);
        this.handleSubmitName = this.handleSubmitName.bind(this);
        this.state = {name: props.master ? props.master : ''};
    }

    public render() {
        return (
            <div>
                {this.content}
            </div>
        );
    }

    private get content() {
        if (this.props.master) {
            return (
                <strong>{this.props.master}</strong>
            );
        } else {
            return (
                <div>
                    <p>
                        You do not yet have a home gotch,
                        but once you have decided upon a name for your Galapagotchi,
                        you can choose one of the green spots as its new home.
                    </p>
                    <form onSubmit={this.handleSubmitName}>
                        <label>
                            <strong>Name:</strong>
                            <input type="text" value={this.state.name} onChange={this.handleNameChange}/>
                        </label>
                        <input type="submit" value="Choose this Gotch!"/>
                    </form>
                </div>
            );
        }
    }

    private handleNameChange(event: ChangeEvent<HTMLInputElement>) {
        console.log('name change', event);
        this.setState({name: event.target.value});
    }

    private handleSubmitName(event: FormEvent<HTMLFormElement>) {
        console.log('submit', event);
        event.preventDefault();
    }
}