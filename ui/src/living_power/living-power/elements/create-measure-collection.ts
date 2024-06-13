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

import SlAlert from '@shoelace-style/shoelace/dist/components/alert/alert.js';

import '@shoelace-style/shoelace/dist/components/card/card.js';
import '@shoelace-style/shoelace/dist/components/icon-button/icon-button.js';
import '@shoelace-style/shoelace/dist/components/icon/icon.js';
import '@shoelace-style/shoelace/dist/components/input/input.js';
import '@shoelace-style/shoelace/dist/components/alert/alert.js';
import '@holochain-open-dev/elements/dist/elements/display-error.js';
import '@shoelace-style/shoelace/dist/components/button/button.js';
import { appStyles } from '../../../app-styles.js';
import { LivingPowerStore } from '../living-power-store.js';
import { livingPowerStoreContext } from '../context.js';
import { MeasureCollection } from '../types.js';

/**
 * @element create-measure-collection
 * @fires measure-collection-created: detail will contain { measureCollectionHash }
 */
@localized()
@customElement('create-measure-collection')
export class CreateMeasureCollection extends SignalWatcher(LitElement) {
  /**
   * REQUIRED. The bpv device hash for this MeasureCollection
   */
  @property(hashProperty('bpv-device-hash'))
  bpvDeviceHash!: ActionHash;

  /**
   * REQUIRED. The measures for this MeasureCollection
   */
  @property()
  measures!: Array<number>;


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


  async createMeasureCollection(fields: Partial<MeasureCollection>) {
    if (this.bpvDeviceHash === undefined) throw new Error('Cannot create a new Measure Collection without its bpv_device_hash field');
    if (this.measures === undefined) throw new Error('Cannot create a new Measure Collection without its measures field');
  
    const measureCollection: MeasureCollection = {
      bpv_device_hash: this.bpvDeviceHash!,
      measures: this.measures!,
      external_resistor_ohms: fields.external_resistor_ohms!,
    };

    try {
      this.committing = true;
      const record: EntryRecord<MeasureCollection> = await this.livingPowerStore.client.createMeasureCollection(measureCollection);

      this.dispatchEvent(new CustomEvent('measure-collection-created', {
        composed: true,
        bubbles: true,
        detail: {
          measureCollectionHash: record.actionHash
        }
      }));
      
      this.form.reset();
    } catch (e: unknown) {
      console.error(e);
      notifyError(msg("Error creating the measure collection"));
    }
    this.committing = false;
  }

  render() {
    return html`
      <sl-card style="flex: 1;">
        <span slot="header">${msg("Create Measure Collection")}</span>

        <form 
          id="create-form"
          class="column"
          style="flex: 1; gap: 16px;"
          ${onSubmit(fields => this.createMeasureCollection(fields))}
        >  
          <div>
          <sl-input type="number" name="external_resistor_ohms" .label=${msg("External Resistor Ohms")}  required></sl-input>          </div>


          <sl-button
            variant="primary"
            type="submit"
            .loading=${this.committing}
          >${msg("Create Measure Collection")}</sl-button>
        </form> 
      </sl-card>`;
  }
  
  static styles = appStyles;
}
