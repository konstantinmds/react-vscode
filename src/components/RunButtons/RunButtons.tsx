import * as React from 'react';
import {ButtonGroup, Button} from 'react-bootstrap';

const sty = `.to{
    display: 'block',
    float: 'left',
    height: '50px';
    width: '100px';
    margin-right: '5px';
    text-align: 'center';
    line-height: '50px';
    text-decoration: 'none';
}
`

const formButtons: React.FC = (props) => {
   return (
       <div style={{margin: 5, padding: 3}}>
            <Button variant="secondary" style={{backgroundColor: 'blue', color: 'white', margin: 5}}>Schedule</Button>
            <Button variant="secondary" style={{backgroundColor: 'blue', color: 'white', margin: 5}}>Runtime Command</Button>
            <Button variant="primary" style={{backgroundColor: 'green', color: 'white'}}>Run</Button>
           <br/>
           <br/>
           </div>
   )
    }
export default formButtons;
