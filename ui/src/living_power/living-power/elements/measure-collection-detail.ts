import { LitElement, html } from 'lit';
import { state, property, customElement } from 'lit/decorators.js';
import { EntryHash, Record, ActionHash } from '@holochain/client';
import { EntryRecord } from '@holochain-open-dev/utils';
import { SignalWatcher } from '@holochain-open-dev/signals';
import { hashProperty, wrapPathInSvg, notifyError } from '@holochain-open-dev/elements';
import { consume } from '@lit/context';
import { localized, msg } from '@lit/localize';
import { mdiAlertCircleOutline, mdiPencil, mdiDelete } from '@mdi/js';

import '@holochain-open-dev/elements/dist/elements/display-error.js';
import '@shoelace-style/shoelace/dist/components/icon-button/icon-button.js';
import '@shoelace-style/shoelace/dist/components/spinner/spinner.js';
import SlAlert from '@shoelace-style/shoelace/dist/components/alert/alert.js';
import '@shoelace-style/shoelace/dist/components/alert/alert.js';
import '@shoelace-style/shoelace/dist/components/card/card.js';
import '@shoelace-style/shoelace/dist/components/button/button.js';

import { appStyles } from '../../../app-styles.js';

import { LivingPowerStore } from '../living-power-store.js';
import { livingPowerStoreContext } from '../context.js';
import { MeasureCollection } from '../types.js';

/**
 * @element measure-collection-detail
 * @fires measure-collection-deleted: detail will contain { measureCollectionHash }
 */
@localized()
@customElement('measure-collection-detail')
export class MeasureCollectionDetail extends SignalWatcher(LitElement) {

  /**
   * REQUIRED. The hash of the MeasureCollection to show
   */
  @property(hashProperty('measure-collection-hash'))
  measureCollectionHash!: ActionHash;

  /**
   * @internal
   */
  @consume({ context: livingPowerStoreContext, subscribe: true })
  livingPowerStore!: LivingPowerStore;


  async deleteMeasureCollection() {
    try {
      await this.livingPowerStore.client.deleteMeasureCollection(this.measureCollectionHash);
 
      this.dispatchEvent(new CustomEvent('measure-collection-deleted', {
        bubbles: true,
        composed: true,
        detail: {
          measureCollectionHash: this.measureCollectionHash
        }
      }));
    } catch (e: unknown) {
      console.error(e);
      notifyError(msg("Error deleting the measure collection"));
    }
  }

  renderDetail(entryRecord: EntryRecord<MeasureCollection>) {
    return html`
      <sl-card>
      	<div slot="header" class="row" style="gap: 8px">
          <span style="font-size: 18px; flex: 1;">${msg("Measure Collection")}</span>

          <sl-icon-button .src=${wrapPathInSvg(mdiDelete)} @click=${() => this.deleteMeasureCollection()}></sl-icon-button>
        </div>

        <div class="column" style="gap: 16px;">
  
          <div class="column" style="gap: 8px;">
	        <span><strong>${msg("External Resistor Ohms")}</strong></span>
 	        <span style="white-space: pre-line">${ entryRecord.entry.external_resistor_ohms }</span>
	  </div>

      </div>
      </sl-card>
    `;
  }
  
  render() {
    const measureCollection = this.livingPowerStore.measureCollections.get(this.measureCollectionHash).entry.get();

    switch (measureCollection.status) {
      case 'pending': 
        return html`<div
          style="display: flex; flex-direction: column; align-items: center; justify-content: center; flex: 1;"
        >
          <sl-spinner style="font-size: 2rem;"></sl-spinner>
        </div>`;
      case 'error': 
        return html`<display-error
          .headline=${msg("Error fetching the measure collection")}
          .error=${ measureCollection.error}
        ></display-error>`;
      case 'completed':
          return this.renderDetail(measureCollection.value);
    }
  }
  
  static styles = appStyles;
}
