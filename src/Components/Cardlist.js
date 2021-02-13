import React from 'react';
import Card from './Card';
//key: better not change, use unique element such as id
//Create Cardlist as the parent of Card, iterate all cards listed in card.js
const Cardlist = ({robots}) => {
	const cardsArray = robots.map((user, index) => {
		return (<Card key={index} id={robots[index].id} name={robots[index].name} email={robots[index].email} />);
		//return <Card key={index} id={user.id} name={user.name} email={user.email}/>user表robots的每個element
	})
	return (
		<div>
  			{cardsArray}
  		</div>
  	);
} 

/*
const Cardlist = ({robots}) => {
	})
	return (
		<div>
			{
  				robots.map((user, index) => {
				return (<Card key={index} id={robots[index].id} name={robots[index].name} email={robots[index].email} />);
				//return <Card key={index} id={user.id} name={user.name} email={user.email}/>user表robots的每個element
  			}
  		</div>
  	);
} 
*/

export default Cardlist;