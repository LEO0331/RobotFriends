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
    const skeletonCards = Array.from({ length: 9 }, (_, index) => (
      <div key={`skeleton-${index}`} className='card card-skeleton' aria-hidden='true'>
        <div className='avatar avatar-skeleton' />
        <div className='text-skeleton title-skeleton' />
        <div className='text-skeleton line-skeleton' />
      </div>
    ));

    return (
      <div className='centered'>
        <h1 className='title'>RobotFriends</h1>
        <SearchBar searchChange={this.searchChange} />
        <Scroll>
          <ErrorBoundry>
            {robots.length ? <Cardlist robots={filterRobots} /> : <div>{skeletonCards}</div>}
          </ErrorBoundry>
        </Scroll>
      </div>
    );
  }
}

export default App;
