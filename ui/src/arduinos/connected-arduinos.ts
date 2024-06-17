import { AsyncSignal, AsyncState, Signal } from '@holochain-open-dev/signals';
import { core } from '@tauri-apps/api';
import isEqual from 'lodash-es/isEqual.js';

export interface SerialPortInfo {
	port_name: string;
	port_type: PortType | undefined;
}
export type PortType = {
	UsbPort: {
		manufacturer: String;
		pid: number;
		product: String;
		serial_number: String;
		vid: number;
	};
};

export function connectedArduinos(
	intervalMs: number = 1000,
): AsyncSignal<Array<SerialPortInfo>> {
	let interval: any;
	const arduinos = new AsyncState<Array<SerialPortInfo>>(
		{
			status: 'pending',
		},
		{
			[Signal.subtle.watched]: () => {
				interval = setInterval(() => {
					core
						.invoke('list_connected_arduinos')
						.then(listedArduinos => {
							arduinos.set({
								status: 'completed',
								value: listedArduinos as Array<SerialPortInfo>,
							});
						})
						.catch(error => {
							arduinos.set({
								status: 'error',
								error,
							});
						});
				}, intervalMs);
			},
			[Signal.subtle.unwatched]: () => {
				arduinos.set({
					status: 'pending',
				});
				clearInterval(interval);
			},
			equals: isEqual,
		},
	);

	return arduinos;
}
