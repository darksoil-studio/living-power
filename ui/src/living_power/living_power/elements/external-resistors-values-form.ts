import { wrapPathInSvg } from '@holochain-open-dev/elements';
import { SignalWatcher } from '@holochain-open-dev/signals';
import { msg, str } from '@lit/localize';
import { mdiAlertCircle } from '@mdi/js';
import { SlInput } from '@shoelace-style/shoelace';
import {
	DateTimePicker,
	DateTimePickerChangeEvent,
} from '@vaadin/date-time-picker';
import '@vaadin/date-time-picker/theme/material/vaadin-date-time-picker.js';
import { LitElement, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { keyed } from 'lit/directives/keyed.js';
import { live } from 'lit/directives/live.js';

import { appStyles } from '../../../app-styles';
import { ExternalResistorValue, Measurement } from '../types';

export interface MissingResistorsValueTimeSlot {
	from: number;
	to: number;
}

export function missingResistorValuesTimeSlots(
	measurements: Measurement[],
	externalResistorsValues: Array<ExternalResistorValue>,
	customMissingTimeSlot: MissingResistorsValueTimeSlot | undefined,
): Array<MissingResistorsValueTimeSlot> {
	const missingResistorMeasurements = measurements
		.filter(
			m =>
				!externalResistorsValues.find(
					erv => erv.from <= m.timestamp && erv.to >= m.timestamp,
				),
		)
		.filter(
			m =>
				!customMissingTimeSlot ||
				!(
					customMissingTimeSlot.from <= m.timestamp &&
					m.timestamp <= customMissingTimeSlot.to
				),
		);

	const aggregated = (
		missingResistorMeasurements.map(m => ({
			type: 'measurement' as const,
			timestamp: m.timestamp,
		})) as Array<{
			type:
				| 'measurement'
				| 'external-resistor-value'
				| 'custom-missing-time-slot';
			timestamp: number;
			to?: number;
		}>
	)
		.concat(
			externalResistorsValues.map(erv => ({
				type: 'external-resistor-value' as const,
				timestamp: erv.from,
			})),
		)
		.concat(
			customMissingTimeSlot
				? [
						{
							type: 'custom-missing-time-slot' as const,
							timestamp: customMissingTimeSlot.from,
							to: customMissingTimeSlot.to,
						},
					]
				: [],
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
				};
			} else {
				currentTimeSlot.to = item.timestamp;
			}
		} else if (item.type === 'external-resistor-value') {
			if (currentTimeSlot) {
				missingTimeSlots.push(currentTimeSlot);
				currentTimeSlot = undefined;
			}
		} else if (item.type === 'custom-missing-time-slot') {
			if (currentTimeSlot) {
				missingTimeSlots.push(currentTimeSlot);
				currentTimeSlot = undefined;
			}
			missingTimeSlots.push({
				from: item.timestamp,
				to: item.to!,
			});
		}
	}
	if (currentTimeSlot) {
		missingTimeSlots.push(currentTimeSlot);
	}

	return missingTimeSlots.filter(ts =>
		measurements.find(m => ts.from <= m.timestamp && m.timestamp <= ts.to),
	);
}

type ExternalResistorValueWithIndex = ExternalResistorValue & {
	externalResistorArrayIndex: number;
};

@customElement('external-resistors-values-form')
export class ExternalResistorsValuesForm extends SignalWatcher(LitElement) {
	@property()
	externalResistorsValues!: Array<ExternalResistorValue>;

	@property()
	measurements!: Array<Measurement>;

	@property()
	customMissingTimeSlot: MissingResistorsValueTimeSlot | undefined;

	get valid() {
		const missingTimeSlots = missingResistorValuesTimeSlots(
			this.measurements,
			this.externalResistorsValues,
			this.customMissingTimeSlot,
		);
		const aggregated = (
			missingTimeSlots as Array<
				MissingResistorsValueTimeSlot | ExternalResistorValueWithIndex
			>
		).concat(
			this.externalResistorsValues.map((v, i) => ({
				...v,
				externalResistorArrayIndex: i,
			})),
		);

		const sortedValues = aggregated.sort((a, b) => a.from - b.from);

		return sortedValues.every((v, i) => {
			return (
				(v as ExternalResistorValue).external_resistor_value_ohms !==
					undefined && this.formError(sortedValues, i) === undefined
			);
		});
	}

	fromDateTimePicker(index: number) {
		const allpickers = Array.from(
			this.shadowRoot!.querySelectorAll('vaadin-date-time-picker'),
		);
		return allpickers[index * 2];
	}

	toDateTimePicker(index: number) {
		const allpickers = Array.from(
			this.shadowRoot!.querySelectorAll('vaadin-date-time-picker'),
		);
		return allpickers[index * 2 + 1];
	}

	fromMinDate(
		allTimeSlots: Array<
			MissingResistorsValueTimeSlot | ExternalResistorValueWithIndex
		>,
		index: number,
	): number | undefined {
		for (let i = index - 1; i >= 0; i--) {
			const timeSlot = allTimeSlots[i];
			if ((timeSlot as ExternalResistorValue).external_resistor_value_ohms) {
				return timeSlot.to + 1;
			}
		}
		return undefined;
	}

	toMaxDate(
		allTimeSlots: Array<
			MissingResistorsValueTimeSlot | ExternalResistorValueWithIndex
		>,
		index: number,
	): number | undefined {
		for (let i = index + 1; i < allTimeSlots.length; i++) {
			const timeSlot = allTimeSlots[i];
			if ((timeSlot as ExternalResistorValue).external_resistor_value_ohms) {
				return timeSlot.from - 1;
			}
		}
		return undefined;
	}

	formErrorFrom(
		allTimeSlots: Array<
			MissingResistorsValueTimeSlot | ExternalResistorValueWithIndex
		>,
		index: number,
	): string | undefined {
		const fromPicker = this.fromDateTimePicker(index);
		const toPicker = this.toDateTimePicker(index);

		if (!fromPicker || !toPicker) return undefined;
		try {
			if (fromPicker.value === '') return msg('Invalid Date.');
			const startTime = new Date(`${fromPicker.value}Z`).valueOf();
			const endTime = new Date(`${toPicker.value}Z`).valueOf();

			if (endTime < startTime) return msg('Start time is after end time.');

			if (index > 0) {
				const minDate = this.fromMinDate(allTimeSlots, index);
				if (minDate && startTime < minDate / 1000)
					return msg(
						'Start time is before the end time of the previous time slot.',
					);
			}

			return undefined;
		} catch (e: any) {
			return e.toString();
		}
	}

	formErrorTo(
		allTimeSlots: Array<
			MissingResistorsValueTimeSlot | ExternalResistorValueWithIndex
		>,
		index: number,
	): string | undefined {
		const toPicker = this.toDateTimePicker(index);

		if (!toPicker) return undefined;
		if (toPicker.value === '') return msg('Invalid Date.');
		try {
			const endTime = new Date(`${toPicker.value}Z`).valueOf();

			if (index < allTimeSlots.length - 1) {
				const toMax = this.toMaxDate(allTimeSlots, index);
				if (toMax && endTime > toMax / 1000)
					return msg('End time is after the start time of the next time slot.');
			}
			return undefined;
		} catch (e: any) {
			return e.toString();
		}
	}

	formError(
		allTimeSlots: Array<
			MissingResistorsValueTimeSlot | ExternalResistorValueWithIndex
		>,
		index: number,
	): string | undefined {
		const fromError = this.formErrorFrom(allTimeSlots, index);
		if (fromError) return fromError;
		const toError = this.formErrorTo(allTimeSlots, index);
		if (toError) return toError;

		return undefined;
	}

	renderTimeSlot(
		allTimeSlots: Array<
			MissingResistorsValueTimeSlot | ExternalResistorValueWithIndex
		>,
		i: number,
	) {
		const timeSlot = allTimeSlots[i];

		const measurementCount = this.measurements.filter(
			m => timeSlot.from <= m.timestamp && m.timestamp <= timeSlot.to,
		).length;
		return html` <div class="row" style="gap: 12px; align-items: center">
			<vaadin-date-time-picker
				style="height: 48px; width: 16em"
				.value=${live(
					new Date(timeSlot.from / 1000).toISOString().slice(0, 23),
				)}
				.min=${this.fromMinDate(allTimeSlots, i)
					? new Date(this.fromMinDate(allTimeSlots, i)! / 1000)
							.toISOString()
							.slice(0, 23)
					: ''}
				.max=${this.toDateTimePicker(i)?.value}
				step="1"
				@change=${async (event: DateTimePickerChangeEvent) => {
					const startTime = new Date(`${event.target.value}Z`).valueOf();
					const endTime = new Date(
						`${this.toDateTimePicker(i).value}Z`,
					).valueOf();

					const ohms = (timeSlot as ExternalResistorValue)
						.external_resistor_value_ohms;

					if (ohms) {
						if (this.formError(allTimeSlots, i) === undefined) {
							this.dispatchEvent(
								new CustomEvent('set-external-resistor-value', {
									bubbles: true,
									composed: true,
									detail: {
										from: startTime * 1000,
										to: endTime * 1000,
										externalResistorValue: ohms,
										existingExternalResistorValueToEdit: (
											timeSlot as ExternalResistorValueWithIndex
										).externalResistorArrayIndex,
									},
								}),
							);
						}
					} else {
						if (this.formError(allTimeSlots, i) === undefined) {
							const from = startTime * 1000;
							const to = endTime * 1000;
							this.customMissingTimeSlot = {
								from,
								to,
							};
						}
					}
					this.requestUpdate();
				}}
				.errorMessage=${this.formErrorFrom(allTimeSlots, i)}
			>
			</vaadin-date-time-picker>
			<span>${msg('to')}</span>
			<vaadin-date-time-picker
				style="height: 48px; width: 16em"
				.value=${live(new Date(timeSlot.to / 1000).toISOString().slice(0, 23))}
				step="1"
				.min=${this.fromDateTimePicker(i)?.value}
				.max=${this.toMaxDate(allTimeSlots, i)
					? new Date(this.toMaxDate(allTimeSlots, i)! / 1000)
							.toISOString()
							.slice(0, 23)
					: ''}
				@change=${async (event: DateTimePickerChangeEvent) => {
					const startTime = new Date(
						`${this.fromDateTimePicker(i).value}Z`,
					).valueOf();
					const endTime = new Date(`${event.target.value}Z`).valueOf();

					const ohms = (timeSlot as ExternalResistorValue)
						.external_resistor_value_ohms;
					if (ohms) {
						if (this.formError(allTimeSlots, i) === undefined) {
							this.dispatchEvent(
								new CustomEvent('set-external-resistor-value', {
									bubbles: true,
									composed: true,
									detail: {
										from: startTime * 1000,
										to: endTime * 1000,
										externalResistorValue: ohms,
										existingExternalResistorValueToEdit: (
											timeSlot as ExternalResistorValueWithIndex
										).externalResistorArrayIndex,
									},
								}),
							);
						}
					} else {
						const from = startTime * 1000;
						const to = endTime * 1000;
						this.customMissingTimeSlot = {
							from,
							to,
						};
					}
					setTimeout(() => {
						this.requestUpdate();
					});
				}}
				.errorMessage=${this.formErrorTo(allTimeSlots, i)}
			>
			</vaadin-date-time-picker>

			<sl-input
				type="number"
				step="1"
				min="1"
				.placeholder=${(timeSlot as ExternalResistorValue)
					.external_resistor_value_ohms
					? ''
					: msg('Missing')}
				.value=${(timeSlot as ExternalResistorValue)
					.external_resistor_value_ohms
					? (timeSlot as ExternalResistorValue).external_resistor_value_ohms
					: ''}
				style="width: 10em"
				@sl-input=${async (e: CustomEvent) => {
					const value = (e.target as SlInput).value;
					const ohms = parseInt(value);

					const startTime = new Date(
						`${this.fromDateTimePicker(i).value}Z`,
					).valueOf();
					const endTime = new Date(
						`${this.toDateTimePicker(i).value}Z`,
					).valueOf();

					if (this.formError(allTimeSlots, i) === undefined) {
						this.customMissingTimeSlot = undefined;
						this.dispatchEvent(
							new CustomEvent('set-external-resistor-value', {
								bubbles: true,
								composed: true,
								detail: {
									from: startTime * 1000,
									to: endTime * 1000,
									externalResistorValue: ohms,
									existingExternalResistorValueToEdit: (
										timeSlot as ExternalResistorValueWithIndex
									).externalResistorArrayIndex,
								},
							}),
						);
					}
					setTimeout(() => {
						this.requestUpdate();
					});
				}}
			>
				${(timeSlot as ExternalResistorValue).external_resistor_value_ohms
					? html` <span slot="suffix">${msg('Ohms')}</span> `
					: html``}
			</sl-input>

			<span class="placeholder"
				>${measurementCount === 1
					? msg(str`${measurementCount} measurement`)
					: msg(str`${measurementCount} measurements`)}</span
			>
		</div>`;
	}
	// ${this.formError(allTimeSlots, i)
	// 	? html`<sl-icon
	// 			.src=${wrapPathInSvg(mdiAlertCircle)}
	// 			style="color: red; font-size: 24px"
	// 		></sl-icon>`
	// 	: html``}

	render() {
		const missingTimeSlots = missingResistorValuesTimeSlots(
			this.measurements,
			this.externalResistorsValues,
			this.customMissingTimeSlot,
		);
		const aggregated = (
			missingTimeSlots as Array<
				MissingResistorsValueTimeSlot | ExternalResistorValueWithIndex
			>
		).concat(
			this.externalResistorsValues.map((v, i) => ({
				...v,
				externalResistorArrayIndex: i,
			})),
		);

		const sortedValues = aggregated.sort((a, b) => a.from - b.from);
		return html`<div class="column" style="gap: 12px">
			${sortedValues.map((timeSlot, i) => this.renderTimeSlot(sortedValues, i))}
		</div> `;
	}

	static styles = [...appStyles];
}
