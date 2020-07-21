import * as React from 'react';
import './App.css';
import 'bootstrap/dist/css/bootstrap.min.css';

import { Navbar, Nav, NavDropdown } from 'react-bootstrap';
import Toolbar from './components/Navigation/Toolbar/Toolbar';


class App extends React.Component {
  public render() {
        return (
          <Toolbar />
    );
  }
}

export default App;
