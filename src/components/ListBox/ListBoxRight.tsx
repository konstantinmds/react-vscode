import * as React from 'react';
import {Form} from 'react-bootstrap';

const listBoxRight: React.FC = (props) => {
   return (
     <div>
    <Form.Group controlId="exampleForm.ControlSelect2" style={{width:400, height:800}}>
    <Form.Control as="select" multiple>
      <option>1</option>
      <option>2</option>
      <option>3</option>
      <option>4</option>
      <option>5</option> 
    </Form.Control>
  </Form.Group>
     </div>
   )
    }
export default listBoxRight;
