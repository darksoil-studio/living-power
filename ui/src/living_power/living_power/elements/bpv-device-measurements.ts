import {
	hashProperty,
	notifyError,
	wrapPathInSvg,
} from '@holochain-open-dev/elements';
import '@holochain-open-dev/elements/dist/elements/display-error.js';
import { SignalWatcher, joinAsync } from '@holochain-open-dev/signals';
import { EntryRecord } from '@holochain-open-dev/utils';
import { ActionHash, EntryHash, Record } from '@holochain/client';
import { consume } from '@lit/context';
import { localized, msg } from '@lit/localize';
import { mdiInformationOutline } from '@mdi/js';
import '@shoelace-style/shoelace/dist/components/alert/alert.js';
import '@shoelace-style/shoelace/dist/components/button/button.js';
import '@shoelace-style/shoelace/dist/components/card/card.js';
import '@shoelace-style/shoelace/dist/components/icon-button/icon-button.js';
import '@shoelace-style/shoelace/dist/components/spinner/spinner.js';
import '@shoelace-style/shoelace/dist/components/tab-group/tab-group.js';
import '@shoelace-style/shoelace/dist/components/tab-panel/tab-panel.js';
import '@shoelace-style/shoelace/dist/components/tab/tab.js';
import Chart, { ChartConfiguration, ChartData } from 'chart.js/auto';
import 'chartjs-adapter-luxon';
import { LitElement, css, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { ref } from 'lit/directives/ref.js';

import { appStyles } from '../../../app-styles.js';
import { livingPowerStoreContext } from '../context.js';
import { LivingPowerStore } from '../living-power-store.js';
import { BpvDevice, Measurement, MeasurementCollection } from '../types.js';

export interface ChartMeasurement extends Measurement {
	external_resistor_ohms: number;
	intensity_micro_amperes: number;
	power_micro_watts: number;
}

export function measurementCollectionToChartMeasurements(
	measurementCollections: Array<MeasurementCollection>,
): ChartMeasurement[] {
	return ([] as ChartMeasurement[]).concat(
		...measurementCollections.map(mc =>
			mc.measurements.map(m => {
				const intensity_micro_amperes =
					m.voltage_millivolts / 1000 / mc.external_resistor_ohms;
				return {
					...m,
					external_resistor_ohms: mc.external_resistor_ohms,
					intensity_micro_amperes,
					power_micro_watts:
						(intensity_micro_amperes * (m.voltage_millivolts / 1000)) / 1000,
				};
			}),
		),
	);
}

export function chartConfig(
	measurementCollections: Array<MeasurementCollection>,
): ChartConfiguration<'line'> {
	const allMeasurements = measurementCollectionToChartMeasurements(
		measurementCollections,
	);
	return {
		type: 'line',
		data: {
			datasets: [
				{
					label: msg('Voltage (mV)'),
					data: allMeasurements.map(m => ({
						x: m.timestamp / 1000,
						y: m.voltage_millivolts / 1000,
					})),
					parsing: false,
					yAxisID: 'voltage',
					cubicInterpolationMode: 'monotone',
					tension: 0.4,
				},
				{
					label: msg('Humidity (%)'),
					data: allMeasurements.map(m => ({
						x: m.timestamp / 1000,
						y: m.humidity_percentage / 1000,
					})),
					parsing: false,
					yAxisID: 'humidity',
					cubicInterpolationMode: 'monotone',
					tension: 0.4,
				},
				{
					label: msg('Light Level (Lux)'),
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
					label: msg('Temperature (ºC)'),
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
					label: msg('External Resistor (kOhms)'),
					data: allMeasurements.map(m => ({
						x: m.timestamp / 1000,
						y: m.external_resistor_ohms / 1000,
					})),
					parsing: false,
					yAxisID: 'resistor',
					stepped: true,
				},
				{
					label: msg('Power (uW)'),
					data: allMeasurements.map(m => ({
						x: m.timestamp / 1000,
						y: m.power_micro_watts,
					})),
					parsing: false,
					yAxisID: 'power',
					cubicInterpolationMode: 'monotone',
					tension: 0.4,
				},
				{
					label: msg('Intensity (uA)'),
					data: allMeasurements.map(m => ({
						x: m.timestamp / 1000,
						y: m.intensity_micro_amperes,
					})),
					parsing: false,
					yAxisID: 'intensity',
					cubicInterpolationMode: 'monotone',
					tension: 0.4,
				},
			],
		},
		options: {
			scales: {
				x: {
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
						text: 'Date',
					},
				},
				voltage: {},
				intensity: {
					display: false,
				},
				power: {
					display: false,
				},
				temperature: {
					display: false,
					// title: {
					// 	display: true,
					// 	text: 'ºC',
					// },
					position: 'right',
				},
				lightlevel: {
					display: false,
					// title: {
					// 	display: true,
					// 	text: 'ºC',
					// },
					position: 'right',
				},
				humidity: {
					display: false,
					// title: {
					// 	display: true,
					// 	text: msg("Humidity"),
					// },
					position: 'right',
				},
				resistor: {
					// type: '',
					display: true,
					position: 'right',
				},
			},
			responsive: false,
		},
	};
}

export function intensityVoltageChartConfig(
	measurementCollections: Array<MeasurementCollection>,
): ChartConfiguration<'scatter'> {
	const allMeasurements = measurementCollectionToChartMeasurements(
		measurementCollections,
	);
	return {
		type: 'scatter',
		data: {
			datasets: [
				{
					label: undefined,
					data: allMeasurements.map(m => ({
						x: m.intensity_micro_amperes,
						y: m.voltage_millivolts / 1000,
					})),
					parsing: false,
					cubicInterpolationMode: 'monotone',
					tension: 0.4,
				},
			],
		},
		options: {
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
			responsive: false,
		},
	};
}

/**
 * @element bpv-device-measurements
 */
@localized()
@customElement('bpv-device-measurements')
export class BpvDevicemeasurementsDetail extends SignalWatcher(LitElement) {
	/**
	 * REQUIRED. The hash of the BpvDevice to show
	 */
	@property(hashProperty('bpv-device-hash'))
	bpvDeviceHash!: ActionHash;

	/**
	 * @internal
	 */
	@consume({ context: livingPowerStoreContext, subscribe: true })
	livingPowerStore!: LivingPowerStore;

	renderTimeChart(
		measurementsCollections: Array<EntryRecord<MeasurementCollection>>,
	) {
		return html`
			<div class="tab-content">
				<canvas
					${ref(el => {
						if (!el) return;
						const chart = new Chart(
							(el as HTMLCanvasElement).getContext('2d')!,
							chartConfig(measurementsCollections.map(r => r.entry)),
						);
						setTimeout(() => chart.resize(), 1);
					})}
				></canvas>
			</div>
		`;
	}

	renderIntensityVoltageChart(
		measurementsCollections: Array<EntryRecord<MeasurementCollection>>,
	) {
		return html`
			<div class="tab-content">
				<canvas
					${ref(el => {
						if (!el) return;
						const chart = new Chart(
							(el as HTMLCanvasElement).getContext('2d')!,
							intensityVoltageChartConfig(
								measurementsCollections.map(r => r.entry),
							),
						);
						setTimeout(() => chart.resize(), 1);
					})}
				></canvas>
			</div>
		`;
	}

	@state()
	selectedTab: string = 'time-chart';

	renderMeasurements(
		measurementsCollections: Array<EntryRecord<MeasurementCollection>>,
	) {
		return html`
			<sl-card style="flex: 1; display: flex;">
				<div style="position: relative; flex: 1; display: flex;">
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
											'To collect measurements from this BPV device, connect it to this computer through a USB device, and PRESS THE RESET BUTTON ON THE ARDUINO DEVICE.',
										)}</span
									>
								</div>
							`
						: html`
								<sl-tab-group
									style="flex: 1"
									@sl-tab-show=${(e: CustomEvent) => {
										console.log(e);
										this.selectedTab = e.detail.name;
									}}
								>
									<sl-tab slot="nav" panel="time-chart"
										>${msg('Time Chart')}</sl-tab
									>
									<sl-tab slot="nav" panel="intensity-voltage"
										>${msg('Intensity x Voltage')}</sl-tab
									>
									<sl-tab-panel active style="padding: 0 16px; display: flex"
										>${this.selectedTab === 'time-chart'
											? this.renderTimeChart(measurementsCollections)
											: this.renderIntensityVoltageChart(
													measurementsCollections,
												)}</sl-tab-panel
									>
								</sl-tab-group>
							`}
				</div>
			</sl-card>
		`;
	}

	allMeasurementsCollections() {
		const allMeasurements = this.livingPowerStore.bpvDevices
			.get(this.bpvDeviceHash)
			.measurementCollections.live.get();
		if (allMeasurements.status !== 'completed') return allMeasurements;

		const allMeasurementsEntries = joinAsync(
			Array.from(allMeasurements.value.values()).map(mc => mc.entry.get()),
		);
		return allMeasurementsEntries;
	}

	render() {
		const allMeasurementsCollections = this.allMeasurementsCollections();

		switch (allMeasurementsCollections.status) {
			case 'pending':
				return html`<div
					style="display: flex; flex-direction: column; align-items: center; justify-content: center; flex: 1;"
				>
					<sl-spinner style="font-size: 2rem;"></sl-spinner>
				</div>`;
			case 'error':
				return html`<display-error
					.headline=${msg('Error fetching the bpv device')}
					.error=${allMeasurementsCollections.error}
				></display-error>`;
			case 'completed':
				return this.renderMeasurements(allMeasurementsCollections.value);
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
				height: 100%;
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
				width: 100%;
				height: 100%;
			}
		`,
	];
}