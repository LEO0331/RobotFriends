import React from 'react';
//style: js -->{} objective -->{}
//overflowY: css property (css: overflow-y, <tagname style="property:value;">)
const Scroll = (props) => {
	return (
		<div style={{overflowY: 'scroll', border: '1px solid black', height: '800px'}}>
			{props.children}
		</div>
	);
};

export default Scroll;