import React from 'react';
import Card from './Card';
const Cardlist = ({ robots }) => {
  const cardsArray = robots.map((user, index) => (
    <Card key={user.id} id={user.id} name={user.name} email={user.email} priority={index === 0} />
  ));

  return <div>{cardsArray}</div>;
};

export default Cardlist;
