import {
	AsyncComputed,
	allRevisionsOfEntrySignal,
	collectionSignal,
	deletedLinksSignal,
	deletesForEntrySignal,
	immutableEntrySignal,
	latestVersionOfEntrySignal,
	liveLinksSignal,
	pipe,
} from '@holochain-open-dev/signals';
import {
	EntryRecord,
	HashType,
	LazyHoloHashMap,
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

import { connectedArduinos } from '../../arduinos/connected-arduinos.js';
import { LivingPowerClient } from './living-power-client.js';
import { MeasurementCollection } from './types.js';
import { BpvDevice } from './types.js';

export class LivingPowerStore {
	constructor(public client: LivingPowerClient) {}

	connectedArduinos = connectedArduinos();

	/** Bpv Device */

	bpvDevices = new LazyHoloHashMap((bpvDeviceHash: ActionHash) => ({
		latestVersion: latestVersionOfEntrySignal(this.client, () =>
			this.client.getLatestBpvDevice(bpvDeviceHash),
		),
		original: immutableEntrySignal(() =>
			this.client.getOriginalBpvDevice(bpvDeviceHash),
		),
		allRevisions: allRevisionsOfEntrySignal(this.client, () =>
			this.client.getAllRevisionsForBpvDevice(bpvDeviceHash),
		),
		deletes: deletesForEntrySignal(this.client, bpvDeviceHash, () =>
			this.client.getAllDeletesForBpvDevice(bpvDeviceHash),
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
	}));

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
