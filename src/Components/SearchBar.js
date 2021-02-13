import React from 'react';
//placeholder:specify a short hint describing the expected value of an input field, displayed before the user enters a value
//type='search':defines a text field for entering a search string
//set a name for the search field: <label for="gsearch">Search Google:</label> OR sebsite search
//{} need to be added in React
//onChange Event = function; occured when checked state has changed: 每當表格欄位值改變，這個 event 跟著發生
const SearchBar = ({searchChange}) => {
  return(
    <div className='pa2'>
      <input className='pa3 bg-light-blue ba b--green' 
      type='search' 
      placeholder='search robots' 
      onChange={searchChange}/>
    </div>
  );
}

export default SearchBar;
