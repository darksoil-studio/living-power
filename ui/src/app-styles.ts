import { sharedStyles } from '@holochain-open-dev/elements';
import { css } from 'lit';

export const appStyles = [
	sharedStyles,
	css`
		.top-bar {
			align-items: center;
			background-color: var(--sl-color-primary-600);
			padding: 16px;
			box-shadow: 0 2px 4px 0 rgba(0, 0, 0, 0.2);
		}
	`,
];
