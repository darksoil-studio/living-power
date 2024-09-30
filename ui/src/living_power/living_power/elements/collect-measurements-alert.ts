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
	mdiAlertOutline,
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
import {
	collectMeasurements,
	collectMeasurementsFromSdcard,
} from '../../../arduinos/collect-measurements.js';
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
		arduinoSerialNumber: string,
		serialPortInfo: SerialPortInfo,
	) {
		this.collecting = true;
		try {
			this.measurements = await collectMeasurements(serialPortInfo.port_name);
			(
				this.shadowRoot?.getElementById(
					`save-measurement-dialog-${arduinoSerialNumber}`,
				) as SlDialog
			).show();
		} catch (e) {
			console.error(e);
			notifyError(msg('Error synchronizing the data.'));
		}
		this.collecting = false;
	}

	async createMeasurementCollection(
		arduinoSerialNumber: string,
		external_resistor_ohms: number,
	) {
		const measurementCollection: MeasurementCollection = {
			arduino_serial_number: arduinoSerialNumber,
			measurements: this.measurements!,
			external_resistor_ohms,
		};

		console.log(measurementCollection);
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
		arduinoSerialNumber: string,
	): AsyncResult<Measurement[]> {
		const measurementsCollectionsLive = this._livingPowerStore.bpvDevices
			.get(arduinoSerialNumber)
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

	renderConnectedArduinoAlert(
		measurements: Measurement[],
		arduinoSerialNumber: string,
	) {
		const connectedArduino = this._livingPowerStore.bpvDevices
			.get(arduinoSerialNumber)
			.connectedArduino.get();
		if (connectedArduino.status !== 'completed' || !connectedArduino.value)
			return html``;
		const lastMeasurement = connectedArduino.value.lastMeasurement.get();
		if (lastMeasurement.status === 'error')
			return html`
				<sl-alert open variant="danger">
					<sl-icon slot="icon" .src=${wrapPathInSvg(mdiAlertOutline)}></sl-icon>
					<div class="row" style="flex: 1; gap: 24px;">
						<div class="column">
							<span>
								<strong
									>${msg(
										'Error reading the measurements from the device:',
									)}</strong
								>&nbsp;${lastMeasurement.error}</span
							>
							<span
								>${msg(
									'Reconnect the BPV device, press the reset button and try again.',
								)}</span
							>
						</div>
					</div>
				</sl-alert>
			`;
		if (lastMeasurement.status !== 'completed' || !lastMeasurement.value)
			return html``;
		const measurementsByTimestampDescending = measurements.sort(
			(m1, m2) => m2.timestamp - m1.timestamp,
		);
		if (
			measurementsByTimestampDescending.length !== 0 &&
			lastMeasurement.value.timestamp <=
				measurementsByTimestampDescending[0].timestamp
		)
			return html``;

		return html`
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
								arduinoSerialNumber,
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

	renderSdcardAlert(measurements: Measurement[], arduinoSerialNumber: string) {
		const sdcard = this._livingPowerStore.bpvDevices
			.get(arduinoSerialNumber)
			.measurementSdcard.get();
		if (sdcard.status === 'error')
			return html`
				<sl-alert open variant="danger">
					<sl-icon slot="icon" .src=${wrapPathInSvg(mdiAlertOutline)}></sl-icon>
					<div class="row" style="flex: 1; gap: 24px;">
						<div class="column">
							<span> <strong>${msg('Error reading the sdcard.')}</strong></span>
							<span>${msg('Reconnect the sdcard and try again.')}</span>
						</div>
					</div>
				</sl-alert>
			`;
		if (sdcard.status === 'pending' || !sdcard.value) return html``;

		const sdcardMeasurements = sdcard.value.measurements.get();
		if (sdcardMeasurements.status === 'pending') return html``;
		if (sdcardMeasurements.status === 'error')
			return html`
				<sl-alert open variant="danger">
					<sl-icon slot="icon" .src=${wrapPathInSvg(mdiAlertOutline)}></sl-icon>
					<div class="row" style="flex: 1; gap: 24px;">
						<div class="column">
							<span>
								<strong
									>${msg(
										'Error reading the measurements from the sdcard.',
									)}</strong
								></span
							>
							<span>${msg('Reconnect the sdcard and try again.')}</span>
						</div>
					</div>
				</sl-alert>
			`;

		const measurementsByTimestampDescending = measurements.sort(
			(m1, m2) => m2.timestamp - m1.timestamp,
		);
		const newMeasurementsByTimestampDescending = sdcardMeasurements.value.sort(
			(m1, m2) => m2.timestamp - m1.timestamp,
		);

		if (
			newMeasurementsByTimestampDescending.length === 0 ||
			(measurementsByTimestampDescending.length !== 0 &&
				newMeasurementsByTimestampDescending[0].timestamp <=
					measurementsByTimestampDescending[0].timestamp)
		)
			return html``;

		return html`
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
								'There are new measurements stored in the connected SD card.',
							)}</span
						>
					</div>
					<sl-button
						variant="primary"
						.loading=${this.collecting}
						@click=${async () => {
							this.measurements = sdcardMeasurements.value;
							(
								this.shadowRoot?.getElementById(
									`save-measurement-dialog-${arduinoSerialNumber}`,
								) as SlDialog
							).show();
						}}
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

	renderAlertForDevice(arduinoSerialNumber: string) {
		const measurements = this.allMeasurementsForDevice(arduinoSerialNumber);
		if (measurements.status !== 'completed') return html``;

		return html`
			${this.renderConnectedArduinoAlert(
				measurements.value,
				arduinoSerialNumber,
			)}
			${this.renderSdcardAlert(measurements.value, arduinoSerialNumber)}
			<sl-dialog
				.label=${msg('New Measurements Collected')}
				id="save-measurement-dialog-${arduinoSerialNumber}"
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
						id="external-resistor-ohms-${arduinoSerialNumber}"
						@input=${() => this.requestUpdate()}
					></sl-input>
				</div>

				<sl-button
					slot="footer"
					.disabled=${this.committing ||
					(
						this.shadowRoot?.getElementById(
							`external-resistor-ohms-${arduinoSerialNumber}`,
						) as SlInput
					)?.value === ''}
					.loading=${this.committing}
					variant="primary"
					@click=${() =>
						this.createMeasurementCollection(
							arduinoSerialNumber,
							parseInt(
								(
									this.shadowRoot?.getElementById(
										`external-resistor-ohms-${arduinoSerialNumber}`,
									) as SlInput
								).value,
							),
						)}
					>${msg('Save Measurements')}</sl-button
				>
			</sl-dialog>
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
