import React from 'react';
import eltLogo from '../../assets/images/eltSnap_whiteTransparent.png';
import { Navbar } from 'react-bootstrap';


const logo :React.FC = (props) =>{
    return<Navbar.Brand href="#home">
    <img
      src={eltLogo}
      width="100%"
      height="100%"
      className="d-inline-block align-top"
      alt="snap"
    />
  </Navbar.Brand>
  };

export default logo;