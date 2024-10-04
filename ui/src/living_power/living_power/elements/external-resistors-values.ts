import { wrapPathInSvg } from '@holochain-open-dev/elements';
import { SignalWatcher, joinAsync } from '@holochain-open-dev/signals';
import { EntryRecord } from '@holochain-open-dev/utils';
import { ActionHash } from '@holochain/client';
import { consume } from '@lit/context';
import { msg, str } from '@lit/localize';
import { mdiAlert, mdiInformationOutline } from '@mdi/js';
import { SlInput } from '@shoelace-style/shoelace';
import '@shoelace-style/shoelace/dist/components/spinner/spinner.js';
import {
	DateTimePicker,
	DateTimePickerChangeEvent,
} from '@vaadin/date-time-picker';
import '@vaadin/date-time-picker/theme/material/vaadin-date-time-picker.js';
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

interface MissingResistorsValueTimeSlot {
	from: number;
	to: number;
	measurementCount: number;
}

export function missingResistorValuesTimeSlots(
	measurements: Measurement[],
	externalResistorsValues: Array<ExternalResistorValue>,
): Array<MissingResistorsValueTimeSlot> {
	const missingResistorMeasurements = measurements.filter(
		m =>
			!externalResistorsValues.find(
				erv => erv.from <= m.timestamp && erv.to >= m.timestamp,
			),
	);
	console.log(missingResistorMeasurements);
	//

	const aggregated = (
		missingResistorMeasurements.map(m => ({
			type: 'measurement' as const,
			timestamp: m.timestamp,
		})) as Array<{
			type: 'measurement' | 'external-resistor-value';
			timestamp: number;
		}>
	)
		.concat(
			externalResistorsValues.map(erv => ({
				type: 'external-resistor-value' as const,
				timestamp: erv.from,
			})),
		)
		.sort((a, b) => a.timestamp - b.timestamp);

	const missingTimeSlots: Array<MissingResistorsValueTimeSlot> = [];
	let currentTimeSlot: MissingResistorsValueTimeSlot | undefined;

	for (const item of aggregated) {
		if (item.type === 'measurement') {
			if (!currentTimeSlot) {
				currentTimeSlot = {
					from: item.timestamp,
					to: item.timestamp,
					measurementCount: 1,
				};
			} else {
				currentTimeSlot.to = item.timestamp;
				currentTimeSlot.measurementCount += 1;
			}
		} else {
			if (currentTimeSlot) {
				missingTimeSlots.push(currentTimeSlot);
				currentTimeSlot = undefined;
			}
		}
	}
	if (currentTimeSlot) {
		missingTimeSlots.push(currentTimeSlot);
	}
	return missingTimeSlots;
}

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

		const missingTimeSlots = missingResistorValuesTimeSlots(
			allMeasurements,
			externalResistorsValues.map(([_, value]) => value),
		);
		const aggregated = (
			missingTimeSlots as Array<
				| MissingResistorsValueTimeSlot
				| (ExternalResistorValue & { create_link_action_hash: ActionHash })
			>
		).concat(
			externalResistorsValues.map(([h, v]) => ({
				...v,
				create_link_action_hash: h,
			})),
		);

		const sortedValues = aggregated.sort((a, b) => a.from - b.from);

		return html`<sl-card style="flex: 1"
			><div class="column" style="gap: 24px; flex: 1">
				${sortedValues.length === 0
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
					: sortedValues.map(
							(timeSlot, i) => html`
								<div class="row" style="gap: 12px; align-items: center">
									<vaadin-date-time-picker
										id="from-${i}"
										.value=${new Date(timeSlot.from / 1000)
											.toISOString()
											.slice(0, 23)}
										step="1"
										@change=${async (event: DateTimePickerChangeEvent) => {
											const startTime = new Date(
												`${event.target.value}Z`,
											).valueOf();
											const endTime = new Date(
												`${
													(
														this.shadowRoot!.getElementById(
															`to-${i}`,
														) as DateTimePicker
													).value
												}Z`,
											).valueOf();

											const ohms = (timeSlot as ExternalResistorValue)
												.external_resistor_value_ohms;
											if (ohms && startTime < endTime) {
												const actionHash = (
													timeSlot as ExternalResistorValue & {
														create_link_action_hash: ActionHash;
													}
												).create_link_action_hash;

												await this.livingPowerStore.client.setExternalResistorValue(
													this.arduinoSerialNumber,
													startTime * 1000,
													endTime * 1000,
													ohms,
													actionHash,
												);
											}
										}}
									>
									</vaadin-date-time-picker>
									<span>${msg('to')}</span>
									<vaadin-date-time-picker
										id="to-${i}"
										.value=${new Date(timeSlot.to / 1000)
											.toISOString()
											.slice(0, 23)}
										step="1"
										@change=${async (event: DateTimePickerChangeEvent) => {
											const startTime = new Date(
												`${
													(
														this.shadowRoot!.getElementById(
															`from-${i}`,
														) as DateTimePicker
													).value
												}Z`,
											).valueOf();
											const endTime = new Date(
												`${event.target.value}Z`,
											).valueOf();

											const ohms = (timeSlot as ExternalResistorValue)
												.external_resistor_value_ohms;
											if (ohms && startTime < endTime) {
												const actionHash = (
													timeSlot as ExternalResistorValue & {
														create_link_action_hash: ActionHash;
													}
												).create_link_action_hash;

												await this.livingPowerStore.client.setExternalResistorValue(
													this.arduinoSerialNumber,
													startTime * 1000,
													endTime * 1000,
													ohms,
													actionHash,
												);
											}
										}}
									>
									</vaadin-date-time-picker>

									<sl-input
										type="number"
										step="1"
										min="1"
										.placeholder=${(timeSlot as MissingResistorsValueTimeSlot)
											.measurementCount
											? msg('Missing')
											: ''}
										.value=${(timeSlot as ExternalResistorValue)
											.external_resistor_value_ohms
											? (timeSlot as ExternalResistorValue)
													.external_resistor_value_ohms
											: ''}
										style="width: 10em"
										@sl-input=${async (e: CustomEvent) => {
											const value = (e.target as SlInput).value;
											const ohms = parseInt(value);

											const actionHash = (
												timeSlot as ExternalResistorValue & {
													create_link_action_hash: ActionHash;
												}
											).create_link_action_hash;
											const startTime = new Date(
												`${
													(
														this.shadowRoot!.getElementById(
															`from-${i}`,
														) as DateTimePicker
													).value
												}Z`,
											).valueOf();
											const endTime = new Date(
												`${
													(
														this.shadowRoot!.getElementById(
															`to-${i}`,
														) as DateTimePicker
													).value
												}Z`,
											).valueOf();
											console.log(startTime, endTime, timeSlot);

											await this.livingPowerStore.client.setExternalResistorValue(
												this.arduinoSerialNumber,
												startTime * 1000,
												endTime * 1000,
												ohms,
												actionHash,
											);
										}}
									>
										${(timeSlot as ExternalResistorValue)
											.external_resistor_value_ohms
											? html` <span slot="suffix">${msg('Ohms')}</span> `
											: html`<sl-icon
													.src=${wrapPathInSvg(mdiAlert)}
													slot="prefix"
												></sl-icon>`}
									</sl-input>

									${(timeSlot as MissingResistorsValueTimeSlot).measurementCount
										? html`
												<span class="placeholder"
													>${msg(
														str`${(timeSlot as MissingResistorsValueTimeSlot).measurementCount} measurements`,
													)}</span
												>
											`
										: html``}
								</div>
							`,
						)}
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
