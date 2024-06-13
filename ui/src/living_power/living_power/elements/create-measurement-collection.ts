import {
	hashProperty,
	hashState,
	notifyError,
	onSubmit,
	wrapPathInSvg,
} from '@holochain-open-dev/elements';
import '@holochain-open-dev/elements/dist/elements/display-error.js';
import { SignalWatcher } from '@holochain-open-dev/signals';
import { EntryRecord } from '@holochain-open-dev/utils';
import {
	ActionHash,
	AgentPubKey,
	DnaHash,
	EntryHash,
	Record,
} from '@holochain/client';
import { consume } from '@lit/context';
import { localized, msg } from '@lit/localize';
import { mdiAlertCircleOutline, mdiDelete } from '@mdi/js';
import SlAlert from '@shoelace-style/shoelace/dist/components/alert/alert.js';
import '@shoelace-style/shoelace/dist/components/alert/alert.js';
import '@shoelace-style/shoelace/dist/components/button/button.js';
import '@shoelace-style/shoelace/dist/components/card/card.js';
import '@shoelace-style/shoelace/dist/components/icon-button/icon-button.js';
import '@shoelace-style/shoelace/dist/components/icon/icon.js';
import '@shoelace-style/shoelace/dist/components/input/input.js';
import { LitElement, html } from 'lit';
import { customElement, property, query, state } from 'lit/decorators.js';
import { repeat } from 'lit/directives/repeat.js';

import { appStyles } from '../../../app-styles.js';
import { livingPowerStoreContext } from '../context.js';
import { LivingPowerStore } from '../living-power-store.js';
import { Measurement, MeasurementCollection } from '../types.js';

/**
 * @element create-measurement-collection
 * @fires measurement-collection-created: detail will contain { measurementCollectionHash }
 */
@localized()
@customElement('create-measurement-collection')
export class CreateMeasurementCollection extends SignalWatcher(LitElement) {
	/**
	 * REQUIRED. The bpv device hash for this MeasurementCollection
	 */
	@property(hashProperty('bpv-device-hash'))
	bpvDeviceHash!: ActionHash;

	/**
	 * REQUIRED. The measurements for this MeasurementCollection
	 */
	@property()
	measurements!: Array<Measurement>;

	/**
	 * @internal
	 */
	@consume({ context: livingPowerStoreContext, subscribe: true })
	livingPowerStore!: LivingPowerStore;

	/**
	 * @internal
	 */
	@state()
	committing = false;

	/**
	 * @internal
	 */
	@query('#create-form')
	form!: HTMLFormElement;

	async createMeasurementCollection(fields: Partial<MeasurementCollection>) {
		if (this.bpvDeviceHash === undefined)
			throw new Error(
				'Cannot create a new Measurement Collection without its bpv_device_hash field',
			);
		if (this.measurements === undefined)
			throw new Error(
				'Cannot create a new Measurement Collection without its measurements field',
			);

		const measurementCollection: MeasurementCollection = {
			bpv_device_hash: this.bpvDeviceHash!,
			measurements: this.measurements!,
			external_resistor_ohms: fields.external_resistor_ohms!,
		};

		try {
			this.committing = true;
			const record: EntryRecord<MeasurementCollection> =
				await this.livingPowerStore.client.createMeasurementCollection(
					measurementCollection,
				);

			this.dispatchEvent(
				new CustomEvent('measurement-collection-created', {
					composed: true,
					bubbles: true,
					detail: {
						measurementCollectionHash: record.actionHash,
					},
				}),
			);

			this.form.reset();
		} catch (e: unknown) {
			console.error(e);
			notifyError(msg('Error creating the measurement collection'));
		}
		this.committing = false;
	}

	render() {
		return html` <sl-card style="flex: 1;">
			<span slot="header">${msg('Create Measurement Collection')}</span>

			<form
				id="create-form"
				class="column"
				style="flex: 1; gap: 16px;"
				${onSubmit(fields => this.createMeasurementCollection(fields))}
			>
				<div>
					<sl-input
						type="number"
						name="external_resistor_ohms"
						.label=${msg('External Resistor Ohms')}
						required
					></sl-input>
				</div>

				<sl-button variant="primary" type="submit" .loading=${this.committing}
					>${msg('Create Measurement Collection')}</sl-button
				>
			</form>
		</sl-card>`;
	}

	static styles = appStyles;
}
