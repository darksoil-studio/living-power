import { Routes, wrapPathInSvg } from '@holochain-open-dev/elements';
import { SignalWatcher } from '@holochain-open-dev/signals';
import { consume } from '@lit/context';
import { msg } from '@lit/localize';
import { mdiArrowLeft } from '@mdi/js';
import { LitElement, css, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';

import { appStyles } from '../../../app-styles.js';
import { livingPowerStoreContext } from '../context.js';
import { LivingPowerStore } from '../living-power-store.js';
import './bpv-device-measurements.js';
import './external-resistors-values.js';

@customElement('bpv-device')
export class BpvDevice extends SignalWatcher(LitElement) {
	@property()
	arduinoSerialNumber!: string;

	/**
	 * @internal
	 */
	@consume({ context: livingPowerStoreContext, subscribe: true })
	@property()
	_livingPowerStore!: LivingPowerStore;

	routes = new Routes(this, [
		{
			path: '',
		},
		{
			path: 'external-resistors-values',
			render: params => {
				const info = this._livingPowerStore.bpvDevices
					.get(this.arduinoSerialNumber)
					.info.get();
				return html`
				<div class="column" style="position: fixed; width: 100vw; height: 100vh; top: 0; bottom: 0; right: 0; left: 0; z-index: 10; background-color: #ededed;">
					<div class="row top-bar" style="align-items: center; gap: 12px">
						<sl-icon-button
							style="color: white"
							.src=${wrapPathInSvg(mdiArrowLeft)}
							@click=${() => this.routes.goto('')}
						></sl-icon-button>
						<span class="title" style="color: white"
							>${msg(`External Resistors Values`)}
						</span>
						${
							info.status === 'completed'
								? html`<span class="title" style="color: white"
										>${msg(` for ${info.value?.name}`)}</span
									>`
								: html``
						}
						</span>
					</div>
					<external-resistors-values
						style="flex: 1; margin: 16px"
						.arduinoSerialNumber=${this.arduinoSerialNumber}
					></external-resistors-values>
				</div>
			`;
			},
		},
	]);

	render() {
		return html`
			<bpv-device-measurements
				style="flex: 1"
				.arduinoSerialNumber=${this.arduinoSerialNumber}
			></bpv-device-measurements>
			${this.routes.outlet()}
		`;
	}

	static styles = [
		...appStyles,
		css`
			:host {
				display: flex;
			}
		`,
	];
}
