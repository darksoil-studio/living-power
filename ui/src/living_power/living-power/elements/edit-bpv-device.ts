import { LitElement, html } from 'lit';
import { repeat } from "lit/directives/repeat.js";
import { state, customElement, property } from 'lit/decorators.js';
import { ActionHash, Record, EntryHash, AgentPubKey } from '@holochain/client';
import { EntryRecord } from '@holochain-open-dev/utils';
import { hashState, notifyError, hashProperty, wrapPathInSvg, onSubmit } from '@holochain-open-dev/elements';
import { SignalWatcher, toPromise } from '@holochain-open-dev/signals';
import { consume } from '@lit/context';
import { localized, msg } from '@lit/localize';
import { mdiAlertCircleOutline, mdiDelete } from '@mdi/js';

import '@shoelace-style/shoelace/dist/components/alert/alert.js';
import '@shoelace-style/shoelace/dist/components/icon-button/icon-button.js';
import '@shoelace-style/shoelace/dist/components/button/button.js';

import '@shoelace-style/shoelace/dist/components/icon/icon.js';
import '@shoelace-style/shoelace/dist/components/card/card.js';
import '@shoelace-style/shoelace/dist/components/input/input.js';
import SlAlert from '@shoelace-style/shoelace/dist/components/alert/alert.js';
import { appStyles } from '../../../app-styles.js';
import { LivingPowerStore } from '../living-power-store.js';
import { livingPowerStoreContext } from '../context.js';
import { BpvDevice } from '../types.js';

/**
 * @element edit-bpv-device
 * @fires bpv-device-updated: detail will contain { previousBpvDeviceHash, updatedBpvDeviceHash }
 */
@localized()
@customElement('edit-bpv-device')
export class EditBpvDevice extends SignalWatcher(LitElement) {

  /**
   * REQUIRED. The hash of the original `Create` action for this BpvDevice
   */
  @property(hashProperty('bpv-device-hash'))
  bpvDeviceHash!: ActionHash;

  /**
   * @internal
   */
  @consume({ context: livingPowerStoreContext })
  livingPowerStore!: LivingPowerStore;

  /**
   * @internal
   */
  @state()
  committing = false;
   

  async firstUpdated() {
    const currentRecord = await toPromise(this.livingPowerStore.bpvDevices.get(this.bpvDeviceHash).latestVersion);
    setTimeout(() => {
      (this.shadowRoot?.getElementById('form') as HTMLFormElement).reset();
    });
  }

  async updateBpvDevice(currentRecord: EntryRecord<BpvDevice>, fields: Partial<BpvDevice>) {  
    const bpvDevice: BpvDevice = { 
      name: fields.name!,
      arduino_serial_number: currentRecord.entry.arduino_serial_number!,
    };

    try {
      this.committing = true;
      const updateRecord = await this.livingPowerStore.client.updateBpvDevice(
        currentRecord.actionHash,
        bpvDevice
      );
  
      this.dispatchEvent(new CustomEvent('bpv-device-updated', {
        composed: true,
        bubbles: true,
        detail: {
          previousBpvDeviceHash: currentRecord.actionHash,
          updatedBpvDeviceHash: updateRecord.actionHash
        }
      }));
    } catch (e: unknown) {
      console.error(e);
      notifyError(msg("Error updating the bpv device"));
    }
    
    this.committing = false;
  }

  renderEditForm(currentRecord: EntryRecord<BpvDevice>) {
    return html`
      <sl-card>
        <span slot="header">${msg("Edit Bpv Device")}</span>

        <form
          id="form"
          class="column"
          style="flex: 1; gap: 16px;"
          ${onSubmit(fields => this.updateBpvDevice(currentRecord, fields))}
        >  
          <div>
        <sl-input name="name" .label=${msg("Name")}  required .defaultValue=${ currentRecord.entry.name }></sl-input>          </div>


          <div class="row" style="gap: 8px;">
            <sl-button
              @click=${() => this.dispatchEvent(new CustomEvent('edit-canceled', {
                bubbles: true,
                composed: true
              }))}
              style="flex: 1;"
            >${msg("Cancel")}</sl-button>
            <sl-button
              type="submit"
              variant="primary"
              style="flex: 1;"
              .loading=${this.committing}
            >${msg("Save")}</sl-button>

          </div>
        </form>
      </sl-card>`;
  }

  render() {
  const bpvDevice = this.livingPowerStore.bpvDevices.get(this.bpvDeviceHash).latestVersion.get();

    switch (bpvDevice.status) {
      case 'pending':
        return html`<div style="display: flex; flex-direction: column; align-items: center; justify-content: center; flex: 1;"
        >
          <sl-spinner style="font-size: 2rem;"></sl-spinner>
        </div>`;
      case 'error':
        return html`<display-error
          .headline=${msg("Error fetching the bpv device")}
          .error=${ bpvDevice.error}
        ></display-error>`;
      case 'completed':
        return this.renderEditForm(bpvDevice.value);
    }
  }

  static styles = appStyles;
}
