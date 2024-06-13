import { LitElement, html } from 'lit';
import { repeat } from "lit/directives/repeat.js";
import { state, property, query, customElement } from 'lit/decorators.js';
import { ActionHash, Record, DnaHash, AgentPubKey, EntryHash } from '@holochain/client';
import { EntryRecord } from '@holochain-open-dev/utils';
import { SignalWatcher } from '@holochain-open-dev/signals';
import { hashProperty, notifyError, hashState, onSubmit, wrapPathInSvg } from '@holochain-open-dev/elements';
import { consume } from '@lit/context';
import { localized, msg } from '@lit/localize';
import { mdiAlertCircleOutline, mdiDelete } from "@mdi/js";

import '@shoelace-style/shoelace/dist/components/button/button.js';
import '@shoelace-style/shoelace/dist/components/alert/alert.js';
import SlAlert from '@shoelace-style/shoelace/dist/components/alert/alert.js';
import '@holochain-open-dev/elements/dist/elements/display-error.js';
import '@shoelace-style/shoelace/dist/components/card/card.js';
import '@shoelace-style/shoelace/dist/components/icon/icon.js';
import '@shoelace-style/shoelace/dist/components/input/input.js';

import '@shoelace-style/shoelace/dist/components/icon-button/icon-button.js';
import { appStyles } from '../../../app-styles.js';
import { LivingPowerStore } from '../living-power-store.js';
import { livingPowerStoreContext } from '../context.js';
import { BpvDevice } from '../types.js';

/**
 * @element create-bpv-device
 * @fires bpv-device-created: detail will contain { bpvDeviceHash }
 */
@localized()
@customElement('create-bpv-device')
export class CreateBpvDevice extends SignalWatcher(LitElement) {
  /**
   * REQUIRED. The arduino serial number for this BpvDevice
   */
  @property()
  arduinoSerialNumber!: string;


  /**
   * @internal
   */
  @consume({ context: livingPowerStoreContext, subscribe: true })
  livingPowerStore!: LivingPowerStore;

  /**
   * @internal
   */
  @state()
  committing = false;

  /**
   * @internal
   */
  @query('#create-form')
  form!: HTMLFormElement;


  async createBpvDevice(fields: Partial<BpvDevice>) {
    if (this.arduinoSerialNumber === undefined) throw new Error('Cannot create a new Bpv Device without its arduino_serial_number field');
  
    const bpvDevice: BpvDevice = {
      name: fields.name!,
      arduino_serial_number: this.arduinoSerialNumber!,
    };

    try {
      this.committing = true;
      const record: EntryRecord<BpvDevice> = await this.livingPowerStore.client.createBpvDevice(bpvDevice);

      this.dispatchEvent(new CustomEvent('bpv-device-created', {
        composed: true,
        bubbles: true,
        detail: {
          bpvDeviceHash: record.actionHash
        }
      }));
      
      this.form.reset();
    } catch (e: unknown) {
      console.error(e);
      notifyError(msg("Error creating the bpv device"));
    }
    this.committing = false;
  }

  render() {
    return html`
      <sl-card style="flex: 1;">
        <span slot="header">${msg("Create Bpv Device")}</span>

        <form 
          id="create-form"
          class="column"
          style="flex: 1; gap: 16px;"
          ${onSubmit(fields => this.createBpvDevice(fields))}
        >  
          <div>
          <sl-input name="name" .label=${msg("Name")}  required></sl-input>          </div>


          <sl-button
            variant="primary"
            type="submit"
            .loading=${this.committing}
          >${msg("Create Bpv Device")}</sl-button>
        </form> 
      </sl-card>`;
  }
  
  static styles = appStyles;
}
