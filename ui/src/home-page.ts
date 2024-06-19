import { Router, Routes, wrapPathInSvg } from '@holochain-open-dev/elements';
import {
	ProfilesStore,
	profilesStoreContext,
} from '@holochain-open-dev/profiles';
import '@holochain-open-dev/profiles/dist/elements/agent-avatar.js';
import '@holochain-open-dev/profiles/dist/elements/profile-list-item-skeleton.js';
import {
	AsyncResult,
	SignalWatcher,
	toPromise,
} from '@holochain-open-dev/signals';
import { EntryRecord } from '@holochain-open-dev/utils';
import {
	ActionHash,
	decodeHashFromBase64,
	encodeHashToBase64,
} from '@holochain/client';
import { consume } from '@lit/context';
import { msg } from '@lit/localize';
import { mdiInformationOutline } from '@mdi/js';
import '@shoelace-style/shoelace/dist/components/tab-group/tab-group.js';
import '@shoelace-style/shoelace/dist/components/tab-panel/tab-panel.js';
import { LitElement, css, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';

import { appStyles } from './app-styles.js';
import { collectMeasurements } from './arduinos/collect-measurements.js';
import { SerialPortInfo } from './arduinos/connected-arduinos.js';
import { rootRouterContext } from './context.js';
import { livingPowerStoreContext } from './living_power/living_power/context.js';
import './living_power/living_power/elements/bpv-device-detail.js';
import './living_power/living_power/elements/collect-measurements-alert.js';
import './living_power/living_power/elements/new-arduino-connected-alert.js';
import { LivingPowerStore } from './living_power/living_power/living-power-store.js';

@customElement('home-page')
export class HomePage extends SignalWatcher(LitElement) {
	/**
	 * @internal
	 */
	@consume({ context: rootRouterContext, subscribe: true })
	rootRouter!: Router;

	/**
	 * @internal
	 */
	@consume({ context: profilesStoreContext, subscribe: true })
	@property()
	_profilesStore!: ProfilesStore;

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
				else
					this.routes.goto(
						`bpv-devices/${encodeHashToBase64(Array.from(devices.keys())[0])}`,
					);
				return false;
			},
		},
		{
			path: 'no-devices',
			render: () => this.renderNoDevices(),
			enter: async () => {
				const devices = await toPromise(this._livingPowerStore.allBpvDevices);
				if (devices.size !== 0)
					this.routes.goto(
						`bpv-devices/${encodeHashToBase64(Array.from(devices.keys())[0])}`,
					);
				return true;
			},
		},
		{
			path: 'bpv-devices/:bpvDeviceHash',
			render: params =>
				html`<bpv-device-detail
					.bpvDeviceHash=${decodeHashFromBase64(params.bpvDeviceHash!)}
				></bpv-device-detail>`,
		},
	]);

	get selectedBpvDeviceHash(): ActionHash | undefined {
		const pathname = this.routes.currentPathname();
		if (!pathname.includes('bpv-devices/')) return undefined;
		const split = pathname.split('bpv-devices/');
		if (split.length === 1) return undefined;
		return decodeHashFromBase64(split[1]);
	}

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
			<span class="placeholder"
				>${msg(
					'To add a BPV device, connect it to this computer through a USB device.',
				)}</span
			>
		</div>`;
	}

	renderMyProfile() {
		const myProfile = this._profilesStore.myProfile.get();

		switch (myProfile.status) {
			case 'pending':
				return html`<profile-list-item-skeleton></profile-list-item-skeleton>`;
			case 'error':
				return html`<display-error
					.headline=${msg('Error fetching the profile')}
					.error=${myProfile.error}
					tooltip
				></display-error>`;
			case 'completed':
				return html`<div
					class="row"
					style="align-items: center;"
					slot="actionItems"
				>
					<agent-avatar
						.agentPubKey=${this._profilesStore.client.client.myPubKey}
					></agent-avatar>
					<span style="margin: 0 16px;"
						>${myProfile.value?.entry.nickname}</span
					>
				</div>`;
		}
	}

	render() {
		return html`
			<div class="column fill" style="position: relative">
				<div class="row top-bar">
					<span class="title" style="flex: 1">${msg('Living Power')}</span>

					<div class="row" style="gap: 16px" slot="actionItems"></div>
				</div>

				${this.routes.outlet()}
				<div
					class="column"
					style="gap: 12px; position: fixed; right: 16px; bottom: 16px"
				>
					<new-arduino-connected-alert
						@bpv-device-created=${(e: CustomEvent) =>
							this.routes.goto(
								`bpv-devices/${encodeHashToBase64(e.detail.bpvDeviceHash)}`,
							)}
					></new-arduino-connected-alert>
					<collect-measurements-alert></collect-measurements-alert>
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
