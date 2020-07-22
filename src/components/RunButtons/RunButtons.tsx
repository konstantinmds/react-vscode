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
       <div className="to">
           <style>{sty}</style>
           <ButtonGroup aria-label="Basic example">
                <Button variant="secondary">Run</Button>
                <Button variant="secondary">Runtime Command</Button>
                <Button variant="secondary">Right</Button>
           </ButtonGroup>       
           <br/>
           <br/>
           </div>
   )
    }
export default formButtons;
