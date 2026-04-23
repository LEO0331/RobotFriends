import React from 'react';

const Card = (props) => {
  const { name, email, id, priority } = props;
  const initials = name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className='card'>
      <div className='avatar-wrap'>
        <div className='avatar' aria-hidden='true'>{initials}</div>
        <img
          alt={`Avatar for ${name}`}
          src={`https://robohash.org/${id}.png?size=200x200`}
          width='200'
          height='200'
          className='avatar-img'
          loading={priority ? 'eager' : 'lazy'}
          fetchPriority={priority ? 'high' : 'auto'}
          decoding='async'
          onError={(event) => {
            event.currentTarget.style.opacity = '0';
          }}
        />
      </div>
      <div>
        <h2>{name}</h2>
        <p>{email}</p>
      </div>
    </div>
  );
};

export default Card;
