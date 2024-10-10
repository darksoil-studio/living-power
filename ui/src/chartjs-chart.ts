import { Chart, ChartData, ChartOptions, ChartType } from 'chart.js/auto';
import 'chartjs-adapter-luxon';
import { LitElement, css, html } from 'lit';
import { customElement, property, query, state } from 'lit/decorators.js';
import { clone, cloneDeep, isEqual } from 'lodash-es';
import assign from 'lodash-es/assign.js';
import merge from 'lodash-es/merge.js';

export abstract class BaseChartjs<
	CHART_TYPE extends ChartType,
> extends LitElement {
	abstract type(): ChartType;

	_initialOptions: ChartOptions<CHART_TYPE> | undefined;
	_optionsInitialized = false;
	@property()
	set initialOptions(options: ChartOptions<CHART_TYPE>) {
		this._initialOptions = options;

		if (this._chart && !this._optionsInitialized) {
			this._optionsInitialized = true;
			this._chart!.options = options;
			this._chart!.update();
		}
	}

	_options: ChartOptions<CHART_TYPE> | undefined;
	@property()
	set options(options: ChartOptions<CHART_TYPE>) {
		if (this._chart) {
			merge(this._chart.options, options);
			this._chart!.update();
		} else {
			this._options = options;
		}
	}

	_data: ChartData<CHART_TYPE> | undefined;
	@property()
	set data(data: ChartData<CHART_TYPE>) {
		this._data = data;

		if (this._chart) {
			for (let i = 0; i < this._chart.data.datasets.length; i++) {
				const dataset = this._chart.data.datasets[i];
				const newData = data.datasets.find(
					ds => ds.label === dataset.label,
				)?.data;
				if (newData) {
					this._chart.data.datasets[i].data = newData;
				}
			}
			this.chart!.update();
		}
	}

	@query('canvas')
	canvas!: HTMLCanvasElement;

	firstUpdated() {
		const c = this.chart;
	}

	_chart: Chart<CHART_TYPE> | undefined;
	get chart(): Chart<CHART_TYPE> {
		if (!this._chart) {
			this._chart = new Chart<CHART_TYPE>(this.canvas.getContext('2d')!, {
				type: this.type() as CHART_TYPE,
				data: this._data
					? this._data
					: {
							datasets: [],
						},
				options: merge(
					this._initialOptions || {},
					this._options || {},
				) as ChartOptions<CHART_TYPE>,
			});
		}
		return this._chart;
	}

	render() {
		return html` <div style="position: relative; height: 100%; width: 100%">
			<canvas style="height: 100%; width: 100%"></canvas>
		</div>`;
	}
}

@customElement('line-chart')
export class LineChart extends BaseChartjs<'line'> {
	type() {
		return 'line' as const;
	}
}

@customElement('scatter-chart')
export class ScatterChart extends BaseChartjs<'scatter'> {
	type() {
		return 'scatter' as const;
	}
}
