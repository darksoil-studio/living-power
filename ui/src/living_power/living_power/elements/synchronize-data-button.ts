import { notifyError } from '@holochain-open-dev/elements';
import { SignalWatcher, toPromise } from '@holochain-open-dev/signals';
import { EntryRecord } from '@holochain-open-dev/utils';
import { ActionHash } from '@holochain/client';
import { consume } from '@lit/context';
import { msg } from '@lit/localize';
import { SlDialog, SlInput } from '@shoelace-style/shoelace';
import '@shoelace-style/shoelace/dist/components/button/button.js';
import '@shoelace-style/shoelace/dist/components/dialog/dialog.js';
import { LitElement, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

import { appStyles } from '../../../app-styles';
import { collectMeasurements } from '../../../arduinos/collect-measurements';
import { SerialPortInfo } from '../../../arduinos/connected-arduinos';
import { livingPowerStoreContext } from '../context';
import { LivingPowerStore } from '../living-power-store';
import { Measurement, MeasurementCollection } from '../types';

@customElement('synchronize-data-button')
export class SynchronizeDataButton extends SignalWatcher(LitElement) {
	@property()
	bpvDeviceHash!: ActionHash;

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

	getAllMeasurements() {
		const result = this._livingPowerStore.bpvDevices
			.get(this.bpvDeviceHash)
			.measurementCollections.live.get();
		if (result.status !== 'completed') return;
	}

	async collectMeasurements(serialPortInfo: SerialPortInfo) {
		this.collecting = true;
		try {
			this.measurements = await collectMeasurements(serialPortInfo.port_name);
			console.warn(this.measurements.length);
			(
				this.shadowRoot?.getElementById('save-measurement-dialog') as SlDialog
			).show();
		} catch (e) {
			console.error(e);
			notifyError(msg('Error synchronizing the data.'));
		}
		this.collecting = false;
	}

	async createMeasurementCollection(external_resistor_ohms: number) {
		const measurementCollection: MeasurementCollection = {
			bpv_device_hash: this.bpvDeviceHash!,
			measurements: this.measurements!,
			external_resistor_ohms,
		};

		try {
			this.committing = true;
			const record: EntryRecord<MeasurementCollection> =
				await this._livingPowerStore.client.createMeasurementCollection(
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
		} catch (e: unknown) {
			console.error(e);
			notifyError(msg('Error saving the new measurements.'));
		}
		this.committing = false;
	}

	render() {
		const connectedArduinos = this._livingPowerStore.connectedArduinos.get();

		const thisDevice = this._livingPowerStore.bpvDevices
			.get(this.bpvDeviceHash)
			.latestVersion.get();

		const connectedArduino =
			connectedArduinos.status === 'completed' &&
			thisDevice.status === 'completed' &&
			connectedArduinos.value.find(
				arduino =>
					thisDevice.value.entry.arduino_serial_number ===
					arduino.port_type?.UsbPort.serial_number,
			);
		return html`
			<sl-dialog
				.label=${msg('New Measurements Collected')}
				id="save-measurement-dialog"
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
			<sl-button
				.disabled=${!connectedArduino || this.collecting}
				.loading=${this.collecting}
				@click=${() =>
					this.collectMeasurements(connectedArduino as SerialPortInfo)}
				>${msg('Synchronize Data')}</sl-button
			>
		`;
	}

	static styles = appStyles;
}
