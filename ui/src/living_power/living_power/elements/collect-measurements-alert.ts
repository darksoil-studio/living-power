import { notifyError, wrapPathInSvg } from '@holochain-open-dev/elements';
import {
	AsyncResult,
	SignalWatcher,
	joinAsync,
	toPromise,
} from '@holochain-open-dev/signals';
import { EntryRecord, HoloHashMap } from '@holochain-open-dev/utils';
import { ActionHash, encodeHashToBase64 } from '@holochain/client';
import { consume } from '@lit/context';
import { msg } from '@lit/localize';
import {
	mdiDatabaseArrowUpOutline,
	mdiInformationOffOutline,
	mdiInformationOutline,
	mdiSync,
} from '@mdi/js';
import { SlDialog, SlInput } from '@shoelace-style/shoelace';
import '@shoelace-style/shoelace/dist/components/alert/alert.js';
import '@shoelace-style/shoelace/dist/components/button/button.js';
import '@shoelace-style/shoelace/dist/components/dialog/dialog.js';
import '@shoelace-style/shoelace/dist/components/icon/icon.js';
import { LitElement, css, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

import { appStyles } from '../../../app-styles.js';
import { collectMeasurements } from '../../../arduinos/collect-measurements.js';
import { SerialPortInfo } from '../../../arduinos/connected-arduinos.js';
import { livingPowerStoreContext } from '../context.js';
import { LivingPowerStore } from '../living-power-store.js';
import { Measurement, MeasurementCollection } from '../types.js';

@customElement('collect-measurements-alert')
export class CollectMeasurementsAlert extends SignalWatcher(LitElement) {
	@state()
	collecting = false;

	@state()
	committing = false;

	@state()
	measurements!: Array<Measurement>;

	/**
	 * @internal
	 */
	@consume({ context: livingPowerStoreContext, subscribe: true })
	@property()
	_livingPowerStore!: LivingPowerStore;

	async collectMeasurements(
		bpvDeviceHash: ActionHash,
		serialPortInfo: SerialPortInfo,
	) {
		this.collecting = true;
		try {
			this.measurements = await collectMeasurements(serialPortInfo.port_name);
			(
				this.shadowRoot?.getElementById(
					`save-measurement-dialog-${encodeHashToBase64(bpvDeviceHash)}`,
				) as SlDialog
			).show();
		} catch (e) {
			console.error(e);
			notifyError(msg('Error synchronizing the data.'));
		}
		this.collecting = false;
	}

	async createMeasurementCollection(
		bpvDeviceHash: ActionHash,
		external_resistor_ohms: number,
	) {
		const measurementCollection: MeasurementCollection = {
			bpv_device_hash: bpvDeviceHash,
			measurements: this.measurements!,
			external_resistor_ohms,
		};

		try {
			this.committing = true;
			const actionHashes =
				await this._livingPowerStore.client.createMeasurementCollection(
					measurementCollection,
				);

			this.dispatchEvent(
				new CustomEvent('measurement-collections-created', {
					composed: true,
					bubbles: true,
					detail: {
						measurementCollectionsHashes: actionHashes,
					},
				}),
			);
			this.measurements = [];
		} catch (e: unknown) {
			console.error(e);
			notifyError(msg('Error saving the new measurements.'));
		}
		this.committing = false;
	}

	allMeasurementsForDevice(
		bpvDeviceHash: ActionHash,
	): AsyncResult<Measurement[]> {
		const measurementsCollectionsLive = this._livingPowerStore.bpvDevices
			.get(bpvDeviceHash)
			.measurementCollections.live.get();
		if (measurementsCollectionsLive.status !== 'completed')
			return measurementsCollectionsLive;

		const measurementsCollections = joinAsync(
			Array.from(measurementsCollectionsLive.value.values()).map(mc =>
				mc.entry.get(),
			),
		);
		if (measurementsCollections.status !== 'completed')
			return measurementsCollections;

		const measurements = measurementsCollections.value.map(
			mc => mc.entry.measurements,
		);
		const measurementsFlattened = ([] as Measurement[]).concat(...measurements);

		return {
			status: 'completed',
			value: measurementsFlattened,
		};
	}

	renderAlertForDevice(bpvDeviceHash: ActionHash) {
		const measurements = this.allMeasurementsForDevice(bpvDeviceHash);
		const connectedArduino = this._livingPowerStore.bpvDevices
			.get(bpvDeviceHash)
			.connectedArduino.get();
		if (measurements.status !== 'completed') return html``;
		if (connectedArduino.status !== 'completed' || !connectedArduino.value)
			return html``;

		const lastMeasurement = connectedArduino.value.lastMeasurement.get();
		if (lastMeasurement.status !== 'completed' || !lastMeasurement.value)
			return html``;
		const measurementsByTimestampDescending = measurements.value.sort(
			(m1, m2) => m2.timestamp - m1.timestamp,
		);
		if (
			measurementsByTimestampDescending.length !== 0 &&
			lastMeasurement.value.timestamp <
				measurementsByTimestampDescending[0].timestamp
		)
			return html``;

		return html`
			<sl-dialog
				.label=${msg('New Measurements Collected')}
				id="save-measurement-dialog-${encodeHashToBase64(bpvDeviceHash)}"
			>
				<div class="column" style="gap: 12px">
					<span
						>${msg(
							'New measurements were found for this BPV device. Please type below the Ohms for the external resistor for the new measurements:',
						)}</span
					>
					<sl-input
						type="number"
						.label=${msg('External Resistor (Ohms)')}
						id="external-resistor-ohms"
						@input=${() => this.requestUpdate()}
					></sl-input>
				</div>

				<sl-button
					slot="footer"
					.disabled=${this.committing ||
					(this.shadowRoot?.getElementById('external-resistor-ohms') as SlInput)
						?.value === ''}
					.loading=${this.committing}
					variant="primary"
					@click=${() =>
						this.createMeasurementCollection(
							bpvDeviceHash,
							parseInt(
								(
									this.shadowRoot?.getElementById(
										'external-resistor-ohms',
									) as SlInput
								).value,
							),
						)}
					>${msg('Save Measurements')}</sl-button
				>
			</sl-dialog>
			<sl-alert open>
				<sl-icon
					slot="icon"
					.src=${wrapPathInSvg(mdiInformationOutline)}
				></sl-icon>
				<div class="row" style="flex: 1; gap: 24px;">
					<div class="column">
						<span> <strong>${msg('New measurements found.')}</strong></span>
						<span
							>${msg(
								'There are new measurements stored in the connected BPV device.',
							)}</span
						>
					</div>
					<sl-button
						variant="primary"
						.loading=${this.collecting}
						@click=${() =>
							this.collectMeasurements(
								bpvDeviceHash,
								connectedArduino.value!.serialPortInfo,
							)}
					>
						<sl-icon
							slot="prefix"
							.src=${wrapPathInSvg(mdiDatabaseArrowUpOutline)}
						></sl-icon>
						${msg('Collect Measurements')}</sl-button
					>
				</div>
			</sl-alert>
		`;
	}
	render() {
		const allDevices = this._livingPowerStore.allBpvDevices.get();
		if (allDevices.status !== 'completed') return html``;
		return html`<div class="column" style="gap: 12px">
			${Array.from(allDevices.value.keys()).map(bpvDeviceHash =>
				this.renderAlertForDevice(bpvDeviceHash),
			)}
		</div>`;
	}

	static styles = [...appStyles, css``];
}