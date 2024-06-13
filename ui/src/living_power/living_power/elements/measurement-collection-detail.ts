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
import { MeasurementCollection } from '../types.js';

/**
 * @element measurement-collection-detail
 * @fires measurement-collection-deleted: detail will contain { measurementCollectionHash }
 */
@localized()
@customElement('measurement-collection-detail')
export class MeasurementCollectionDetail extends SignalWatcher(LitElement) {
	/**
	 * REQUIRED. The hash of the MeasurementCollection to show
	 */
	@property(hashProperty('measurement-collection-hash'))
	measurementCollectionHash!: ActionHash;

	/**
	 * @internal
	 */
	@consume({ context: livingPowerStoreContext, subscribe: true })
	livingPowerStore!: LivingPowerStore;

	async deleteMeasurementCollection() {
		try {
			await this.livingPowerStore.client.deleteMeasurementCollection(
				this.measurementCollectionHash,
			);

			this.dispatchEvent(
				new CustomEvent('measurement-collection-deleted', {
					bubbles: true,
					composed: true,
					detail: {
						measurementCollectionHash: this.measurementCollectionHash,
					},
				}),
			);
		} catch (e: unknown) {
			console.error(e);
			notifyError(msg('Error deleting the measurement collection'));
		}
	}

	renderDetail(entryRecord: EntryRecord<MeasurementCollection>) {
		return html`
			<sl-card>
				<div slot="header" class="row" style="gap: 8px">
					<span style="font-size: 18px; flex: 1;"
						>${msg('Measurement Collection')}</span
					>

					<sl-icon-button
						.src=${wrapPathInSvg(mdiDelete)}
						@click=${() => this.deleteMeasurementCollection()}
					></sl-icon-button>
				</div>

				<div class="column" style="gap: 16px;">
					<div class="column" style="gap: 8px;">
						<span><strong>${msg('External Resistor Ohms')}</strong></span>
						<span style="white-space: pre-line"
							>${entryRecord.entry.external_resistor_ohms}</span
						>
					</div>
				</div>
			</sl-card>
		`;
	}

	render() {
		const measurementCollection = this.livingPowerStore.measurementCollections
			.get(this.measurementCollectionHash)
			.entry.get();

		switch (measurementCollection.status) {
			case 'pending':
				return html`<div
					style="display: flex; flex-direction: column; align-items: center; justify-content: center; flex: 1;"
				>
					<sl-spinner style="font-size: 2rem;"></sl-spinner>
				</div>`;
			case 'error':
				return html`<display-error
					.headline=${msg('Error fetching the measurement collection')}
					.error=${measurementCollection.error}
				></display-error>`;
			case 'completed':
				return this.renderDetail(measurementCollection.value);
		}
	}

	static styles = appStyles;
}
