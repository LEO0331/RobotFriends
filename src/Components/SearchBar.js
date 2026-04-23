import React from 'react';
const SearchBar = ({ searchChange }) => {
  return (
    <div className='search-wrap'>
      <label className='sr-only' htmlFor='robot-search'>Search robots</label>
      <input
        className='search-input'
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
