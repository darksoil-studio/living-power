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
import { MeasurementCollection } from '../types.js';

/**
 * @element measurement-collection-summary
 * @fires measurement-collection-selected: detail will contain { measurementCollectionHash }
 */
@localized()
@customElement('measurement-collection-summary')
export class MeasurementCollectionSummary extends SignalWatcher(LitElement) {
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

	renderSummary(entryRecord: EntryRecord<MeasurementCollection>) {
		return html`
			<div class="column" style="gap: 16px;">
				<div class="column" style="gap: 8px">
					<span><strong>${msg('External Resistor Ohms')}</strong></span>
					<span style="white-space: pre-line"
						>${entryRecord.entry.external_resistor_ohms}</span
					>
				</div>
			</div>
		`;
	}

	renderMeasurementCollection() {
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
				return this.renderSummary(measurementCollection.value);
		}
	}

	render() {
		return html`<sl-card
			style="flex: 1; cursor: grab;"
			@click=${() =>
				this.dispatchEvent(
					new CustomEvent('measurement-collection-selected', {
						composed: true,
						bubbles: true,
						detail: {
							measurementCollectionHash: this.measurementCollectionHash,
						},
					}),
				)}
		>
			${this.renderMeasurementCollection()}
		</sl-card>`;
	}

	static styles = appStyles;
}
