import { AsyncSignal, AsyncState, Signal } from '@holochain-open-dev/signals';
import { core } from '@tauri-apps/api';
import isEqual from 'lodash-es/isEqual.js';

export function measurementsSdcards(
	intervalMs: number = 1000,
): AsyncSignal<Record<string, string>> {
	let interval: any;
	const measurementsSdcards = new AsyncState<Record<string, string>>(
		{
			status: 'pending',
		},
		{
			[Signal.subtle.watched]: () => {
				interval = setInterval(() => {
					core
						.invoke('list_measurements_sdcards')
						.then(sdcards => {
							measurementsSdcards.set({
								status: 'completed',
								value: sdcards as Record<string, string>,
							});
						})
						.catch(error => {
							measurementsSdcards.set({
								status: 'error',
								error,
							});
						});
				}, intervalMs);
			},
			[Signal.subtle.unwatched]: () => {
				measurementsSdcards.set({
					status: 'pending',
				});
				clearInterval(interval);
			},
			equals: isEqual,
		},
	);

	return measurementsSdcards;
}
