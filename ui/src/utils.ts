import { TemplateResult, render } from 'lit';

import { HolochainApp } from './holochain-app.js';

export function showDialog(dialog: TemplateResult) {
	const container = document.querySelector('holochain-app') as HolochainApp;
	const div = document.createElement('div');
	div.addEventListener('sl-close', () => {
		container.removeChild(div);
	});
	render(dialog, div);
	container.appendChild(div);
}
export function getISOLocalString(date: Date) {
	// let tzo = -date.getTimezoneOffset();

	// if (tzo === 0) {
	// 	return date.toISOString();
	// } else {
	let pad = function (num: number, digits = 2) {
		return String(num).padStart(digits, '0');
	};

	// const hoursOffset = Math.floor(tzo / 60);
	// const minsOffset = tzo % 60;

	// console.log(hoursOffset);
	// console.log(minsOffset);
	// console.log(tzo);

	return (
		date.getFullYear() +
		'-' +
		pad(date.getMonth() + 1) +
		'-' +
		pad(date.getDate()) +
		'T' +
		pad(date.getHours()) +
		':' +
		pad(date.getMinutes()) +
		':' +
		pad(date.getSeconds()) +
		'.' +
		pad(date.getMilliseconds(), 3)
	);
	// }
}
