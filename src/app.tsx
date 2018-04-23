import * as React from 'react';
import './app.css';

import TokenView from './token-view';

class App extends React.Component {
    public render() {
        return (
            <div className="App">
                <TokenView/>
            </div>
        );
    }
}

export default App;
