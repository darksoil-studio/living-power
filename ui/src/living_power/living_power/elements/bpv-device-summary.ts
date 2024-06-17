import { hashProperty } from '@holochain-open-dev/elements';
import '@holochain-open-dev/elements/dist/elements/display-error.js';
import { SignalWatcher } from '@holochain-open-dev/signals';
import { EntryRecord } from '@holochain-open-dev/utils';
import { ActionHash, EntryHash, Record } from '@holochain/client';
import { consume } from '@lit/context';
import { localized, msg } from '@lit/localize';
import '@shoelace-style/shoelace/dist/components/card/card.js';
import '@shoelace-style/shoelace/dist/components/spinner/spinner.js';
import { LitElement, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

import { appStyles } from '../../../app-styles.js';
import { livingPowerStoreContext } from '../context.js';
import { LivingPowerStore } from '../living-power-store.js';
import { BpvDevice } from '../types.js';

/**
 * @element bpv-device-summary
 * @fires bpv-device-selected: detail will contain { bpvDeviceHash }
 */
@localized()
@customElement('bpv-device-summary')
export class BpvDeviceSummary extends SignalWatcher(LitElement) {
	/**
	 * REQUIRED. The hash of the BpvDevice to show
	 */
	@property(hashProperty('bpv-device-hash'))
	bpvDeviceHash!: ActionHash;

	/**
	 * @internal
	 */
	@consume({ context: livingPowerStoreContext, subscribe: true })
	livingPowerStore!: LivingPowerStore;

	renderSummary(entryRecord: EntryRecord<BpvDevice>) {
		return html`
			<div class="column" style="gap: 16px;">
				<div class="column" style="gap: 8px">
					<span><strong>${msg('Name')}</strong></span>
					<span style="white-space: pre-line">${entryRecord.entry.name}</span>
				</div>
			</div>
		`;
	}

	renderBpvDevice() {
		const bpvDevice = this.livingPowerStore.bpvDevices
			.get(this.bpvDeviceHash)
			.latestVersion.get();

		switch (bpvDevice.status) {
			case 'pending':
				return html`<div
					style="display: flex; flex-direction: column; align-items: center; justify-content: center; flex: 1;"
				>
					<sl-spinner style="font-size: 2rem;"></sl-spinner>
				</div>`;
			case 'error':
				return html`<display-error
					.headline=${msg('Error fetching the bpv device')}
					.error=${bpvDevice.error}
				></display-error>`;
			case 'completed':
				return this.renderSummary(bpvDevice.value);
		}
	}

	render() {
		return html`<sl-card
			style="flex: 1; cursor: grab;"
			@click=${() =>
				this.dispatchEvent(
					new CustomEvent('bpv-device-selected', {
						composed: true,
						bubbles: true,
						detail: {
							bpvDeviceHash: this.bpvDeviceHash,
						},
					}),
				)}
		>
			${this.renderBpvDevice()}
		</sl-card>`;
	}

	static styles = appStyles;
}
