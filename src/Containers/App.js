import React, {Component} from 'react';
import Cardlist from '../Components/Cardlist';//first dot: leave the current folder, second dot: enter the folder
//import {robots} from './robots'; fetch robot data ONLINE
import SearchBar from '../Components/SearchBar';
import './App.css';
import Scroll from '../Components/Scroll';
import ErrorBoundry from '../Components/ErrorBoundry';
//state: Object, discribe application, able to change VS props: things come out of state 
//className attribute: 指定一個 CSS class
/*
	const state = {
		robots: robots, //from robots.js
		searchField: ''
	}
	constructor(){
		super() //represent element in React.Component
		this.state = state;//state is self-build
	}
	OR No definition of const state -->
	constructor(props){//inbuild method in React.Component, NO need to use () => {}
		super(props);
		this.state = {
			robots: props.robots,
		};
	}

	searchChange(event){//in class, must be method, no need "function" name(){}
		console.log(event);//the value of the search
	}
	
	searchChange(event){
		console.log(event.target.value);//return the value of the search u type/term
	}
	ALWAYS use searchChange = event => {} to create method so that 'this' will always refer to the App.js not the Callback function in the child e.g. SearchBar.js
	searchChange = (event) => {
		const filterRobots = this.state.robots.filter((robot) => {//find elements in robots.js
			return robot.name.toLowerCase().includes(this.state.searchfield.toLowerCase();) //return robot name that match to the searchfield
		});
	}
	setState(): inbuild function to set the value of state(property in constructor)
*/

class App extends Component{//Classes Are Functions:https://www.digitalocean.com/community/tutorials/understanding-classes-in-javascript
	constructor(){
		super();
		this.state = {
			robots: [],
			searchfield: ''
		}
	}
	//https://reactjs.org/docs/react-component.html
	componentDidMount(){//set up any subscriptions; unsubscribe in componentWillUnmount()
		fetch('https://jsonplaceholder.typicode.com/users')//{JSON} Placeholder: fake API for testing
			.then(response => response.json())//http request, get response, then transform the response to json
			.then(user => this.setState({robots: user}));//trigger an extra rendering before the browser updates the screen: cons -> rend -> comp -> rend
	}
	//不能在render裡面使用setState，不在render()中修改state或是和瀏覽器互動
	searchChange = (event) => {//self defined method
		this.setState({searchfield: event.target.value});//update searchfield when we type
	}
	render(){//inbuild method in React.Component
		const {robots, searchfield} = this.state;
		const filterRobots = robots.filter((robot) => {
			return robot.name.toLowerCase().includes(searchfield.toLowerCase())
		})
		if(!robots.length){
			return <h1 className='f2 tc'>Loading</h1>
		} else{
			return (
			<div className='tc'>
				<h1 className='f2'>RobotsFriends</h1>
				<SearchBar searchChange={this.searchChange}/>
				<Scroll>
					<ErrorBoundry>
						<Cardlist robots={filterRobots}/> 
					</ErrorBoundry>
				</Scroll>
			</div>
			);
		}
	}
}

export default App;

/*HOOK: convert Class into functional Component
import {useSTATE, useEffect} from 'react';

function App() {
	//name, change, initial value
	const [robots, setRobots] = useState([])
	const [searchfield, setSearchfield] = useState('')
	const [count, setCount] = useState(0)

	useEffect(() => {//if no second param, looping
		fetch('https://jsonplaceholder.typicode.com/users')
			.then(response => response.json()) 
			.then(user => setRobots(user));
	},[])
	//second param: only run when things(e.g. searchfield) change --> [searchfield]; []: shortcut for componentDidMount()
	//[count]: counter, only run if count changes
	const searchChange = (event) => {
		setSearchfield(event.target.value);
	}
	
	//const setCount = () => {setCount(count+1);}
	
	const filterRobots = robots.filter((robot) => {
			return robot.name.toLowerCase().includes(searchfield.toLowerCase())
		})
		if(!robots.length){
			return <h1 className='f2 tc'>Loading</h1>
		} else{
			return (
			<div className='tc'>
				<h1 className='f2'>RobotsFriends</h1>
				<button onClick={() => setCount(count+1)}>CLICK!!!</button>
				<SearchBar searchChange={searchChange}/>
				<Scroll>
					<ErrorBoundry>
						<Cardlist robots={filterRobots}/> 
					</ErrorBoundry>
				</Scroll>
			</div>
			);
		}
	}
}
export default App;
}
*/
