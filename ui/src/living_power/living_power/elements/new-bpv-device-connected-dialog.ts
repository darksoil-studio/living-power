import { notifyError } from '@holochain-open-dev/elements';
import { SignalWatcher, joinAsync } from '@holochain-open-dev/signals';
import { consume } from '@lit/context';
import { msg } from '@lit/localize';
import '@shoelace-style/shoelace/dist/components/button/button.js';
import '@shoelace-style/shoelace/dist/components/dialog/dialog.js';
import '@shoelace-style/shoelace/dist/components/input/input.js';
import SlInput from '@shoelace-style/shoelace/dist/components/input/input.js';
import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';

import { appStyles } from '../../../app-styles.js';
import { livingPowerStoreContext } from '../context.js';
import { LivingPowerStore } from '../living-power-store.js';

@customElement('new-bpv-device-connected-dialog')
export class NewBpvDeviceConnectedDialog extends SignalWatcher(LitElement) {
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
				!allDevices.value.find(
					d =>
						d.entry.arduino_serial_number ===
						arduino.port_type?.UsbPort.serial_number,
				),
		);

		const value = newDevices.length > 0 ? newDevices[0] : undefined;
		return {
			status: 'completed' as 'completed',
			value,
		};
	}

	async createBpvDevice(serialNumber: string, name: string) {
		console.warn(serialNumber);
		console.warn(name);
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

	render() {
		const newBpvDevice = this.newBpvDeviceConnected();

		if (newBpvDevice.status !== 'completed' || !newBpvDevice.value)
			return html``;

		const device = newBpvDevice.value;
		console.warn(device);

		return html`<sl-dialog .label=${msg('New BPV device connected')} open>
			<sl-input .label=${msg('Name')} id="bpv-device-name"></sl-input>
			<sl-button
				slot="footer"
				variant="primary"
				.loading=${this.creating}
				@click=${() =>
					this.createBpvDevice(
						device.port_type!.UsbPort.serial_number,
						(this.shadowRoot!.getElementById('bpv-device-name') as SlInput)
							.value,
					)}
				>${msg('Create')}</sl-button
			>
		</sl-dialog>`;
	}

	static styles = appStyles;
}
