import {
	hashProperty,
	notifyError,
	wrapPathInSvg,
} from '@holochain-open-dev/elements';
import '@holochain-open-dev/elements/dist/elements/display-error.js';
import {
	AsyncComputed,
	SignalWatcher,
	joinAsync,
	toPromise,
} from '@holochain-open-dev/signals';
import { EntryRecord } from '@holochain-open-dev/utils';
import { ActionHash, EntryHash, Record } from '@holochain/client';
import { consume } from '@lit/context';
import { localized, msg } from '@lit/localize';
import { mdiInformationOutline } from '@mdi/js';
import { SlRadioGroup } from '@shoelace-style/shoelace';
import '@shoelace-style/shoelace/dist/components/alert/alert.js';
import '@shoelace-style/shoelace/dist/components/button/button.js';
import '@shoelace-style/shoelace/dist/components/card/card.js';
import '@shoelace-style/shoelace/dist/components/icon-button/icon-button.js';
import '@shoelace-style/shoelace/dist/components/radio-button/radio-button.js';
import '@shoelace-style/shoelace/dist/components/radio-group/radio-group.js';
import '@shoelace-style/shoelace/dist/components/spinner/spinner.js';
import '@shoelace-style/shoelace/dist/components/tab-group/tab-group.js';
import '@shoelace-style/shoelace/dist/components/tab-panel/tab-panel.js';
import '@shoelace-style/shoelace/dist/components/tab/tab.js';
import {
	DateTimePickerChangeEvent,
	DateTimePickerValueChangedEvent,
} from '@vaadin/date-time-picker';
import '@vaadin/date-time-picker/theme/material/vaadin-date-time-picker.js';
import type {
	ChartConfiguration,
	ChartData,
	ChartOptions,
} from 'chart.js/auto';
import { LitElement, css, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { ref } from 'lit/directives/ref.js';

import { appStyles } from '../../../app-styles.js';
import '../../../chartjs-chart.js';
import { LineChart } from '../../../chartjs-chart.js';
import { getISOLocalString } from '../../../utils.js';
import { livingPowerStoreContext } from '../context.js';
import { LivingPowerStore } from '../living-power-store.js';
import {
	ExternalResistorValue,
	Measurement,
	MeasurementCollection,
} from '../types.js';

export interface ChartMeasurement extends Measurement {
	external_resistor_ohms: number | undefined;
	intensity_micro_amperes: number | undefined;
	power_micro_watts: number | undefined;
}

const MILLIS_IN_A_MINUTE = 1000 * 60;
const MILLIS_IN_AN_HOUR = MILLIS_IN_A_MINUTE * 60;
const MILLIS_IN_A_DAY = MILLIS_IN_AN_HOUR * 24;
const MILLIS_IN_A_WEEK = MILLIS_IN_A_DAY * 7;
const MILLIS_IN_A_MONTH = MILLIS_IN_A_DAY * 30;

export function measurementCollectionToChartMeasurements(
	measurementCollections: Array<MeasurementCollection>,
	externalResistorsValues: Array<ExternalResistorValue>,
): ChartMeasurement[] {
	return ([] as ChartMeasurement[])
		.concat(
			...measurementCollections.map(mc =>
				mc.measurements
					// .filter(
					// 	m =>
					// 		m.timestamp / 1000 <= endTime && m.timestamp / 1000 >= startTime,
					// )
					.map(m => {
						const externalResistor = externalResistorsValues.find(
							er => er.from <= m.timestamp && m.timestamp <= er.to,
						);
						const intensity_micro_amperes = externalResistor
							? (m.voltage_millivolts /
									externalResistor.external_resistor_value_ohms) *
								1000
							: undefined;
						const power_micro_watts = intensity_micro_amperes
							? (intensity_micro_amperes * m.voltage_millivolts) / 1000
							: undefined;
						return {
							...m,
							external_resistor_ohms:
								externalResistor?.external_resistor_value_ohms,
							intensity_micro_amperes,
							power_micro_watts,
						};
					}),
			),
		)
		.sort((a, b) => a.timestamp - b.timestamp);
}

const voltageLabel = msg('Voltage (mV)');
const lightLevelLabel = msg('Light Level (Lux)');
const temperatureLabel = msg('Temperature (ºC)');
const externalResistorLabel = msg('External Resistor (kOhms)');
const powerLabel = msg('Power (uW)');
const intensityLabel = msg('Intensity (uA)');

export function chartData(
	measurementCollections: Array<MeasurementCollection>,
	externalResistorsValues: Array<ExternalResistorValue>,
): ChartData<'line'> {
	const allMeasurements = measurementCollectionToChartMeasurements(
		measurementCollections,
		externalResistorsValues,
	);
	return {
		datasets: [
			{
				label: voltageLabel,
				data: allMeasurements.map(m => ({
					x: m.timestamp / 1000,
					y: m.voltage_millivolts / 1000,
				})),
				parsing: false,
				yAxisID: 'voltage',
				cubicInterpolationMode: 'monotone',
				tension: 0.4,
			},
			// {
			// 	label: msg('Humidity (%)'),
			// 	data: allMeasurements.map(m => ({
			// 		x: m.timestamp / 1000,
			// 		y: m.humidity_percentage / 1000,
			// 	})),
			// 	parsing: false,
			// 	yAxisID: 'humidity',
			// 	cubicInterpolationMode: 'monotone',
			// 	tension: 0.4,
			// },
			{
				label: lightLevelLabel,
				data: allMeasurements.map(m => ({
					x: m.timestamp / 1000,
					y: m.light_level_lux / 1000,
				})),
				parsing: false,
				yAxisID: 'lightlevel',
				cubicInterpolationMode: 'monotone',
				tension: 0.4,
			},
			{
				label: temperatureLabel,
				data: allMeasurements.map(m => ({
					x: m.timestamp / 1000,
					y: m.temperature_celsius / 1000,
				})),
				parsing: false,
				yAxisID: 'temperature',
				cubicInterpolationMode: 'monotone',
				tension: 0.4,
			},
			{
				label: externalResistorLabel,
				data: allMeasurements
					.filter(m => m.external_resistor_ohms !== undefined)
					.map(m => ({
						x: m.timestamp / 1000,
						y: m.external_resistor_ohms! / 1000,
					})),
				parsing: false,
				yAxisID: 'resistor',
				stepped: true,
			},
			{
				label: powerLabel,
				data: allMeasurements

					.filter(m => m.power_micro_watts !== undefined)
					.map(m => ({
						x: m.timestamp / 1000,
						y: m.power_micro_watts!,
					})),
				parsing: false,
				yAxisID: 'power',
				cubicInterpolationMode: 'monotone',
				tension: 0.4,
			},
			{
				label: intensityLabel,
				data: allMeasurements
					.filter(m => m.intensity_micro_amperes !== undefined)
					.map(m => ({
						x: m.timestamp / 1000,
						y: m.intensity_micro_amperes!,
					})),
				parsing: false,
				yAxisID: 'intensity',
				cubicInterpolationMode: 'monotone',
				tension: 0.4,
			},
		],
	};
}

export function initialTimeChartOptions(
	startTime: number,
	endTime: number,
): ChartOptions<'line'> {
	return {
		scales: {
			x: {
				min: startTime,
				max: endTime,
				type: 'time',
				time: {
					// Luxon format string
					// unit: 'second',
					displayFormats: {
						millisecond: 'HH:MM',
					},
				},
				title: {
					display: true,
					text: msg('Date'),
				},
			},
			temperature: {
				// display: false,
				title: {
					display: true,
					text: temperatureLabel,
				},
			},
			lightlevel: {
				// display: false,
				// title: {
				// 	display: true,
				// 	text: 'ºC',
				// },
				title: {
					display: true,
					text: lightLevelLabel,
				},
			},
			intensity: {
				// display: false,
				title: {
					display: true,
					text: intensityLabel,
				},
				position: 'right',
			},
			voltage: {
				title: {
					display: true,
					text: voltageLabel,
				},
				position: 'right',
			},
			power: {
				// display: false,
				title: {
					display: true,
					text: powerLabel,
				},
				position: 'right',
			},
			// humidity: {
			// 	display: false,
			// 	// title: {
			// 	// 	display: true,
			// 	// 	text: msg("Humidity"),
			// 	// },
			// },
			resistor: {
				title: {
					display: true,
					text: externalResistorLabel,
				},
				// type: '',
				position: 'right',
			},
		},
		plugins: {
			legend: {
				onClick(e, legendItem, legend) {
					const index = legendItem.datasetIndex;
					const ci = legend.chart;

					const scales = ci.options.scales!;
					const scale = Object.entries(scales).find(
						([_, s]) => s?.title?.text === legendItem.text,
					)!;
					if (ci.isDatasetVisible(index!)) {
						ci.hide(index!);
						legendItem.hidden = true;
						ci.options.scales![scale[0]]!.display = false;
					} else {
						ci.show(index!);
						legendItem.hidden = false;
						ci.options.scales![scale[0]]!.display = true;
					}

					ci.update();
				},
			},
		},
	};
}

export function intensityVoltageChartData(
	measurementCollections: Array<MeasurementCollection>,
	externalResistorsValues: Array<ExternalResistorValue>,
): ChartData<'scatter'> {
	const allMeasurements = measurementCollectionToChartMeasurements(
		measurementCollections,
		externalResistorsValues,
	);
	return {
		datasets: [
			{
				label: undefined,
				data: allMeasurements
					.filter(m => m.intensity_micro_amperes !== undefined)
					.map(m => ({
						x: m.intensity_micro_amperes!,
						y: m.voltage_millivolts / 1000,
					})),
				parsing: false,
				cubicInterpolationMode: 'monotone',
				tension: 0.4,
			},
		],
	};
}

export const intensityVoltageChartOptions: ChartOptions<'scatter'> = {
	plugins: {
		legend: {
			display: false,
		},
	},

	scales: {
		x: {
			type: 'linear',
			title: {
				display: true,
				text: 'Intensity (uA)',
			},
		},
		y: {
			title: {
				display: true,
				text: 'Voltage (mV)',
			},
		},
	},
};

type TimeFilter = 'last_day' | 'last_week' | 'last_month' | 'all_time';

/**
 * @element bpv-device-measurements
 */
@localized()
@customElement('bpv-device-measurements')
export class BpvDeviceMeasurements extends SignalWatcher(LitElement) {
	/**
	 * REQUIRED. The hash of the BpvDevice to show
	 */
	@property()
	arduinoSerialNumber!: string;

	/**
	 * @internal
	 */
	@consume({ context: livingPowerStoreContext, subscribe: true })
	livingPowerStore!: LivingPowerStore;

	renderTimeChart(
		measurementsCollections: Array<EntryRecord<MeasurementCollection>>,
		externalResistors: Array<ExternalResistorValue>,
	) {
		return html`
			<div class="tab-content">
				<line-chart
					id="time-chart"
					.initialOptions=${initialTimeChartOptions(
						this.startTime,
						this.endTime,
					)}
					.options=${{
						scales: {
							x: {
								min: this.startTime,
								max: this.endTime,
							},
						},
					}}
					.data=${chartData(
						measurementsCollections.map(r => r.entry),
						externalResistors,
					)}
				></line-chart>
			</div>
		`;
	}

	renderIntensityVoltageChart(
		measurementsCollections: Array<EntryRecord<MeasurementCollection>>,
		externalResistors: Array<ExternalResistorValue>,
	) {
		return html`
			<div class="tab-content">
				<scatter-chart
					.initialOptions=${intensityVoltageChartOptions}
					.data=${intensityVoltageChartData(
						measurementsCollections.map(r => r.entry),
						externalResistors,
					)}
				></scatter-chart>
			</div>
		`;
	}

	@state()
	selectedTab: string = 'time-chart';

	@state()
	startTime: number = Date.now() - MILLIS_IN_A_WEEK;

	@state()
	endTime: number = Date.now();

	async firstUpdated() {
		const result = await toPromise(
			new AsyncComputed(() => this.allMeasurementsAndResistors()),
		);
		if (result.measurements.length > 0) {
			this.startTime = Date.now();
			this.endTime = 0;
			for (const measurementCollection of result.measurements) {
				for (const measurement of measurementCollection.entry.measurements) {
					if (
						this.startTime >
						measurement.timestamp / 1000 - MILLIS_IN_AN_HOUR
					) {
						this.startTime = measurement.timestamp / 1000 - MILLIS_IN_AN_HOUR;
					}
					if (this.endTime < measurement.timestamp / 1000 + MILLIS_IN_AN_HOUR) {
						this.endTime = measurement.timestamp / 1000 + MILLIS_IN_AN_HOUR;
					}
				}
			}

			if (this.endTime - this.startTime < 60 * 1000) {
				this.endTime = this.startTime + 60 * 1000;
			}
		} else {
			this.startTime = Date.now() - MILLIS_IN_A_WEEK;
			this.endTime = Date.now();
		}
	}

	renderMeasurements(
		measurementsCollections: Array<EntryRecord<MeasurementCollection>>,
		externalResistors: Array<ExternalResistorValue>,
	) {
		return html`
			<sl-card style="flex: 1; display: flex;">
				<div style="flex: 1; display: flex;">
					${measurementsCollections.length === 0
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
									<span
										class="placeholder"
										style="max-width: 40rem; text-align: center"
										>${msg(
											'To collect measurements from this BPV device, connect it to this computer through a USB cable, and',
										)}&nbsp;<strong
											>${msg('press the reset button on the arduino device')}</strong
										></span
									>
									<span
										class="placeholder"
										style="max-width: 40rem; text-align: center"
										>${msg('OR')}&nbsp;</span
									>
									<span
										class="placeholder"
										style="max-width: 40rem; text-align: center"
										>${msg(
											'extract the SD card from the BPV device and insert it in this computer.',
										)}</strong
										></span
									>
								</div>
							`
						: html`
								<sl-tab-group
									style="flex: 1"
									@sl-tab-show=${(e: CustomEvent) => {
										this.selectedTab = e.detail.name;
									}}
								>
									<sl-tab
										slot="nav"
										panel="time-chart"
										.active=${this.selectedTab === 'time-chart'}
									>
										<span>${msg('Time Chart')}</span></sl-tab
									>
									<sl-tab
										style="display: none"
										slot="nav"
										panel="intensity-voltage"
										.active=${this.selectedTab === 'intensity-voltage'}
										>${msg('Intensity x Voltage')}</sl-tab
									>
									<sl-tab-panel active style="padding: 0 16px; display: flex"
										>${this.selectedTab === 'time-chart'
											? this.renderTimeChart(
													measurementsCollections,
													externalResistors,
												)
											: this.renderIntensityVoltageChart(
													measurementsCollections,
													externalResistors,
												)}</sl-tab-panel
									>
									<span slot="nav" style="flex: 1"> </span>
									<div
										slot="nav"
										class="row"
										style="align-items: center; margin-right: 4px; gap: 12px"
									>
										<vaadin-date-time-picker
											.value=${getISOLocalString(new Date(this.startTime))}
											@change="${(event: DateTimePickerChangeEvent) => {
												this.startTime = new Date(event.target.value).valueOf();
												if (this.startTime > this.endTime) {
													this.endTime = this.startTime + MILLIS_IN_A_DAY;
												}

												// const startTime = new Date(
												// 	event.detail.value,
												// ).valueOf();
												// if (startTime !== this.startTime) {
												// 	this.startTime = startTime;
												// }
											}}"
											style="width: 16em"
										></vaadin-date-time-picker>
										<span>${msg('to')}</span>
										<vaadin-date-time-picker
											.value=${getISOLocalString(new Date(this.endTime))}
											.min=${getISOLocalString(new Date(this.startTime))}
											@change="${(event: DateTimePickerChangeEvent) => {
												this.endTime = new Date(event.target.value).valueOf();
											}}"
											style="width: 16em"
										></vaadin-date-time-picker>
									</div>
								</sl-tab-group>
							`}
				</div>
			</sl-card>
		`;
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
					.headline=${msg('Error fetching the bpv device')}
					.error=${result.error}
				></display-error>`;
			case 'completed':
				return this.renderMeasurements(
					result.value.measurements,
					result.value.externalResistors.map(([_, v]) => v),
				);
		}
	}

	static styles = [
		...appStyles,
		css`
			:host {
				display: flex;
			}
			sl-card::part(body) {
				padding: 0;
			}
			sl-tab-group,
			sl-tab-group::part(body) {
				display: flex;
				flex: 1;
			}
			sl-tab-panel::part(base) {
				width: 100%;
				display: flex;
				flex: 1;
			}
			sl-tab-group::part(base) {
				display: flex;
				flex: 1;
			}
			sl-tab-panel {
				width: 100%;
				--padding: 0;
			}
			.tab-content {
				flex: 1;
				max-height: 100%;
			}
		`,
	];
}
