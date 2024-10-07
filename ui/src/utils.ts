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
