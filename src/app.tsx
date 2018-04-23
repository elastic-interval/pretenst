import * as React from 'react';
import './app.css';

import logo from './logo.svg';
import TokenView from './token-view';

class App extends React.Component {
    public render() {
        return (
            <div className="App">
                <header className="App-header">
                    <img src={logo} className="App-logo" alt="logo"/>
                    <h1 className="App-title">Welcome to React</h1>
                </header>
                <p className="App-intro">
                    To get started, edit <code>src/App.tsx</code> and wow to reload.
                </p>
                <TokenView/>
            </div>
        );
    }
}

export default App;
