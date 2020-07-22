import * as React from 'react';
import {Form} from 'react-bootstrap';

const listBox: React.FC = (props) => {
   return (
    <Form.Group controlId="exampleForm.ControlSelect2">
    <Form.Label>Example multiple select</Form.Label>
    <Form.Control as="select" multiple>
      <option>1</option>
      <option>2</option>
      <option>3</option>
      <option>4</option>
      <option>5</option> 
    </Form.Control>
  </Form.Group>
   )
    }
export default listBox;
