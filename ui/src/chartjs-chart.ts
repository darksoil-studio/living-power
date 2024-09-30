import {
	Chart,
	ChartConfiguration,
	ChartData,
	ChartOptions,
	ChartType,
} from 'chart.js/auto';
import 'chartjs-adapter-luxon';
import { LitElement, css, html } from 'lit';
import { customElement, property, query, state } from 'lit/decorators.js';
import { ref } from 'lit/directives/ref.js';

export abstract class BaseChartjs<
	CHART_TYPE extends ChartType,
> extends LitElement {
	abstract type(): ChartType;

	_options: ChartOptions<CHART_TYPE> | undefined;

	@property()
	set options(options: ChartOptions<CHART_TYPE>) {
		console.log('setting options');
		this._options = options;

		if (this._chart) {
			this.chart!.options = options;
			this.chart!.update();
		}
	}

	_data: ChartData<CHART_TYPE> | undefined;
	@property()
	set data(data: ChartData<CHART_TYPE>) {
		this._data = data;

		if (this._chart) {
			this.chart!.data = data;
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
			console.log('constructing chart', this._options, this._data);
			this._chart = new Chart<CHART_TYPE>(this.canvas.getContext('2d')!, {
				type: this.type() as CHART_TYPE,
				data: this._data || {
					datasets: [],
				},
				options: this._options,
			});
		}
		return this._chart;
	}

	render() {
		return html` <div style="postition: relative; height: 100%; width: 100%">
			<canvas></canvas>
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
