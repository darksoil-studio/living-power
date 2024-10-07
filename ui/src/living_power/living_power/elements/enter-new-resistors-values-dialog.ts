import { wrapPathInSvg } from '@holochain-open-dev/elements';
import { SignalWatcher } from '@holochain-open-dev/signals';
import { consume } from '@lit/context';
import { msg, str } from '@lit/localize';
import { mdiAlertCircle } from '@mdi/js';
import { SlDialog, SlInput } from '@shoelace-style/shoelace';
import { LitElement, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

import { appStyles } from '../../../app-styles.js';
import { livingPowerStoreContext } from '../context.js';
import { LivingPowerStore } from '../living-power-store.js';
import { ExternalResistorValue, Measurement } from '../types.js';
import './external-resistors-values-form.js';
import { ExternalResistorsValuesForm } from './external-resistors-values-form.js';

// ${repeat(
// 						sortedValues,
// 						key => `${key.from}${key.to}`,
// 						(timeSlot, i) => {
// 							const measurementCount = this.newMeasurements.filter(
// 								m => timeSlot.from <= m.timestamp && m.timestamp <= timeSlot.to,
// 							).length;
// 							return html`
// 								<div class="row" style="gap: 12px; align-items: center">
// 									<vaadin-date-time-picker
// 										style="height: 48px; width: 16em"
// 										.value=${new Date(timeSlot.from / 1000)
// 											.toISOString()
// 											.slice(0, 23)}
// 										.min=${this.fromMinDate(sortedValues, i)
// 											? new Date(this.fromMinDate(sortedValues, i)! / 1000)
// 													.toISOString()
// 													.slice(0, 23)
// 											: ''}
// 										.max=${this.toDateTimePicker(i)?.value}
// 										step="1"
// 										@change=${async (event: DateTimePickerChangeEvent) => {
// 											const startTime = new Date(
// 												`${event.target.value}Z`,
// 											).valueOf();
// 											const endTime = new Date(
// 												`${this.toDateTimePicker(i).value}Z`,
// 											).valueOf();

// 											const ohms = (timeSlot as ExternalResistorValue)
// 												.external_resistor_value_ohms;
// 											if (
// 												ohms &&
// 												this.formError(sortedValues, i) === undefined
// 											) {
// 												this.externalResistorsValues[(timeSlot as any).index] =
// 													{
// 														from: startTime * 1000,
// 														to: endTime * 1000,
// 														external_resistor_value_ohms: ohms,
// 													};
// 											}
// 											this.requestUpdate();
// 										}}
// 										.errorMessage=${this.formErrorFrom(sortedValues, i)}
// 									>
// 									</vaadin-date-time-picker>
// 									<span>${msg('to')}</span>
// 									<vaadin-date-time-picker
// 										style="height: 48px; width: 16em"
// 										.value=${new Date(timeSlot.to / 1000)
// 											.toISOString()
// 											.slice(0, 23)}
// 										step="1"
// 										.min=${this.fromDateTimePicker(i)?.value}
// 										.max=${this.toMaxDate(sortedValues, i)
// 											? new Date(this.toMaxDate(sortedValues, i)! / 1000)
// 													.toISOString()
// 													.slice(0, 23)
// 											: ''}
// 										@change=${async (event: DateTimePickerChangeEvent) => {
// 											const startTime = new Date(
// 												`${this.fromDateTimePicker(i).value}Z`,
// 											).valueOf();
// 											const endTime = new Date(
// 												`${event.target.value}Z`,
// 											).valueOf();

// 											const ohms = (timeSlot as ExternalResistorValue)
// 												.external_resistor_value_ohms;
// 											console.log(ohms);
// 											if (
// 												ohms &&
// 												this.formError(sortedValues, i) === undefined
// 											) {
// 												this.externalResistorsValues[(timeSlot as any).index] =
// 													{
// 														from: startTime * 1000,
// 														to: endTime * 1000,
// 														external_resistor_value_ohms: ohms,
// 													};
// 											}
// 											this.requestUpdate();
// 										}}
// 										.errorMessage=${this.formErrorTo(sortedValues, i)}
// 									>
// 									</vaadin-date-time-picker>

// 									<sl-input
// 										type="number"
// 										step="1"
// 										min="1"
// 										.placeholder=${(timeSlot as MissingResistorsValueTimeSlot)
// 											.measurementCount
// 											? msg('Missing')
// 											: ''}
// 										.value=${(timeSlot as ExternalResistorValue)
// 											.external_resistor_value_ohms
// 											? (timeSlot as ExternalResistorValue)
// 													.external_resistor_value_ohms
// 											: ''}
// 										style="width: 10em"
// 										@sl-input=${async (e: CustomEvent) => {
// 											const value = (e.target as SlInput).value;
// 											const ohms = parseInt(value);

// 											const startTime = new Date(
// 												`${this.fromDateTimePicker(i).value}Z`,
// 											).valueOf();
// 											const endTime = new Date(
// 												`${this.toDateTimePicker(i).value}Z`,
// 											).valueOf();

// 											if (this.formError(sortedValues, i) === undefined) {
// 												const resistorsArrayIndex = (timeSlot as any).index;
// 												const value = {
// 													from: startTime * 1000,
// 													to: endTime * 1000,
// 													external_resistor_value_ohms: ohms,
// 												};
// 												if (!resistorsArrayIndex) {
// 													this.externalResistorsValues.push(value);
// 												} else {
// 													this.externalResistorsValues[resistorsArrayIndex] =
// 														value;
// 												}
// 											}
// 											this.requestUpdate();
// 										}}
// 									>
// 										${(timeSlot as ExternalResistorValue)
// 											.external_resistor_value_ohms
// 											? html` <span slot="suffix">${msg('Ohms')}</span> `
// 											: html``}
// 									</sl-input>

// 									<span class="placeholder"
// 										>${measurementCount === 1
// 											? msg(str`${measurementCount} measurement`)
// 											: msg(str`${measurementCount} measurements`)}</span
// 									>
// 									${this.formError(sortedValues, i)
// 										? html`<sl-icon
// 												.src=${wrapPathInSvg(mdiAlertCircle)}
// 												style="color: red; font-size: 24px"
// 											></sl-icon>`
// 										: html``}
// 								</div>
// 							`;
// 						},
// 					)}
@customElement('enter-new-resistors-values-dialog')
export class EnterNewResistorsValuesDialog extends SignalWatcher(LitElement) {
	@property()
	arduinoSerialNumber!: string;

	@property()
	newMeasurements!: Measurement[];

	@state()
	externalResistorsValues: Array<ExternalResistorValue> = [];

	@state()
	committing = false;

	/**
	 * @internal
	 */
	@consume({ context: livingPowerStoreContext, subscribe: true })
	livingPowerStore!: LivingPowerStore;

	firstUpdated() {
		const dialog = this.shadowRoot!.querySelector('sl-dialog') as SlDialog;
		dialog.show();
	}

	// fromDateTimePicker(index: number) {
	// 	const allpickers = Array.from(
	// 		this.shadowRoot!.querySelectorAll('vaadin-date-time-picker'),
	// 	);
	// 	return allpickers[index * 2];
	// }

	// toDateTimePicker(index: number) {
	// 	const allpickers = Array.from(
	// 		this.shadowRoot!.querySelectorAll('vaadin-date-time-picker'),
	// 	);
	// 	return allpickers[index * 2 + 1];
	// }

	// fromMinDate(
	// 	allTimeSlots: Array<MissingResistorsValueTimeSlot | ExternalResistorValue>,
	// 	index: number,
	// ): number | undefined {
	// 	for (let i = index - 1; i >= 0; i--) {
	// 		const timeSlot = allTimeSlots[i];
	// 		if ((timeSlot as ExternalResistorValue).external_resistor_value_ohms) {
	// 			return timeSlot.to;
	// 		}
	// 	}
	// 	return undefined;
	// }

	// toMaxDate(
	// 	allTimeSlots: Array<MissingResistorsValueTimeSlot | ExternalResistorValue>,
	// 	index: number,
	// ): number | undefined {
	// 	for (let i = index + 1; i < allTimeSlots.length; i++) {
	// 		const timeSlot = allTimeSlots[i];
	// 		if ((timeSlot as ExternalResistorValue).external_resistor_value_ohms) {
	// 			return timeSlot.from;
	// 		}
	// 	}
	// 	return undefined;
	// }

	// formErrorFrom(
	// 	allTimeSlots: Array<MissingResistorsValueTimeSlot | ExternalResistorValue>,
	// 	index: number,
	// ): string | undefined {
	// 	const fromPicker = this.fromDateTimePicker(index);
	// 	const toPicker = this.toDateTimePicker(index);

	// 	if (!fromPicker || !toPicker) return undefined;
	// 	if (fromPicker.value === '') return msg('Invalid Date.');
	// 	try {
	// 		const startTime = new Date(`${fromPicker.value}Z`).valueOf();
	// 		const endTime = new Date(`${toPicker.value}Z`).valueOf();

	// 		if (endTime < startTime) return msg('Start time is after end time.');

	// 		if (index > 0) {
	// 			const minDate = this.fromMinDate(allTimeSlots, index);
	// 			if (minDate && startTime < minDate / 1000)
	// 				return msg(
	// 					'Start time is before the end time of the previous time slot.',
	// 				);
	// 		}

	// 		return undefined;
	// 	} catch (e: any) {
	// 		return e.toString();
	// 	}
	// }

	// formErrorTo(
	// 	allTimeSlots: Array<MissingResistorsValueTimeSlot | ExternalResistorValue>,
	// 	index: number,
	// ): string | undefined {
	// 	const toPicker = this.toDateTimePicker(index);

	// 	if (!toPicker) return undefined;
	// 	if (toPicker.value === '') return msg('Invalid Date.');
	// 	try {
	// 		const endTime = new Date(`${toPicker.value}Z`).valueOf();

	// 		if (index < allTimeSlots.length - 1) {
	// 			const toMax = this.toMaxDate(allTimeSlots, index);
	// 			if (toMax && endTime > toMax / 1000)
	// 				return msg('End time is after the start time of the next time slot.');
	// 		}
	// 		return undefined;
	// 	} catch (e: any) {
	// 		return e.toString();
	// 	}
	// }

	// formError(
	// 	allTimeSlots: Array<MissingResistorsValueTimeSlot | ExternalResistorValue>,
	// 	index: number,
	// ): string | undefined {
	// 	const fromError = this.formErrorFrom(allTimeSlots, index);
	// 	if (fromError) return fromError;
	// 	const toError = this.formErrorTo(allTimeSlots, index);
	// 	if (toError) return toError;

	// 	return undefined;
	// }

	render() {
		return html`
			<sl-dialog
				.label=${msg('Enter External Resistors Values')}
				style="--width: ''"
			>
				<div class="column" style="gap: 12px">
					<span
						>${msg('New measurements were found for this BPV device.')}</span
					>
					<span
						>${msg(
							'Please enter below the Ohms for the external resistor for the new measurements:',
						)}</span
					>

					<external-resistors-values-form
						.measurements=${this.newMeasurements}
						.externalResistorsValues=${this.externalResistorsValues}
						@set-external-resistor-value=${async (e: CustomEvent) => {
							const index = e.detail.existingExternalResistorValueToEdit;
							const value = {
								from: e.detail.from,
								to: e.detail.to,
								external_resistor_value_ohms: e.detail.externalResistorValue,
							};
							if (index !== undefined && this.externalResistorsValues[index]) {
								this.externalResistorsValues =
									this.externalResistorsValues.filter((_, i) => i !== index);
							}
							this.externalResistorsValues = [
								...this.externalResistorsValues,
								value,
							];
							setTimeout(() => {
								this.requestUpdate();
							}, 1);
							// const actionHash =
							// 	externalResistorsValues[
							// 	][0];

							// await this.livingPowerStore.client.setExternalResistorValue(
							// 	this.arduinoSerialNumber,
							// 	e.detail.from,
							// 	e.detail.to,
							// 	e.detail.externalResistorValue,
							// 	actionHash,
							// );
						}}
						@change=${() => this.requestUpdate()}
						@sl-input=${() => this.requestUpdate()}
					>
					</external-resistors-values-form>
				</div>

				<sl-button
					slot="footer"
					.disabled=${this.committing ||
					(this.shadowRoot!.querySelector(
						'external-resistors-values-form',
					) as ExternalResistorsValuesForm)
						? !(
								this.shadowRoot!.querySelector(
									'external-resistors-values-form',
								) as ExternalResistorsValuesForm
							).valid
						: true}
					.loading=${this.committing}
					variant="primary"
					@click=${async () => {
						for (const timeSlot of this.externalResistorsValues) {
							await this.livingPowerStore.client.setExternalResistorValue(
								this.arduinoSerialNumber,
								timeSlot.from,
								timeSlot.to,
								(timeSlot as ExternalResistorValue)
									.external_resistor_value_ohms,
								undefined,
							);
						}
						(this.shadowRoot!.querySelector('sl-dialog') as SlDialog).hide();
					}}
					>${msg('Save External Resistors Values')}</sl-button
				>
			</sl-dialog>
		`;
	}

	static styles = [...appStyles];
}
