import React, { Component } from 'react';
import Cardlist from '../Components/Cardlist';
import SearchBar from '../Components/SearchBar';
import './App.css';
import Scroll from '../Components/Scroll';
import ErrorBoundry from '../Components/ErrorBoundry';
class App extends Component {
  constructor() {
    super();
    this.state = {
      robots: [],
      searchfield: ''
    };
  }

  componentDidMount() {
    fetch('https://jsonplaceholder.typicode.com/users')
      .then((response) => response.json())
      .then((user) => this.setState({ robots: user }));
  }

  searchChange = (event) => {
    this.setState({ searchfield: event.target.value });
  };

  render() {
    const { robots, searchfield } = this.state;
    const filterRobots = robots.filter((robot) =>
      robot.name.toLowerCase().includes(searchfield.toLowerCase())
    );

    if (!robots.length) {
      return <h1 className='f2 tc'>Loading</h1>;
    }

    return (
      <div className='tc'>
        <h1 className='f2'>RobotFriends</h1>
        <SearchBar searchChange={this.searchChange} />
        <Scroll>
          <ErrorBoundry>
            <Cardlist robots={filterRobots} />
          </ErrorBoundry>
        </Scroll>
      </div>
    );
  }
}

export default App;
