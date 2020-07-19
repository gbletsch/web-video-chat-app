import React from 'react';
import { BrowserRouter, Route, Switch } from 'react-router-dom'
import Room from './components/Room'
import CreateRoom from './components/CreateRoom'

import './style.css'

function App() {
  return (
    <BrowserRouter> 
      <Switch>
        <Route path='/' exact component={CreateRoom} />
        <Route path='/room/:roomID' component={Room} /> 
      </Switch>
    </BrowserRouter>
  );
}

export default App;
