import { LitElement, html } from 'lit';
import { state, property, customElement } from 'lit/decorators.js';
import { EntryHash, Record, ActionHash } from '@holochain/client';
import { EntryRecord } from '@holochain-open-dev/utils';
import { SignalWatcher } from '@holochain-open-dev/signals';
import { hashProperty } from '@holochain-open-dev/elements';
import { consume } from '@lit/context';

import { localized, msg } from '@lit/localize';


import '@shoelace-style/shoelace/dist/components/spinner/spinner.js';
import '@holochain-open-dev/elements/dist/elements/display-error.js';
import '@shoelace-style/shoelace/dist/components/card/card.js';
import { appStyles } from '../../../app-styles.js';
import { LivingPowerStore } from '../living-power-store.js';
import { livingPowerStoreContext } from '../context.js';
import { MeasureCollection } from '../types.js';

/**
 * @element measure-collection-summary
 * @fires measure-collection-selected: detail will contain { measureCollectionHash }
 */
@localized()
@customElement('measure-collection-summary')
export class MeasureCollectionSummary extends SignalWatcher(LitElement) {

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

  renderSummary(entryRecord: EntryRecord<MeasureCollection>) {
    return html`
      <div class="column" style="gap: 16px;">

        <div class="column" style="gap: 8px">
          <span><strong>${msg("External Resistor Ohms")}</strong></span>
          <span style="white-space: pre-line">${ entryRecord.entry.external_resistor_ohms }</span>
        </div>

      </div>
    `;
  }
  
  renderMeasureCollection() {
    const measureCollection = this.livingPowerStore.measureCollections.get(this.measureCollectionHash).entry.get();

    switch (measureCollection.status) {
      case 'pending':
        return html`<div style="display: flex; flex-direction: column; align-items: center; justify-content: center; flex: 1;"
        >
          <sl-spinner style="font-size: 2rem;"></sl-spinner>
        </div>`;
      case 'error':
        return html`<display-error
          .headline=${msg("Error fetching the measure collection")}
          .error=${ measureCollection.error}
        ></display-error>`;
      case 'completed':
        return this.renderSummary(measureCollection.value);
    }
  }
  
  render() {
    return html`<sl-card style="flex: 1; cursor: grab;" @click=${() => this.dispatchEvent(new CustomEvent('measure-collection-selected', {
      composed: true,
      bubbles: true,
      detail: {
        measureCollectionHash: this.measureCollectionHash
      }
    }))}>
      ${this.renderMeasureCollection()}
    </sl-card>`;
  }

  
  static styles = appStyles;
}
