import { notifyError, wrapPathInSvg } from '@holochain-open-dev/elements';
import { SignalWatcher, joinAsync } from '@holochain-open-dev/signals';
import { consume } from '@lit/context';
import { msg } from '@lit/localize';
import {
	mdiAlertOutline,
	mdiConnection,
	mdiCreationOutline,
	mdiPlus,
	mdiPlusOutline,
} from '@mdi/js';
import '@shoelace-style/shoelace/dist/components/alert/alert.js';
import '@shoelace-style/shoelace/dist/components/button/button.js';
import '@shoelace-style/shoelace/dist/components/dialog/dialog.js';
import SlDialog from '@shoelace-style/shoelace/dist/components/dialog/dialog.js';
import '@shoelace-style/shoelace/dist/components/input/input.js';
import SlInput from '@shoelace-style/shoelace/dist/components/input/input.js';
import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { pickBy } from 'lodash-es';

import { appStyles } from '../../../app-styles.js';
import { SerialPortInfo } from '../../../arduinos/connected-arduinos.js';
import { livingPowerStoreContext } from '../context.js';
import { LivingPowerStore } from '../living-power-store.js';

@customElement('new-arduino-connected-alert')
export class NewArduinoConnectedAlert extends SignalWatcher(LitElement) {
	/**
	 * @internal
	 */
	@consume({ context: livingPowerStoreContext, subscribe: true })
	_livingPowerStore!: LivingPowerStore;

	@property()
	creating = false;

	newBpvDeviceConnected() {
		const connectedArduinos = this._livingPowerStore.connectedArduinos.get();
		if (connectedArduinos.status !== 'completed') return connectedArduinos;

		const allBpvDevices = this._livingPowerStore.allBpvDevices.get();
		if (allBpvDevices.status !== 'completed') return allBpvDevices;

		const allDevices = joinAsync(
			Array.from(allBpvDevices.value.values()).map(device =>
				device.original.get(),
			),
		);
		if (allDevices.status !== 'completed') return allDevices;

		const newDevices = connectedArduinos.value.filter(
			arduino =>
				arduino.port_type?.UsbPort.serial_number &&
				!allDevices.value.find(
					d =>
						d.entry.arduino_serial_number ===
						arduino.port_type?.UsbPort.serial_number,
				),
		);
		return {
			status: 'completed' as 'completed',
			value: newDevices,
		};
	}

	newBpvDeviceScardConnected() {
		const sdcards = this._livingPowerStore.measurementsSdcards.get();
		if (sdcards.status !== 'completed') return sdcards;

		const allBpvDevices = this._livingPowerStore.allBpvDevices.get();
		if (allBpvDevices.status !== 'completed') return allBpvDevices;

		const allDevices = joinAsync(
			Array.from(allBpvDevices.value.values()).map(device =>
				device.original.get(),
			),
		);
		if (allDevices.status !== 'completed') return allDevices;

		const newSdcards = pickBy(
			sdcards.value,
			(_, serialnumber) =>
				!allDevices.value.find(
					d => d.entry.arduino_serial_number === serialnumber,
				),
		);
		return {
			status: 'completed' as const,
			value: newSdcards,
		};
	}

	async createBpvDevice(serialNumber: string, name: string) {
		this.creating = true;
		try {
			const record = await this._livingPowerStore.client.createBpvDevice({
				arduino_serial_number: serialNumber,
				name,
			});

			this.dispatchEvent(
				new CustomEvent('bpv-device-created', {
					composed: true,
					bubbles: true,
					detail: {
						bpvDeviceHash: record.actionHash,
					},
				}),
			);
		} catch (e: unknown) {
			console.error(e);
			notifyError(msg('Error creating the bpv device'));
		}
		this.creating = false;
	}

	renderCreateNewDeviceAlert(
		serialnumber: string,
		connectionType: 'sdcard' | 'usbserial',
	) {
		const input = this.shadowRoot!.getElementById(
			`bpv-device-name-${serialnumber}`,
		) as SlInput;
		return html`
			<sl-dialog
				.label=${msg('Create new BPV device')}
				id="create-bpv-device-dialog-${serialnumber}"
			>
				<sl-input
					.label=${msg('Name')}
					id="bpv-device-name-${serialnumber}"
					@input=${() => this.requestUpdate()}
				></sl-input>
				<sl-button
					slot="footer"
					variant="primary"
					.disabled=${!input || input.value === ''}
					.loading=${this.creating}
					@click=${() =>
						this.createBpvDevice(
							serialnumber,
							(
								this.shadowRoot!.getElementById(
									`bpv-device-name-${serialnumber}`,
								) as SlInput
							)?.value,
						)}
					>${msg('Create')}</sl-button
				>
			</sl-dialog>
			<sl-alert open>
				<sl-icon slot="icon" .src=${wrapPathInSvg(mdiConnection)}></sl-icon>
				<div class="row" style="flex: 1; gap: 24px;">
					<div class="column">
						<span>
							<strong
								>${connectionType === 'usbserial'
									? msg('New arduino device detected.')
									: msg('New BPV SD card detected.')}</strong
							></span
						>
						<span
							>${connectionType === 'usbserial'
								? msg(
										'You have connected a new arduino device which is not stored as a BPV device in this network.',
									)
								: msg(
										'You have connected a SD card from an arduino device which is not stored as a BPV device in this network.',
									)}</span
						>
					</div>
					<sl-button
						variant="primary"
						@click=${() =>
							(
								this.shadowRoot?.getElementById(
									`create-bpv-device-dialog-${serialnumber}`,
								) as SlDialog
							).show()}
					>
						<sl-icon slot="prefix" .src=${wrapPathInSvg(mdiPlus)}></sl-icon>
						${msg('Create BPV device')}</sl-button
					>
				</div>
			</sl-alert>
		`;
	}

	renderBpvDevicesAlerts() {
		const newBpvDevices = this.newBpvDeviceConnected();

		if (newBpvDevices.status !== 'completed' || !newBpvDevices.value)
			return html``;

		return html`
			${newBpvDevices.value.map(d =>
				this.renderCreateNewDeviceAlert(
					d.port_type!.UsbPort.serial_number,
					'usbserial',
				),
			)}
		`;
	}

	renderSdcardsAlerts() {
		const newSdcards = this.newBpvDeviceScardConnected();

		if (newSdcards.status !== 'completed' || !newSdcards.value) return html``;

		return html`
			${Object.keys(newSdcards.value).map(serialnumber =>
				this.renderCreateNewDeviceAlert(serialnumber, 'sdcard'),
			)}
		`;
	}

	render() {
		return html`
			<div class="column" style="gap: 12px">
				${this.renderBpvDevicesAlerts()} ${this.renderSdcardsAlerts()}
			</div>
		`;
	}

	static styles = appStyles;
}
