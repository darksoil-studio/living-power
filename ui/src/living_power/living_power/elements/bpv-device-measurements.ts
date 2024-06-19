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
import '@shoelace-style/shoelace/dist/components/alert/alert.js';
import '@shoelace-style/shoelace/dist/components/button/button.js';
import '@shoelace-style/shoelace/dist/components/card/card.js';
import '@shoelace-style/shoelace/dist/components/icon-button/icon-button.js';
import '@shoelace-style/shoelace/dist/components/spinner/spinner.js';
import Chart, { ChartConfiguration, ChartData } from 'chart.js/auto';
import 'chartjs-adapter-luxon';
import { LitElement, css, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { ref } from 'lit/directives/ref.js';

import { appStyles } from '../../../app-styles.js';
import { livingPowerStoreContext } from '../context.js';
import { LivingPowerStore } from '../living-power-store.js';
import { BpvDevice, Measurement, MeasurementCollection } from '../types.js';

export function chartConfig(
	measurementCollections: Array<MeasurementCollection>,
): ChartConfiguration<'line'> {
	const allMeasurements = ([] as Measurement[]).concat(
		...measurementCollections.map(mc => mc.measurements),
	);
	console.log(
		allMeasurements.map(m => ({
			x: m.timestamp / 1000,
			y: m.voltage_millivolts / 1000,
		})),
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
				},
			],
		},
		options: {
			scales: {
				x: {
					type: 'time',
					time: {
						// Luxon format string
						tooltipFormat: 'DD T',
					},
					title: {
						display: true,
						text: 'Date',
					},
				},
				y: {
					title: {
						display: true,
						text: 'mV',
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

	drawChart(
		canvasEl: HTMLCanvasElement,
		measurementsCollections: Array<EntryRecord<MeasurementCollection>>,
	) {
		console.log(canvasEl);
		const chart = new Chart(
			canvasEl.getContext('2d')!,
			chartConfig(measurementsCollections.map(r => r.entry)),
		);
		chart.resize();
	}

	renderMeasurements(
		measurementsCollections: Array<EntryRecord<MeasurementCollection>>,
	) {
		return html`
			<sl-card style="flex: 1; display: flex;">
				<div style="position: relative; flex: 1">
					<canvas
						${ref(
							el =>
								el &&
								this.drawChart(
									el as HTMLCanvasElement,
									measurementsCollections,
								),
						)}
					></canvas>
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
		`,
	];
}
