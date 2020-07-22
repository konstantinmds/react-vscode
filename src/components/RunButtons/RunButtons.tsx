import * as React from 'react';
import {Button} from 'react-bootstrap';
import Aux from '../hoc/Aux'

export interface IAppProps {
}

const formButtons: React.FC = (props) => {
   return (
       <Aux>
          <Button variant="primary" size="lg" active>
            Primary button
         </Button>{' '}
            <Button variant="primary" size="lg" active>
            Secundary button
            </Button>{' '}
            <Button variant="primary" size="lg" active>
                Third button
            </Button>{' '}  
       </Aux>
   )
    }
export default formButtons;
