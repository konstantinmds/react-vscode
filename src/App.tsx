import * as React from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';

import Toolbar from './components/Navigation/Toolbar/Toolbar';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import FormRun from './components/RunForm/RunForm';
import RunButtons from './components/RunButtons/RunButtons';
import Tabs from './components/Tabs/Tabs';
import TextInput from './components/TextInput/TextInput';

import ListBoxes from './components/ListBoxes/ListBoxes';

class App extends React.Component {
  public render() {
        return (
          <Container fluid> 
          <header><Toolbar /></header>
            <Row> 
              <Col xs={4}>
              <FormRun />
              <RunButtons/>
              <br/>
              <Tabs/>
              </Col>
              <Col xs={8}>
              <TextInput/>
              <Col xs={8}>
              <ListBoxes/>
              </Col>  
              </Col>       
            </Row>

          </Container>  
    );
  }
}

export default App;
