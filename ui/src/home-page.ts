import { Router, Routes, wrapPathInSvg } from '@holochain-open-dev/elements';
// import {
// 	ProfilesStore,
// 	profilesStoreContext,
// } from '@holochain-open-dev/profiles';
// import '@holochain-open-dev/profiles/dist/elements/agent-avatar.js';
// import '@holochain-open-dev/profiles/dist/elements/profile-list-item-skeleton.js';
import { SignalWatcher, toPromise } from '@holochain-open-dev/signals';
import { consume } from '@lit/context';
import { msg } from '@lit/localize';
import {
	mdiArrowLeft,
	mdiDeveloperBoard,
	mdiInformationOutline,
} from '@mdi/js';
import '@shoelace-style/shoelace/dist/components/option/option.js';
import '@shoelace-style/shoelace/dist/components/select/select.js';
import SlSelect from '@shoelace-style/shoelace/dist/components/select/select.js';
import '@shoelace-style/shoelace/dist/components/tab-group/tab-group.js';
import '@shoelace-style/shoelace/dist/components/tab-panel/tab-panel.js';
import { LitElement, css, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';

import { appStyles } from './app-styles.js';
import { connectedArduinos } from './arduinos/connected-arduinos.js';
import { rootRouterContext } from './context.js';
import { livingPowerStoreContext } from './living_power/living_power/context.js';
import './living_power/living_power/elements/bpv-device.js';
import { BpvDevice } from './living_power/living_power/elements/bpv-device.js';
import './living_power/living_power/elements/collect-measurements-alert.js';
import './living_power/living_power/elements/new-arduino-connected-alert.js';
import {
	LivingPowerStore,
	joinAsyncNormalMap,
	mapValuesNormalMap,
	pickByNormalMap,
} from './living_power/living_power/living-power-store.js';

@customElement('home-page')
export class HomePage extends SignalWatcher(LitElement) {
	/**
	 * @internal
	 */
	@consume({ context: rootRouterContext, subscribe: true })
	rootRouter!: Router;

	// /**
	//  * @internal
	//  */
	// @consume({ context: profilesStoreContext, subscribe: true })
	// @property()
	// _profilesStore!: ProfilesStore;

	/**
	 * @internal
	 */
	@consume({ context: livingPowerStoreContext, subscribe: true })
	@property()
	_livingPowerStore!: LivingPowerStore;

	routes = new Routes(this, [
		{
			path: '',
			enter: async () => {
				const devices = await toPromise(this._livingPowerStore.allBpvDevices);

				if (devices.size === 0) this.routes.goto('no-devices');
				else this.routes.goto(`bpv-devices/${Array.from(devices.keys())[0]}`);
				return false;
			},
		},
		{
			path: 'no-devices',
			render: () => this.renderNoDevices(),
			enter: async () => {
				const devices = await toPromise(this._livingPowerStore.allBpvDevices);
				if (devices.size !== 0)
					this.routes.goto(`bpv-devices/${Array.from(devices.keys())[0]}`);
				return true;
			},
		},
		{
			path: 'bpv-devices/:arduinoSerialNumber',
			enter: params => {
				this.routes.goto(`bpv-devices/${params.arduinoSerialNumber}/`);
				return false;
			},
		},
		{
			path: 'bpv-devices/:arduinoSerialNumber/*',
			render: params =>
				html`<bpv-device
					style="flex: 1"
					.arduinoSerialNumber=${params.arduinoSerialNumber}
				></bpv-device>`,
		},
	]);

	renderNoDevices() {
		return html`<div
			class="column"
			style="flex: 1; align-items: center; justify-content: center; gap: 12px"
		>
			<sl-icon
				.src=${wrapPathInSvg(mdiInformationOutline)}
				style="font-size: 64px;"
				class="placeholder"
			></sl-icon>
			<span class="placeholder">${msg('No BPV devices were found.')}</span>
			<span class="placeholder" style="max-width: 40rem; text-align: center"
				>${msg(
					'To add a BPV device, connect it to this computer through a USB cable, and',
				)}<strong
					>${msg(' press the reset button on the arduino device')}</strong
				></span
			>
			<span class="placeholder" style="max-width: 40rem; text-align: center"
				>${msg('OR')}</span
			>
			<span class="placeholder" style="max-width: 40rem; text-align: center"
				>${msg(
					'extract the SD card from the BPV device and insert it in this computer.',
				)}</span
			>
		</div>`;
	}

	allBpvDevicesLatest() {
		const devices = this._livingPowerStore.allBpvDevices.get();
		if (devices.status !== 'completed') return devices;

		const values = joinAsyncNormalMap(
			mapValuesNormalMap(devices.value, d => d.info.get()),
		);
		if (values.status !== 'completed') return values;

		const devicesInfos = pickByNormalMap(values.value, info => !!info);

		return {
			status: 'completed' as const,
			value: devicesInfos,
		};
	}

	renderTitle() {
		const allBpvDevicesLatest = this.allBpvDevicesLatest();

		if (allBpvDevicesLatest.status !== 'completed') return html``;

		if (allBpvDevicesLatest.value.size === 0)
			return html`<span class="title" style="color: white;"
				>${msg('Living Power')}</span
			>`;

		const pathname = this.routes.currentPathname();
		const selectedSerialNumber = pathname.split('/')[1];

		return html`<div class="row" style="align-items: center; flex: 1">
			<sl-select
				.value=${selectedSerialNumber}
				@sl-change=${(e: CustomEvent) => {
					this.routes.goto(`bpv-devices/${(e.target as SlSelect).value}`);
				}}
			>
				<sl-icon
					slot="prefix"
					.src=${wrapPathInSvg(mdiDeveloperBoard)}
				></sl-icon>

				${Array.from(allBpvDevicesLatest.value.entries()).map(
					([arduinoSerialNumber, info]) =>
						html`<sl-option value="${arduinoSerialNumber}"
							>${info?.name}</sl-option
						>`,
				)}
			</sl-select>
			<div style="flex: 1"></div>

			<sl-button
				@click=${() => {
					(
						this.shadowRoot!.querySelector('bpv-device') as BpvDevice
					).routes.goto(`external-resistors-values`);
				}}
				>${msg('External Resistors Values')}</sl-button
			>
		</div>`;
	}

	render() {
		return html`
			<div class="column" style="flex: 1">
				<div class="row top-bar">
					<div class="row" style="flex: 1; gap: 12px;">
						${this.renderTitle()}
					</div>
				</div>
				<div class="column " style="flex: 1; padding: 16px">
					${this.routes.outlet()}
					<div
						class="column"
						style="gap: 12px; position: fixed; right: 16px; bottom: 16px"
					>
						<new-arduino-connected-alert
							@bpv-device-added=${(e: CustomEvent) =>
								this.routes.goto(`bpv-devices/${e.detail.arduinoSerialNumber}`)}
						></new-arduino-connected-alert>
						<collect-measurements-alert></collect-measurements-alert>
					</div>
				</div>
			</div>
		`;
	}

	static styles = [
		css`
			:host {
				display: flex;
				flex: 1;
			}
		`,
		...appStyles,
	];
}
