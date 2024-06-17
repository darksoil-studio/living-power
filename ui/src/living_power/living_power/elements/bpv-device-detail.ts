import {
	hashProperty,
	notifyError,
	wrapPathInSvg,
} from '@holochain-open-dev/elements';
import '@holochain-open-dev/elements/dist/elements/display-error.js';
import { SignalWatcher } from '@holochain-open-dev/signals';
import { EntryRecord } from '@holochain-open-dev/utils';
import { ActionHash, EntryHash, Record } from '@holochain/client';
import { consume } from '@lit/context';
import { localized, msg } from '@lit/localize';
import { mdiAlertCircleOutline, mdiDelete, mdiPencil } from '@mdi/js';
import SlAlert from '@shoelace-style/shoelace/dist/components/alert/alert.js';
import '@shoelace-style/shoelace/dist/components/alert/alert.js';
import '@shoelace-style/shoelace/dist/components/button/button.js';
import '@shoelace-style/shoelace/dist/components/card/card.js';
import '@shoelace-style/shoelace/dist/components/icon-button/icon-button.js';
import '@shoelace-style/shoelace/dist/components/spinner/spinner.js';
import { LitElement, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

import { appStyles } from '../../../app-styles.js';
import { livingPowerStoreContext } from '../context.js';
import { LivingPowerStore } from '../living-power-store.js';
import { BpvDevice } from '../types.js';
import './edit-bpv-device.js';

/**
 * @element bpv-device-detail
 * @fires bpv-device-deleted: detail will contain { bpvDeviceHash }
 */
@localized()
@customElement('bpv-device-detail')
export class BpvDeviceDetail extends SignalWatcher(LitElement) {
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

	/**
	 * @internal
	 */
	@state()
	_editing = false;

	async deleteBpvDevice() {
		try {
			await this.livingPowerStore.client.deleteBpvDevice(this.bpvDeviceHash);

			this.dispatchEvent(
				new CustomEvent('bpv-device-deleted', {
					bubbles: true,
					composed: true,
					detail: {
						bpvDeviceHash: this.bpvDeviceHash,
					},
				}),
			);
		} catch (e: unknown) {
			console.error(e);
			notifyError(msg('Error deleting the bpv device'));
		}
	}

	renderDetail(entryRecord: EntryRecord<BpvDevice>) {
		return html`
			<sl-card>
				<div slot="header" class="row" style="gap: 8px">
					<span style="font-size: 18px; flex: 1;">${msg('Bpv Device')}</span>

					<sl-icon-button
						.src=${wrapPathInSvg(mdiPencil)}
						@click=${() => {
							this._editing = true;
						}}
					></sl-icon-button>
					<sl-icon-button
						.src=${wrapPathInSvg(mdiDelete)}
						@click=${() => this.deleteBpvDevice()}
					></sl-icon-button>
				</div>

				<div class="column" style="gap: 16px;">
					<div class="column" style="gap: 8px;">
						<span><strong>${msg('Name')}</strong></span>
						<span style="white-space: pre-line">${entryRecord.entry.name}</span>
					</div>
				</div>
			</sl-card>
		`;
	}

	render() {
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
				if (this._editing) {
					return html`<edit-bpv-device
						.bpvDeviceHash=${this.bpvDeviceHash}
						@bpv-device-updated=${async () => {
							this._editing = false;
						}}
						@edit-canceled=${() => {
							this._editing = false;
						}}
						style="display: flex; flex: 1;"
					></edit-bpv-device>`;
				}

				return this.renderDetail(bpvDevice.value);
		}
	}

	static styles = appStyles;
}
