import { wrapPathInSvg } from '@holochain-open-dev/elements';
import { SignalWatcher, joinAsync } from '@holochain-open-dev/signals';
import { EntryRecord } from '@holochain-open-dev/utils';
import { ActionHash } from '@holochain/client';
import { consume } from '@lit/context';
import { msg, str } from '@lit/localize';
import { mdiAlert, mdiAlertCircle, mdiInformationOutline } from '@mdi/js';
import { SlInput } from '@shoelace-style/shoelace';
import '@shoelace-style/shoelace/dist/components/spinner/spinner.js';
import {
	DateTimePicker,
	DateTimePickerChangeEvent,
} from '@vaadin/date-time-picker';
import { LitElement, css, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';

import { appStyles } from '../../../app-styles.js';
import { livingPowerStoreContext } from '../context.js';
import { LivingPowerStore } from '../living-power-store.js';
import {
	ExternalResistorValue,
	Measurement,
	MeasurementCollection,
} from '../types.js';
import './external-resistors-values-form.js';

//   sortedValues.map(
// (timeSlot, i) => html`
// 	<div class="row" style="gap: 12px; align-items: center">
// 		<vaadin-date-time-picker
// 			style="height: 48px"
// 			id="from-${i}"
// 			.value=${new Date(timeSlot.from / 1000)
// 				.toISOString()
// 				.slice(0, 23)}
// 			.min=${this.fromMinDate(sortedValues, i)
// 				? new Date(this.fromMinDate(sortedValues, i)! / 1000)
// 						.toISOString()
// 						.slice(0, 23)
// 				: ''}
// 			.max=${(
// 				this.shadowRoot!.getElementById(
// 					`to-${i}`,
// 				) as DateTimePicker
// 			)?.value}
// 			step="1"
// 			@change=${async (event: DateTimePickerChangeEvent) => {
// 				const startTime = new Date(
// 					`${event.target.value}Z`,
// 				).valueOf();
// 				const endTime = new Date(
// 					`${
// 						(
// 							this.shadowRoot!.getElementById(
// 								`to-${i}`,
// 							) as DateTimePicker
// 						).value
// 					}Z`,
// 				).valueOf();

// 				const ohms = (timeSlot as ExternalResistorValue)
// 					.external_resistor_value_ohms;
// 				if (
// 					ohms &&
// 					this.formError(sortedValues, i) === undefined
// 				) {
// 					const actionHash = (
// 						timeSlot as ExternalResistorValue & {
// 							create_link_action_hash: ActionHash;
// 						}
// 					).create_link_action_hash;

// 					await this.livingPowerStore.client.setExternalResistorValue(
// 						this.arduinoSerialNumber,
// 						startTime * 1000,
// 						endTime * 1000,
// 						ohms,
// 						actionHash,
// 					);
// 				}
// 				this.requestUpdate();
// 			}}
// 			.errorMessage=${this.formErrorFrom(sortedValues, i)}
// 		>
// 		</vaadin-date-time-picker>
// 		<span>${msg('to')}</span>
// 		<vaadin-date-time-picker
// 			style="height: 48px"
// 			id="to-${i}"
// 			.value=${new Date(timeSlot.to / 1000)
// 				.toISOString()
// 				.slice(0, 23)}
// 			step="1"
// 			.min=${(
// 				this.shadowRoot!.getElementById(
// 					`from-${i}`,
// 				) as DateTimePicker
// 			)?.value}
// 			.max=${this.toMaxDate(sortedValues, i)
// 				? new Date(this.toMaxDate(sortedValues, i)! / 1000)
// 						.toISOString()
// 						.slice(0, 23)
// 				: ''}
// 			@change=${async (event: DateTimePickerChangeEvent) => {
// 				const startTime = new Date(
// 					`${
// 						(
// 							this.shadowRoot!.getElementById(
// 								`from-${i}`,
// 							) as DateTimePicker
// 						).value
// 					}Z`,
// 				).valueOf();
// 				const endTime = new Date(
// 					`${event.target.value}Z`,
// 				).valueOf();

// 				const ohms = (timeSlot as ExternalResistorValue)
// 					.external_resistor_value_ohms;
// 				if (
// 					ohms &&
// 					this.formError(sortedValues, i) === undefined
// 				) {
// 					const actionHash = (
// 						timeSlot as ExternalResistorValue & {
// 							create_link_action_hash: ActionHash;
// 						}
// 					).create_link_action_hash;

// 					await this.livingPowerStore.client.setExternalResistorValue(
// 						this.arduinoSerialNumber,
// 						startTime * 1000,
// 						endTime * 1000,
// 						ohms,
// 						actionHash,
// 					);
// 				}
// 				this.requestUpdate();
// 			}}
// 			.errorMessage=${this.formErrorTo(sortedValues, i)}
// 		>
// 		</vaadin-date-time-picker>

// 		<sl-input
// 			type="number"
// 			step="1"
// 			min="1"
// 			.placeholder=${(timeSlot as MissingResistorsValueTimeSlot)
// 				.measurementCount
// 				? msg('Missing')
// 				: ''}
// 			.value=${(timeSlot as ExternalResistorValue)
// 				.external_resistor_value_ohms
// 				? (timeSlot as ExternalResistorValue)
// 						.external_resistor_value_ohms
// 				: ''}
// 			style="width: 10em"
// 			@sl-input=${async (e: CustomEvent) => {
// 				const value = (e.target as SlInput).value;
// 				const ohms = parseInt(value);

// 				const actionHash = (
// 					timeSlot as ExternalResistorValue & {
// 						create_link_action_hash: ActionHash;
// 					}
// 				).create_link_action_hash;
// 				const startTime = new Date(
// 					`${
// 						(
// 							this.shadowRoot!.getElementById(
// 								`from-${i}`,
// 							) as DateTimePicker
// 						).value
// 					}Z`,
// 				).valueOf();
// 				const endTime = new Date(
// 					`${
// 						(
// 							this.shadowRoot!.getElementById(
// 								`to-${i}`,
// 							) as DateTimePicker
// 						).value
// 					}Z`,
// 				).valueOf();

// 				if (this.formError(sortedValues, i) === undefined) {
// 					await this.livingPowerStore.client.setExternalResistorValue(
// 						this.arduinoSerialNumber,
// 						startTime * 1000,
// 						endTime * 1000,
// 						ohms,
// 						actionHash,
// 					);
// 				}
// 			}}
// 		>
// 			${(timeSlot as ExternalResistorValue)
// 				.external_resistor_value_ohms
// 				? html` <span slot="suffix">${msg('Ohms')}</span> `
// 				: html``}
// 		</sl-input>

// 		${(timeSlot as MissingResistorsValueTimeSlot).measurementCount
// 			? html`
// 					<span class="placeholder"
// 						>${(timeSlot as MissingResistorsValueTimeSlot)
// 							.measurementCount === 1
// 							? msg(
// 									str`${(timeSlot as MissingResistorsValueTimeSlot).measurementCount} measurement`,
// 								)
// 							: msg(
// 									str`${(timeSlot as MissingResistorsValueTimeSlot).measurementCount} measurements`,
// 								)}</span
// 					>
// 				`
// 			: html``}
// 		${this.formError(sortedValues, i)
// 			? html`<sl-icon
// 					.src=${wrapPathInSvg(mdiAlertCircle)}
// 					style="color: red; font-size: 24px"
// 				></sl-icon>`
// 			: html``}
// 	</div>
// `,

@customElement('external-resistors-values')
export class ExternalResistorsValues extends SignalWatcher(LitElement) {
	@property()
	arduinoSerialNumber!: string;

	/**
	 * @internal
	 */
	@consume({ context: livingPowerStoreContext, subscribe: true })
	livingPowerStore!: LivingPowerStore;

	renderExternalResistorsValues(
		externalResistorsValues: Array<[ActionHash, ExternalResistorValue]>,
		measurementsCollections: Array<EntryRecord<MeasurementCollection>>,
	) {
		const allMeasurements = ([] as Measurement[]).concat(
			...measurementsCollections.map(m => m.entry.measurements),
		);

		return html`<sl-card style="flex: 1"
			><div class="column" style="gap: 24px; flex: 1">
				<span
					>${msg(
						'Enter here the values of the external resistor for each of the time slots for which there are measurements.',
					)}</span
				>
				${allMeasurements.length === 0
					? html`
							<div
								class="column"
								style="flex: 1; align-self: center; justify-self: center; align-items: center; justify-content: center; gap: 12px"
							>
								<sl-icon
									.src=${wrapPathInSvg(mdiInformationOutline)}
									style="font-size: 64px;"
									class="placeholder"
								></sl-icon>
								<span class="placeholder"
									>${msg('No measurements found for this BPV device.')}</span
								>
							</div>
						`
					: html`
							<external-resistors-values-form
								.measurements=${allMeasurements}
								.externalResistorsValues=${externalResistorsValues.map(
									([_, v]) => v,
								)}
								@set-external-resistor-value=${async (e: CustomEvent) => {
									const actionHash =
										e.detail.existingExternalResistorValueToEdit !== undefined
											? externalResistorsValues[
													e.detail.existingExternalResistorValueToEdit
												][0]
											: undefined;
									await this.livingPowerStore.client.setExternalResistorValue(
										this.arduinoSerialNumber,
										e.detail.from,
										e.detail.to,
										e.detail.externalResistorValue,
										actionHash,
									);
								}}
							>
							</external-resistors-values-form>
						`}
			</div>
		</sl-card>`;
	}

	allMeasurementsAndResistors() {
		const allMeasurements = this.livingPowerStore.bpvDevices
			.get(this.arduinoSerialNumber)
			.measurementCollections.live.get();
		const externalResistorsValues = this.livingPowerStore.bpvDevices
			.get(this.arduinoSerialNumber)
			.externalResistorValues.get();
		if (allMeasurements.status !== 'completed') return allMeasurements;

		const allMeasurementsEntries = joinAsync(
			Array.from(allMeasurements.value.values()).map(mc => mc.entry.get()),
		);
		if (allMeasurementsEntries.status !== 'completed')
			return allMeasurementsEntries;
		if (externalResistorsValues.status !== 'completed')
			return externalResistorsValues;

		return {
			status: 'completed' as const,
			value: {
				measurements: allMeasurementsEntries.value,
				externalResistors: externalResistorsValues.value,
			},
		};
	}

	render() {
		const result = this.allMeasurementsAndResistors();

		switch (result.status) {
			case 'pending':
				return html`<div
					style="display: flex; flex-direction: column; align-items: center; justify-content: center; flex: 1;"
				>
					<sl-spinner style="font-size: 2rem;"></sl-spinner>
				</div>`;
			case 'error':
				return html`<display-error
					.headline=${msg(
						'Error fetching the external resistors values for this BPV device.',
					)}
					.error=${result.error}
				></display-error>`;
			case 'completed':
				return this.renderExternalResistorsValues(
					result.value.externalResistors,
					result.value.measurements,
				);
		}
	}

	static styles = [
		...appStyles,
		css`
			:host {
				display: flex;
			}
		`,
	];
}
