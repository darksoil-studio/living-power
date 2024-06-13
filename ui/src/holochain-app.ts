import { livingPowerStoreContext } from './living_power/living-power/context.js';
import { LivingPowerClient } from './living_power/living-power/living-power-client.js';
import { LivingPowerStore } from './living_power/living-power/living-power-store.js';

// Replace 'light.css' with 'dark.css' if you want the dark theme
import '@shoelace-style/shoelace/dist/themes/light.css';

import { LitElement, css, html } from 'lit';
import { property, state, customElement } from 'lit/decorators.js';
import { AppWebsocket, AppClient, ActionHash } from '@holochain/client';
import { SignalWatcher } from '@holochain-open-dev/signals';
import { Router } from '@holochain-open-dev/elements';
import { provide } from '@lit/context';
import { localized, msg } from '@lit/localize';
import {
  Profile,
  ProfilesClient,
  ProfilesStore,
  profilesStoreContext
} from '@holochain-open-dev/profiles';
import { EntryRecord } from '@holochain-open-dev/utils';

import '@holochain-open-dev/elements/dist/elements/display-error.js';
import '@holochain-open-dev/profiles/dist/elements/profile-prompt.js';
import '@holochain-open-dev/profiles/dist/elements/my-profile.js';
import '@shoelace-style/shoelace/dist/components/spinner/spinner.js';
import '@shoelace-style/shoelace/dist/components/icon-button/icon-button.js';

import { rootRouterContext } from './context.ts';
import { appStyles } from './app-styles.js';
import './home-page.ts';

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
      path: "/",
      enter: () => {
        // Redirect to "/home/"
        this.router.goto("/home/");
        return false;
      },
    },
    {
      path: "/home/*",
      render: () => html`<home-page></home-page>`,
    },
    {
      path: "/my-profile",
      render: () => this.renderMyProfilePage(),
    },
  ]);

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
    this._profilesStore = new ProfilesStore(new ProfilesClient(appClient, 'TODO:REPLACE_ME_WITH_THE_DNA_WITH_THE_PROFILES_ZOME'));
    this._livingPowerStore = new LivingPowerStore(new LivingPowerClient(appClient, 'living_power'));
  }

  renderMyProfilePage() {
    return html`
      <div class="column fill">
        <div class="row top-bar">
          <sl-icon-button
            name="arrow-left"
            @click=${() => this.router.pop()}
          ></sl-icon-button>
          <span class="title" style="flex: 1">${msg("Living Power")}</span>
        </div>

        <my-profile style="margin: 16px"></my-profile>
      </div>
    `;
  }

  render() {
    if (this._loading)
      return html`<div
        class="row"
        style="flex: 1; height: 100%; align-items: center; justify-content: center;"
      >
        <sl-spinner style="font-size: 2rem"></sl-spinner>
      </div>`;

    if (this._error)
      return html`
        <div style="flex: 1; height: 100%; align-items: center; justify-content: center;">
          <display-error .error=${this._error} .headline=${msg("Error connecting to holochain")}>
          </display-error>
        </div>
      `;

    return html`
      <div class="column fill">
        <div
          class="row"
          style="align-items: center; color:white; background-color: var(--sl-color-primary-900); padding: 16px"
        >
          ${this.renderBackButton()}
          <span class="title" style="flex: 1">${msg("Living Power")}</span>

          ${this.renderMyProfile()}
        </div>

        <profile-prompt style="flex: 1;">
          ${this.router.outlet()}
        </profile-prompt>
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
  ];}
