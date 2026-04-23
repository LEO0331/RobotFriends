import React from 'react';
const SearchBar = ({ searchChange }) => {
  return (
    <div className='pa2'>
      <label className='sr-only' htmlFor='robot-search'>Search robots</label>
      <input
        className='pa3 bg-light-blue ba b--green'
        id='robot-search'
        type='search'
        placeholder='search robots'
        aria-label='Search robots by name'
        onChange={searchChange}
      />
    </div>
  );
};

export default SearchBar;
