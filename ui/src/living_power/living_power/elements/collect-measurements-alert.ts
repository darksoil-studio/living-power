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
import { showDialog } from '../../../utils.js';
import { livingPowerStoreContext } from '../context.js';
import { LivingPowerStore } from '../living-power-store.js';
import { Measurement, MeasurementCollection } from '../types.js';
import './enter-new-resistors-values-dialog.js';
import { EnterNewResistorsValuesDialog } from './enter-new-resistors-values-dialog.js';

@customElement('collect-measurements-alert')
export class CollectMeasurementsAlert extends SignalWatcher(LitElement) {
	@state()
	collecting = false;

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
			const newMeasurements = await collectMeasurements(
				serialPortInfo.port_name,
			);
			await this.createMeasurementCollection(
				arduinoSerialNumber,
				newMeasurements,
			);
		} catch (e) {
			console.error(e);
			notifyError(msg('Error synchronizing the data.'));
		}
		this.collecting = false;
	}

	async createMeasurementCollection(
		arduinoSerialNumber: string,
		measurements: Measurement[],
	) {
		const measurementCollection: MeasurementCollection = {
			arduino_serial_number: arduinoSerialNumber,
			measurements: measurements!,
		};
		console.log(measurements);
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

		showDialog(
			html` <enter-new-resistors-values-dialog
				.arduinoSerialNumber=${arduinoSerialNumber}
				.newMeasurements=${measurements}
			></enter-new-resistors-values-dialog>`,
		);
		// try {
		// 	this.committing = true;
		// 	this.measurements = [];
		// } catch (e: unknown) {
		// 	console.error(e);
		// 	notifyError(msg('Error saving the new measurements.'));
		// }
		// this.committing = false;
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

		const newMeasurements = sdcardMeasurements.value.filter(
			m => !measurements.find(m2 => m2.timestamp === m.timestamp),
		);
		const newMeasurementsByTimestampDescending = newMeasurements.sort(
			(m1, m2) => m2.timestamp - m1.timestamp,
		);

		if (newMeasurementsByTimestampDescending.length === 0) return html``;

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
							// this.measurements = sdcardMeasurements.value;
							// (
							// 	this.shadowRoot?.getElementById(
							// 		`save-measurement-dialog-${arduinoSerialNumber}`,
							// 	) as SlDialog
							// ).show();
							try {
								await this.createMeasurementCollection(
									arduinoSerialNumber,
									newMeasurementsByTimestampDescending,
								);
								// (
								// 	this.shadowRoot?.getElementById(
								// 		`save-measurement-dialog-${arduinoSerialNumber}`,
								// 	) as SlDialog
								// ).show();
							} catch (e) {
								console.error(e);
								notifyError(msg('Error synchronizing the data.'));
							}
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
