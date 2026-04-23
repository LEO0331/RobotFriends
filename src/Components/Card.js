import React from 'react';

const Card = (props) => {
  const { name, email } = props;
  const initials = name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className='card'>
      <div className='avatar' aria-hidden='true'>{initials}</div>
      <div>
        <h2>{name}</h2>
        <p>{email}</p>
      </div>
    </div>
  );
};

export default Card;
