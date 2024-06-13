import { hashProperty, wrapPathInSvg } from '@holochain-open-dev/elements';
import '@holochain-open-dev/elements/dist/elements/display-error.js';
import { AsyncComputed, SignalWatcher } from '@holochain-open-dev/signals';
import { EntryRecord, slice } from '@holochain-open-dev/utils';
import { ActionHash, AgentPubKey, EntryHash, Record } from '@holochain/client';
import { consume } from '@lit/context';
import { localized, msg } from '@lit/localize';
import { mdiInformationOutline } from '@mdi/js';
import '@shoelace-style/shoelace/dist/components/icon/icon.js';
import '@shoelace-style/shoelace/dist/components/spinner/spinner.js';
import { LitElement, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

import { appStyles } from '../../../app-styles.js';
import { livingPowerStoreContext } from '../context.js';
import { LivingPowerStore } from '../living-power-store.js';
import { MeasurementCollection } from '../types.js';
import './measurement-collection-summary.js';

/**
 * @element measurement-collections-for-bpv-device
 */
@localized()
@customElement('measurement-collections-for-bpv-device')
export class MeasurementCollectionsForBpvDevice extends SignalWatcher(
	LitElement,
) {
	/**
	 * REQUIRED. The BpvDeviceHash for which the MeasurementCollections should be fetched
	 */
	@property(hashProperty('bpv-device-hash'))
	bpvDeviceHash!: ActionHash;

	/**
	 * @internal
	 */
	@consume({ context: livingPowerStoreContext, subscribe: true })
	livingPowerStore!: LivingPowerStore;

	renderList(hashes: Array<ActionHash>) {
		if (hashes.length === 0)
			return html` <div class="column center-content" style="gap: 16px;">
				<sl-icon
					style="color: grey; height: 64px; width: 64px;"
					.src=${wrapPathInSvg(mdiInformationOutline)}
				></sl-icon>
				<span class="placeholder"
					>${msg('No measurement collections found for this bpv device')}</span
				>
			</div>`;

		return html`
			<div style="display: flex; flex-direction: column">
				${hashes.map(
					hash =>
						html`<measurement-collection-summary
							.measurementCollectionHash=${hash}
						></measurement-collection-summary>`,
				)}
			</div>
		`;
	}

	render() {
		const map = this.livingPowerStore.bpvDevices
			.get(this.bpvDeviceHash)
			.measurementCollections.live.get();

		switch (map.status) {
			case 'pending':
				return html`<div
					style="display: flex; flex-direction: column; align-items: center; justify-content: center; flex: 1;"
				>
					<sl-spinner style="font-size: 2rem;"></sl-spinner>
				</div>`;
			case 'error':
				return html`<display-error
					.headline=${msg('Error fetching the measurement collections')}
					.error=${map.error}
				></display-error>`;
			case 'completed':
				return this.renderList(Array.from(map.value.keys()));
		}
	}

	static styles = appStyles;
}
