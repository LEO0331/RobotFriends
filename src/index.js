import React from 'react';
import ReactDOM from 'react-dom';//react-dom in node_modules
import './index.css'; //./ --> in the same directory
//import Card from './Card';
import App from './Containers/App';//father of all child nodes; same layer, no need to leave, just enter the folder
//import Cardlist from './Cardlist';
import 'tachyons';//new package
import {robots} from './robots';//more than one export: {}
import reportWebVitals from './reportWebVitals';

ReactDOM.render(
	<App />,
 	document.getElementById('root')
);
/*
	ReactDOM.render(
		<div>
  			<Card id={robots[0].id} name={robots[0].name} email={robots[0].email}/>
  			<Card id={robots[1].id} name={robots[1].name} email={robots[1].email}/>
  			<Card id={robots[2].id} name={robots[2].name} email={robots[2].email}/>
  		</div>
 	document.getElementById('root')

-----------------------------------------------------------------------------------------

 	ReactDOM.render(
	<Cardlist robots={robots}/>,
 	document.getElementById('root')
);
);
*/
// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
