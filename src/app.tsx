import * as React from 'react';
import './app.css';

import PatchView from './patch-view';

class App extends React.Component {
    public render() {
        return (
            <div className="App">
                <PatchView/>
            </div>
        );
    }
}

export default App;
