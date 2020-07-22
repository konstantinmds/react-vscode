import React from 'react';
import { Form, FormControl, FormGroup } from 'react-bootstrap';
import FormButtons from '../RunButtons/RunButtons'


const boldText: React.CSSProperties = {
  fontWeight: 'bold'
}


const formRun = () =>{
  return(
    <>
  <br/>
  <p>Run</p>
  <hr/>
    <Form.Group>  
  <div style={{display:'block'}}>
    <p>Project</p>
    <Form.Control as="select" size="sm">
      <option>Large select</option>
    </Form.Control>
  </div>
    <br />
  <div style={{display:'block'}}>
    <p>Environment</p>
    <Form.Control size="sm" as="select">
      <option>Small select</option>
    </Form.Control>
  </div>
    <br />
    <div style={{display:'block'}}>
    <p>Template Group</p>
    <Form.Control size="sm" as="select">
      <option>Small select</option>
    </Form.Control>
    </div>
  </Form.Group>
  </>
  )
  };

export default formRun;


