import * as React from 'react'
import {ChangeEvent, FormEvent} from 'react'
import {BehaviorSubject} from 'rxjs/BehaviorSubject'

import {AppStorage} from '../app-storage'
import {Island} from '../island/island'
import {Spot} from '../island/spot'

export interface IIdentityPanelProps {
    storage: AppStorage
    island: Island
    selectedSpot: BehaviorSubject<Spot | undefined>
    master?: string
}

interface IIdentityPanelState {
    islandMasters: string[]
    name: string
    error?: string
}

export class IdentityPanel extends React.Component<IIdentityPanelProps, IIdentityPanelState> {
    constructor(props: IIdentityPanelProps) {
        super(props)
        this.handleNameChange = this.handleNameChange.bind(this)
        this.handleSubmitName = this.handleSubmitName.bind(this)
        this.state = {
            name: props.master ? props.master : '',
            islandMasters: props.island.hexalots.map(hexalot => {
                const genome = props.storage.getGenome(hexalot)
                return genome? genome.master : ''
            }).filter(master => master.length > 0),
        }
    }

    public render() {
        if (this.props.master) {
            return (
                <div>
                    <strong>{this.props.master}</strong>
                </div>
            )
        } else {
            const candidate = false
            return (
                <div>
                    <p>
                        You do not yet have a home hexalot,
                        but once you have decided upon a name for your Galapagotchi,
                        you can choose one of the green spots as its new home.
                    </p>
                    <form onSubmit={this.handleSubmitName}>
                        <label>
                            <strong>Name:</strong>
                            <input type="text" value={this.state.name} onChange={this.handleNameChange}/><strong>{this.state.error}</strong>
                        </label>
                        <input type="submit" disabled={!candidate} value="Choose this Hexalot!"/>
                    </form>
                </div>
            )
        }
    }

    private handleNameChange(event: ChangeEvent<HTMLInputElement>) {
        const name = event.target.value
        if (this.state.islandMasters.find(master => master === name)) {
            const error = 'Name exists!'
            this.setState({name, error})
        } else {
            this.setState({name, error: undefined})
        }
    }

    private handleSubmitName(event: FormEvent<HTMLFormElement>) {
        console.log('submit', event)
        event.preventDefault()
    }
}
