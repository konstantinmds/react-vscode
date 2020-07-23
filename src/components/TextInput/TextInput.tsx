import * as React from 'react';
import {Form} from 'react-bootstrap';

const textInput: React.FC = (props) => {
    return (
      
    <Form>
        <Form.Group controlId="exampleForm.ControlTextarea1">
        <Form.Label style={{fontSize:10}}>Progress</Form.Label>
        <Form.Control as="textarea" rows={Number('3')} />
      </Form.Group>
    </Form>          )
     }
 export default textInput;
 


