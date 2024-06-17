import { Router } from '@holochain-open-dev/elements';
import '@holochain-open-dev/elements/dist/elements/display-error.js';
import {
	Profile,
	ProfilesClient,
	ProfilesStore,
	profilesStoreContext,
} from '@holochain-open-dev/profiles';
import '@holochain-open-dev/profiles/dist/elements/my-profile.js';
import '@holochain-open-dev/profiles/dist/elements/profile-prompt.js';
import { SignalWatcher } from '@holochain-open-dev/signals';
import { EntryRecord } from '@holochain-open-dev/utils';
import { ActionHash, AppClient, AppWebsocket } from '@holochain/client';
import { provide } from '@lit/context';
import { localized, msg } from '@lit/localize';
import '@shoelace-style/shoelace/dist/components/icon-button/icon-button.js';
import '@shoelace-style/shoelace/dist/components/spinner/spinner.js';
// Replace 'light.css' with 'dark.css' if you want the dark theme
import '@shoelace-style/shoelace/dist/themes/light.css';
import { LitElement, css, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

import { appStyles } from './app-styles.js';
import { collectMeasurements } from './arduinos/collect-measurements.js';
import { connectedArduinos } from './arduinos/connected-arduinos.js';
import { connectedArduinosContext, rootRouterContext } from './context.js';
import './home-page.js';
import { livingPowerStoreContext } from './living_power/living_power/context.js';
import { LivingPowerClient } from './living_power/living_power/living-power-client.js';
import { LivingPowerStore } from './living_power/living_power/living-power-store.js';

@localized()
@customElement('holochain-app')
export class HolochainApp extends SignalWatcher(LitElement) {
	@provide({ context: livingPowerStoreContext })
	@property()
	_livingPowerStore!: LivingPowerStore;

	@state() _loading = true;
	@state() _view = { view: 'main' };
	@state() _error: unknown | undefined;

	@provide({ context: profilesStoreContext })
	@property()
	_profilesStore!: ProfilesStore;

	_client!: AppClient;

	@provide({ context: rootRouterContext })
	router = new Router(this, [
		{
			path: '/',
			enter: () => {
				// Redirect to "/home/"
				this.router.goto('/home/');
				return false;
			},
		},
		{
			path: '/home/*',
			render: () => html`<home-page></home-page>`,
		},
		{
			path: '/my-profile',
			render: () => this.renderMyProfilePage(),
		},
	]);

	@provide({ context: connectedArduinosContext })
	_connectedArduinos = connectedArduinos();

	async firstUpdated() {
		try {
			this._client = await AppWebsocket.connect();
			await this.initStores(this._client);
		} catch (e: unknown) {
			this._error = e;
		} finally {
			this._loading = false;
		}
	}

	// Don't change this
	async initStores(appClient: AppClient) {
		this._profilesStore = new ProfilesStore(
			new ProfilesClient(appClient, 'living_power'),
		);
		this._livingPowerStore = new LivingPowerStore(
			new LivingPowerClient(appClient, 'living_power'),
		);
	}

	renderMyProfilePage() {
		return html`
			<div class="column fill">
				<div class="row top-bar">
					<sl-icon-button
						name="arrow-left"
						@click=${() => this.router.pop()}
					></sl-icon-button>
					<span class="title" style="flex: 1">${msg('Living Power')}</span>
				</div>

				<my-profile style="margin: 16px"></my-profile>
			</div>
		`;
	}

	thething() {
		const result = this._connectedArduinos.get();
		if (result.status === 'completed') {
			if (result.value.length > 0) {
				collectMeasurements(result.value[0].port_name);
			}
		}
	}

	render() {
		this.thething();
		if (this._loading)
			return html`<div
				class="row"
				style="flex: 1; height: 100%; align-items: center; justify-content: center;"
			>
				<sl-spinner style="font-size: 2rem"></sl-spinner>
			</div>`;

		if (this._error)
			return html`
				<div
					style="flex: 1; height: 100%; align-items: center; justify-content: center;"
				>
					<display-error
						.error=${this._error}
						.headline=${msg('Error connecting to holochain')}
					>
					</display-error>
				</div>
			`;

		return html`
			<profile-prompt style="flex: 1;">
				${this.router.outlet()}
			</profile-prompt>
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
