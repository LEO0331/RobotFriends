import React from 'react';//jsx
//?200x200: height weight
//props: properties listed in index.js under card tag
//syntax: {}; SCSS: <img/> / is a MUST, use a relative path: https://stackoverflow.com/questions/45445139/webpack-3-image-src-issue-for-react-html-loader-transform-react-jsx-img-impo
/*
const Card = (props) => {
	return(
		<div className='tc bg-light-green dib br3 pa3 ma2 grow bw2 shadow-5'> 用``不是''
			<img alt='robots' src={`https://robohash.org/${props.id}?200x200`} />
			<div>
				<h2>{props.name}</h2>
				<p>{props.email}</p>
			</div>
		</div>
	)
}
OR 
const Card = ({name, email, id}) => {} //destructuring
Rendering child elements in React using Fragments: 
https://blog.logrocket.com/rendering-child-elements-react-fragments/
*/

const Card = (props) => {
	const {name, email, id} = props;
	return(
		<div className='tc bg-light-green dib br3 pa3 ma2 grow bw2 shadow-5'>
			<img alt='robots' src={`https://robohash.org/${id}?200x200`} />
			<div>
				<h2>{name}</h2>
				<p>{email}</p>
			</div>
		</div>
	)
}

export default Card;