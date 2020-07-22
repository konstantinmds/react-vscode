import * as React from 'react';
import {Tab, Row, Col, Nav} from 'react-bootstrap';

const tabs: React.FC = (props) => {
    return (
        <Tab.Container id="left-tabs-example" defaultActiveKey="first">
        <Row>
            <Col sm={3}>
            <Nav variant="pills" className="flex-column">
                <Nav.Item>
                <Nav.Link eventKey="first">Packages</Nav.Link>
                </Nav.Item>
                <Nav.Item>
                <Nav.Link eventKey="second">Connections</Nav.Link>
                </Nav.Item>
                <Nav.Item>
                <Nav.Link eventKey="third">Parameters</Nav.Link>
                </Nav.Item>
                <Nav.Item>
                <Nav.Link eventKey="forth">Environments</Nav.Link>
                </Nav.Item>

            </Nav>
            </Col>
            <Col sm={9}>
            <Tab.Content>
                <Tab.Pane eventKey="first">
                </Tab.Pane>
                <Tab.Pane eventKey="second">
                </Tab.Pane>
                <Tab.Pane eventKey="third">
                </Tab.Pane>
                <Tab.Pane eventKey="fourth">
                </Tab.Pane>

            </Tab.Content>
            </Col>
        </Row>
        </Tab.Container>  
          )
     }
 export default tabs;
 


