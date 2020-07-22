import React from 'react';
import { Form, FormControl, FormGroup } from 'react-bootstrap';
import FormButtons from '../RunButtons/RunButtons'

const formRun = () =>{
  return(
    <>
    <Form.Group>  
    <Form.Control as="select" size="sm">
      <option>Large select</option>
    </Form.Control>
    <br />
    <Form.Control size="sm" as="select">
      <option>Small select</option>
    </Form.Control>
    <br />
    <Form.Control size="sm" as="select">
      <option>Small select</option>
    </Form.Control>
  </Form.Group>
  </>
  )
  };

export default formRun;


