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

import ListBox from './components/ListBoxes/ListBox';

class App extends React.Component {
  public render() {
        return (
          <Container> 
            <Row> 
              <Col xs={12}>
              <Toolbar />
              </Col>
            </Row>
            <Row> 
              <Col xs={4}>
              <FormRun />
              <RunButtons/>
              </Col>
              <Col xs={8}>
              <TextInput/>
              <Col xs={4}>
              <ListBox/>
              <ListBox/>
              </Col> 
                   
              </Col>
            </Row>
              <Row>
                <Col>
                  <Tabs/>
                </Col>
              </Row>
          </Container>  
    );
  }
}

export default App;
