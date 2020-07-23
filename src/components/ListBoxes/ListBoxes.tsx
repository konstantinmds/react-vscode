import * as React from 'react';
import ListBoxLeft from '../ListBox/ListBoxLeft';

const listBoxes: React.FC = (props) => {
   return (
       <div>
       <div style={{fontSize: 20, fontWeight: 900}}>
        <p>Project</p>
       </div>
       <div style={{display: 'flex', flexDirection: 'row', width:400, height: 1000}}>
           <ListBoxLeft/>
           <ListBoxLeft/>       
       </div>
       </div>
   )
    }
export default listBoxes;
