import {
	AsyncComputed,
	allRevisionsOfEntrySignal,
	collectionSignal,
	deletedLinksSignal,
	deletesForEntrySignal,
	fromPromise,
	immutableEntrySignal,
	latestVersionOfEntrySignal,
	liveLinksSignal,
	pipe,
} from '@holochain-open-dev/signals';
import {
	EntryRecord,
	HashType,
	LazyHoloHashMap,
	LazyMap,
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

import { getLastMeasurement } from '../../arduinos/collect-measurements.js';
import { connectedArduinos } from '../../arduinos/connected-arduinos.js';
import { LivingPowerClient } from './living-power-client.js';
import { MeasurementCollection } from './types.js';
import { BpvDevice } from './types.js';

export class LivingPowerStore {
	constructor(public client: LivingPowerClient) {}

	connectedArduinos = connectedArduinos();

	/** Bpv Device */

	bpvDevices = new LazyHoloHashMap((bpvDeviceHash: ActionHash) => {
		const original = immutableEntrySignal(() =>
			this.client.getOriginalBpvDevice(bpvDeviceHash),
		);
		return {
			latestVersion: latestVersionOfEntrySignal(this.client, () =>
				this.client.getLatestBpvDevice(bpvDeviceHash),
			),
			original,
			allRevisions: allRevisionsOfEntrySignal(this.client, () =>
				this.client.getAllRevisionsForBpvDevice(bpvDeviceHash),
			),
			deletes: deletesForEntrySignal(this.client, bpvDeviceHash, () =>
				this.client.getAllDeletesForBpvDevice(bpvDeviceHash),
			),
			connectedArduino: pipe(
				this.connectedArduinos,
				_ => original,
				(bpvDevice, arduinos) => {
					const serialPortInfo = arduinos.find(
						a =>
							a.port_type?.UsbPort.serial_number ===
							bpvDevice.entry.arduino_serial_number,
					);

					if (!serialPortInfo) return undefined;
					return {
						serialPortInfo,
						lastMeasurement: fromPromise(() =>
							getLastMeasurement(serialPortInfo.port_name),
						),
					};
				},
			),
			measurementCollections: {
				live: pipe(
					liveLinksSignal(
						this.client,
						bpvDeviceHash,
						() =>
							this.client.getMeasurementCollectionsForBpvDevice(bpvDeviceHash),
						'BpvDeviceToMeasurementCollections',
					),
					links =>
						slice(
							this.measurementCollections,
							links.map(l => l.target),
						),
				),
				deleted: pipe(
					deletedLinksSignal(
						this.client,
						bpvDeviceHash,
						() =>
							this.client.getDeletedMeasurementCollectionsForBpvDevice(
								bpvDeviceHash,
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
			slice(
				this.bpvDevices,
				allBpvDevices.map(l => l.target),
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
