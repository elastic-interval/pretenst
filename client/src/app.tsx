import * as React from 'react';
import './app.css';
import {EigView} from './eig/eig-view';
import {IFabric} from './fabric';

interface IAppProps {
    fabricFactory: () => Promise<IFabric>;
}

class App extends React.Component<IAppProps, any> {

    constructor(props: IAppProps) {
        super(props);
    }

    public render() {
        return (
            <div className="App">
                <EigView
                    width={window.innerWidth}
                    height={window.innerHeight}
                    fabricFactory={this.props.fabricFactory}
                />
                {/*<PatchView hello={this.state.hello}/>*/}
            </div>
        );
    }

}

export default App;
