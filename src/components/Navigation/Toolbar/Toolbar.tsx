import React from 'react';
import { Navbar, Nav, NavDropdown } from 'react-bootstrap';
import  Logo from '../../Logo/Logo';
import Aux from '../../hoc/Aux';

const toolbar: React.FC = (props) =>{
    return( 
    <Navbar bg="light" expand="lg">
        <Navbar.Toggle aria-controls="basic-navbar-nav" />
        <Navbar.Collapse id="basic-navbar-nav">
        <Nav className="mr-auto">
        <Logo />
        <Nav.Link href="#home">Project</Nav.Link>
        <Nav.Link href="#link">Connection</Nav.Link>
        <NavDropdown title="Package" id="basic-nav-dropdown">
            <NavDropdown.Item href="#action/3.1">Add Data Flow Package</NavDropdown.Item>
            <NavDropdown.Item href="#action/3.2">Add Execute SQL Package</NavDropdown.Item>
            <NavDropdown.Item href="#action/3.3">Add Foreach Data Flow Package</NavDropdown.Item>
            <NavDropdown.Item href="#action/3.2">Add Execute Process Package</NavDropdown.Item>
            <NavDropdown.Item href="#action/3.2">Add Foreach Execute SQL Package</NavDropdown.Item>
        </NavDropdown>
        </Nav>
        </Navbar.Collapse>
        </Navbar>
    )
  };

export default toolbar;