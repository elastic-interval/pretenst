import * as React from 'react';
import Button from 'reactstrap/lib/Button';

export interface IInfoPanelProps {
    exit: () => void;
}

export class InfoPanel extends React.Component<IInfoPanelProps, any> {

    constructor(props: IInfoPanelProps) {
        super(props);
    }

    public render() {
        return (
            <div>
                <h1>Info</h1>
                <Button color="success" onClick={() => this.props.exit()}>Ok got it</Button>
            </div>
        );
    }


}