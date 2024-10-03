import { SignalWatcher, joinAsync } from '@holochain-open-dev/signals';
import { EntryRecord } from '@holochain-open-dev/utils';
import { ActionHash } from '@holochain/client';
import { consume } from '@lit/context';
import { msg } from '@lit/localize';
import '@shoelace-style/shoelace/dist/components/spinner/spinner.js';
import { LitElement, css, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';

import { appStyles } from '../../../app-styles.js';
import { livingPowerStoreContext } from '../context.js';
import { LivingPowerStore } from '../living-power-store.js';
import { ExternalResistorValue, MeasurementCollection } from '../types.js';

@customElement('external-resistors-values')
export class ExternalResistorsValues extends SignalWatcher(LitElement) {
	@property()
	arduinoSerialNumber!: string;

	/**
	 * @internal
	 */
	@consume({ context: livingPowerStoreContext, subscribe: true })
	livingPowerStore!: LivingPowerStore;

	renderExternalResistorsValues(
		externalResistorsValues: Array<[ActionHash, ExternalResistorValue]>,
		measurements: Array<EntryRecord<MeasurementCollection>>,
	) {
		return html``;
	}

	allMeasurementsAndResistors() {
		const allMeasurements = this.livingPowerStore.bpvDevices
			.get(this.arduinoSerialNumber)
			.measurementCollections.live.get();
		const externalResistorsValues = this.livingPowerStore.bpvDevices
			.get(this.arduinoSerialNumber)
			.externalResistorValues.get();
		if (allMeasurements.status !== 'completed') return allMeasurements;

		const allMeasurementsEntries = joinAsync(
			Array.from(allMeasurements.value.values()).map(mc => mc.entry.get()),
		);
		if (allMeasurementsEntries.status !== 'completed')
			return allMeasurementsEntries;
		if (externalResistorsValues.status !== 'completed')
			return externalResistorsValues;

		return {
			status: 'completed' as const,
			value: {
				measurements: allMeasurementsEntries.value,
				externalResistors: externalResistorsValues.value,
			},
		};
	}

	render() {
		const result = this.allMeasurementsAndResistors();

		switch (result.status) {
			case 'pending':
				return html`<div
					style="display: flex; flex-direction: column; align-items: center; justify-content: center; flex: 1;"
				>
					<sl-spinner style="font-size: 2rem;"></sl-spinner>
				</div>`;
			case 'error':
				return html`<display-error
					.headline=${msg(
						'Error fetching the external resistors values for this BPV device.',
					)}
					.error=${result.error}
				></display-error>`;
			case 'completed':
				return this.renderExternalResistorsValues(
					result.value.externalResistors,
					result.value.measurements,
				);
		}
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
