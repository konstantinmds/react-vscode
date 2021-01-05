import * as React from 'react';
import {Form} from 'react-bootstrap';

const listBoxLeft: React.FC = (props) => {
   return (
     <div>
    <Form.Group controlId="exampleForm.ControlSelect2">
    <Form.Control as="select" multiple style={{width:400, height:500}}>
      <option>1</option>
      <option>2</option>
      <option>3</option>
      <option>4</option>
      <option>5</option> 
      <option>1</option>
      <option>2</option>
      <option>3</option>
      <option>4</option>
      <option>5</option> 
      <option>1</option>
      <option>2</option>
      <option>3</option>
      <option>4</option>
      <option>5</option> 
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
export default listBoxLeft;
