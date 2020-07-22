import * as React from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';

import Toolbar from './components/Navigation/Toolbar/Toolbar';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import FormRun from './components/RunForm/RunForm';
import RunButtons from './components/RunButtons/RunButtons';

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
              <Col xs={3}>
              <FormRun />
              <RunButtons/>
              </Col>
            </Row>

          </Container>  

    );
  }
}

export default App;
