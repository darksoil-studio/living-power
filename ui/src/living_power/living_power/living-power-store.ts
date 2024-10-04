import {
	AsyncComputed,
	AsyncResult,
	AsyncSignal,
	AsyncState,
	JoinAsyncOptions,
	Signal,
	allRevisionsOfEntrySignal,
	collectionSignal,
	deletedLinksSignal,
	deletesForEntrySignal,
	fromPromise,
	immutableEntrySignal,
	joinAsync,
	latestVersionOfEntrySignal,
	liveLinksSignal,
	pipe,
} from '@holochain-open-dev/signals';
import {
	EntryRecord,
	GetonlyMap,
	HashType,
	LazyHoloHashMap,
	LazyMap,
	decodePath,
	retype,
	slice,
} from '@holochain-open-dev/utils';
import {
	ActionHash,
	AgentPubKey,
	EntryHash,
	NewEntryAction,
	Record,
} from '@holochain/client';
import { decode } from '@msgpack/msgpack';

import {
	collectMeasurementsFromSdcard,
	getLastMeasurement,
} from '../../arduinos/collect-measurements.js';
import { connectedArduinos } from '../../arduinos/connected-arduinos.js';
import { measurementsSdcards } from '../../arduinos/measurements-sdcards.js';
import { LivingPowerClient } from './living-power-client.js';
import {
	BpvDeviceInfo,
	ExternalResistorValue,
	MeasurementCollection,
} from './types.js';

export function lazyLoadAndPoll<T>(
	task: () => Promise<T>,
	intervalMs: number,
): AsyncSignal<T> {
	let watched = false;
	const signal = new AsyncState<T>(
		{ status: 'pending' },
		{
			[Signal.subtle.watched]: () => {
				watched = true;

				const request = () => {
					if (watched)
						task()
							.then(value => {
								if (watched)
									signal.set({
										status: 'completed',
										value,
									});
							})
							.catch(error => {
								if (watched) {
									signal.set({
										status: 'error',
										error,
									});
								}
							})
							.finally(() => {
								if (watched) {
									setTimeout(() => request(), intervalMs);
								}
							});
				};
				request();
			},
			[Signal.subtle.unwatched]: () => {
				watched = false;
				signal.set({
					status: 'pending',
				});
			},
		},
	);
	return signal;
}

export class LivingPowerStore {
	constructor(public client: LivingPowerClient) {}

	connectedArduinos = connectedArduinos();
	measurementsSdcards = measurementsSdcards();

	/** Bpv Device */

	bpvDevices = new LazyMap((arduinoSerialNumber: string) => {
		const pathHash = fromPromise(() =>
			this.client.bpvDeviceHash(arduinoSerialNumber),
		);
		return {
			pathHash,
			info: pipe(
				pathHash,
				hash =>
					liveLinksSignal(
						this.client,
						hash,
						() => this.client.getBpvDeviceInfo(arduinoSerialNumber),
						'BpvDeviceToBpvDeviceInfo',
					),
				links => {
					if (links.length === 0) return undefined;
					const sortedLinks = links.sort(
						(linkA, linkB) => linkB.timestamp - linkA.timestamp,
					);
					const latestLink = sortedLinks[0];

					const info = decode(latestLink.tag) as BpvDeviceInfo;
					return info;
				},
			),
			connectedArduino: pipe(this.connectedArduinos, arduinos => {
				const serialPortInfo = arduinos.find(
					a => a.port_type?.UsbPort.serial_number === arduinoSerialNumber,
				);

				if (!serialPortInfo) return undefined;
				return {
					serialPortInfo,
					lastMeasurement: lazyLoadAndPoll(
						() => getLastMeasurement(serialPortInfo.port_name),
						3000,
					),
				};
			}),
			measurementSdcard: pipe(this.measurementsSdcards, sdcards => {
				const sdcardPath = sdcards[arduinoSerialNumber];
				if (!sdcardPath) return undefined;
				return {
					sdcardPath,
					measurements: fromPromise(() =>
						collectMeasurementsFromSdcard(sdcardPath),
					),
				};
			}),
			measurementCollections: {
				live: pipe(
					pathHash,
					hash =>
						liveLinksSignal(
							this.client,
							hash,
							() =>
								this.client.getMeasurementCollectionsForBpvDevice(
									arduinoSerialNumber,
								),
							'BpvDeviceToMeasurementCollections',
						),
					links =>
						slice(
							this.measurementCollections,
							links.map(l => l.target),
						),
				),
				deleted: pipe(
					pathHash,
					hash =>
						deletedLinksSignal(
							this.client,
							hash,
							() =>
								this.client.getDeletedMeasurementCollectionsForBpvDevice(
									arduinoSerialNumber,
								),
							'BpvDeviceToMeasurementCollections',
						),
					links =>
						slice(
							this.measurementCollections,
							links.map(l => l[0].hashed.content.target_address),
						),
				),
			},
			externalResistorValues: pipe(
				pathHash,
				hash =>
					liveLinksSignal(
						this.client,
						hash,
						() => this.client.getAllExternalResistorValues(arduinoSerialNumber),
						'BpvDeviceToExternalResistorValues',
					),
				links =>
					links.map(
						link =>
							[link.create_link_hash, decode(link.tag)] as [
								ActionHash,
								ExternalResistorValue,
							],
					),
			),
		};
	});

	/** All Bpv Devices */

	allBpvDevices = pipe(
		collectionSignal(
			this.client,
			() => this.client.getAllBpvDevices(),
			'AllBpvDevices',
		),
		allBpvDevices =>
			sliceNormalMap(
				this.bpvDevices,
				allBpvDevices
					.map(l => decodePath([l.tag]))
					.filter(deviceName => deviceName !== 'all_bpv_devices'),
			),
	);

	/** Measurement Collection */

	measurementCollections = new LazyHoloHashMap(
		(measurementCollectionHash: ActionHash) => ({
			entry: immutableEntrySignal(() =>
				this.client.getMeasurementCollection(measurementCollectionHash),
			),
			deletes: deletesForEntrySignal(
				this.client,
				measurementCollectionHash,
				() =>
					this.client.getAllDeletesForMeasurementCollection(
						measurementCollectionHash,
					),
			),
		}),
	);
}
/**
 * Create a new slice of this map that contains only the given keys
 */
export function sliceNormalMap<K, V>(
	map: GetonlyMap<K, V>,
	keys: K[],
): ReadonlyMap<K, V> {
	const newMap = new Map<K, V>();

	for (const key of keys) {
		const value = map.get(key);
		if (value) newMap.set(key, value);
	}
	return newMap;
}

/**
 * Create a new map maintaining the keys while mapping the values with the given mapping function
 */
export function mapValuesNormalMap<K, V, U>(
	map: ReadonlyMap<K, V>,
	mappingFn: (value: V, key: K) => U,
): Map<K, U> {
	const mappedMap = new Map<K, U>();

	for (const [key, value] of map.entries()) {
		mappedMap.set(key, mappingFn(value, key));
	}
	return mappedMap;
}
/**
 * Joins all the results in a HoloHashMap of `AsyncResults`
 */
export function joinAsyncNormalMap<K, T>(
	map: ReadonlyMap<K, AsyncResult<T>>,
	joinOptions?: JoinAsyncOptions,
): AsyncResult<ReadonlyMap<K, T>> {
	const resultsArray = Array.from(map.entries()).map(([key, result]) => {
		if (result.status !== 'completed') return result;
		const value = [key, result.value] as [K, T];
		return {
			status: 'completed',
			value,
		} as AsyncResult<[K, T]>;
	});
	const arrayResult = joinAsync(resultsArray, joinOptions);

	if (arrayResult.status !== 'completed') return arrayResult;

	const value = new Map<K, T>(arrayResult.value);
	return {
		status: 'completed',
		value,
	} as AsyncResult<ReadonlyMap<K, T>>;
}
export function pickByNormalMap<K, V>(
	map: ReadonlyMap<K, V>,
	filter: (value: V, key: K) => boolean,
): Map<K, V> {
	const entries = Array.from(map.entries()).filter(([key, value]) =>
		filter(value, key),
	);

	return new Map<K, V>(entries);
}
