import {
	AgentPubKeyMap,
	HashType,
	HoloHashMap,
	RecordBag,
	ZomeMock,
	decodeEntry,
	entryState,
	fakeCreateAction,
	fakeDeleteEntry,
	fakeEntry,
	fakeRecord,
	fakeUpdateEntry,
	hash,
	pickBy,
} from '@holochain-open-dev/utils';
import {
	ActionHash,
	AgentPubKey,
	AppClient,
	Delete,
	EntryHash,
	Link,
	NewEntryAction,
	Record,
	SignedActionHashed,
	decodeHashFromBase64,
	fakeActionHash,
	fakeAgentPubKey,
	fakeDnaHash,
	fakeEntryHash,
} from '@holochain/client';

import { LivingPowerClient } from './living-power-client.js';
import { MeasurementCollection } from './types.js';
import { BpvDevice } from './types.js';

export class LivingPowerZomeMock extends ZomeMock implements AppClient {
	constructor(myPubKey?: AgentPubKey) {
		super('living_power_test', 'living_power', myPubKey);
	}
	/** Bpv Device */
	bpvDevices = new HoloHashMap<
		ActionHash,
		{
			deletes: Array<SignedActionHashed<Delete>>;
			revisions: Array<Record>;
		}
	>();

	async create_bpv_device(bpvDevice: BpvDevice): Promise<Record> {
		const entryHash = hash(bpvDevice, HashType.ENTRY);
		const record = await fakeRecord(
			await fakeCreateAction(entryHash),
			fakeEntry(bpvDevice),
		);

		this.bpvDevices.set(record.signed_action.hashed.hash, {
			deletes: [],
			revisions: [record],
		});

		return record;
	}

	async get_latest_bpv_device(
		bpvDeviceHash: ActionHash,
	): Promise<Record | undefined> {
		const bpvDevice = this.bpvDevices.get(bpvDeviceHash);
		return bpvDevice
			? bpvDevice.revisions[bpvDevice.revisions.length - 1]
			: undefined;
	}

	async get_all_revisions_for_bpv_device(
		bpvDeviceHash: ActionHash,
	): Promise<Record[] | undefined> {
		const bpvDevice = this.bpvDevices.get(bpvDeviceHash);
		return bpvDevice ? bpvDevice.revisions : undefined;
	}

	async get_original_bpv_device(
		bpvDeviceHash: ActionHash,
	): Promise<Record | undefined> {
		const bpvDevice = this.bpvDevices.get(bpvDeviceHash);
		return bpvDevice ? bpvDevice.revisions[0] : undefined;
	}

	async get_all_deletes_for_bpv_device(
		bpvDeviceHash: ActionHash,
	): Promise<Array<SignedActionHashed<Delete>> | undefined> {
		const bpvDevice = this.bpvDevices.get(bpvDeviceHash);
		return bpvDevice ? bpvDevice.deletes : undefined;
	}

	async get_oldest_delete_for_bpv_device(
		bpvDeviceHash: ActionHash,
	): Promise<SignedActionHashed<Delete> | undefined> {
		const bpvDevice = this.bpvDevices.get(bpvDeviceHash);
		return bpvDevice ? bpvDevice.deletes[0] : undefined;
	}
	async delete_bpv_device(
		original_bpv_device_hash: ActionHash,
	): Promise<ActionHash> {
		const record = await fakeRecord(
			await fakeDeleteEntry(original_bpv_device_hash),
		);

		this.bpvDevices
			.get(original_bpv_device_hash)
			.deletes.push(record.signed_action as SignedActionHashed<Delete>);

		return record.signed_action.hashed.hash;
	}

	async update_bpv_device(input: {
		previous_bpv_device_hash: ActionHash;
		updated_bpv_device: BpvDevice;
	}): Promise<Record> {
		const record = await fakeRecord(
			await fakeUpdateEntry(
				input.previous_bpv_device_hash,
				undefined,
				undefined,
				fakeEntry(input.updated_bpv_device),
			),
			fakeEntry(input.updated_bpv_device),
		);

		for (const [originalHash, bpvDevice] of Array.from(
			this.bpvDevices.entries(),
		)) {
			if (
				bpvDevice.revisions.find(
					r =>
						r.signed_action.hashed.hash.toString() ===
						input.previous_bpv_device_hash.toString(),
				)
			) {
				bpvDevice.revisions.push(record);
			}
		}

		const bpvDevice = input.updated_bpv_device;

		return record;
	}

	async get_all_bpv_devices(): Promise<Array<Link>> {
		const records: Record[] = Array.from(this.bpvDevices.values()).map(
			r => r.revisions[r.revisions.length - 1],
		);
		return Promise.all(
			records.map(async record => ({
				target: record.signed_action.hashed.hash,
				author: record.signed_action.hashed.content.author,
				timestamp: record.signed_action.hashed.content.timestamp,
				zome_index: 0,
				link_type: 0,
				tag: new Uint8Array(),
				create_link_hash: await fakeActionHash(),
			})),
		);
	}
	/** Measurement Collection */
	measurementCollections = new HoloHashMap<
		ActionHash,
		{
			deletes: Array<SignedActionHashed<Delete>>;
			revisions: Array<Record>;
		}
	>();
	measurementCollectionsForBpvDevice = new HoloHashMap<ActionHash, Link[]>();

	async create_measurement_collections(
		measurementCollection: MeasurementCollection,
	): Promise<Record> {
		const entryHash = hash(measurementCollection, HashType.ENTRY);
		const record = await fakeRecord(
			await fakeCreateAction(entryHash),
			fakeEntry(measurementCollection),
		);

		this.measurementCollections.set(record.signed_action.hashed.hash, {
			deletes: [],
			revisions: [record],
		});

		const existingBpvDeviceHash =
			this.measurementCollectionsForBpvDevice.get(
				measurementCollection.bpv_device_hash,
			) || [];
		this.measurementCollectionsForBpvDevice.set(
			measurementCollection.bpv_device_hash,
			[
				...existingBpvDeviceHash,
				{
					target: record.signed_action.hashed.hash,
					author: this.myPubKey,
					timestamp: Date.now() * 1000,
					zome_index: 0,
					link_type: 0,
					tag: new Uint8Array(),
					create_link_hash: await fakeActionHash(),
				},
			],
		);

		return record;
	}

	async get_measurement_collection(
		measurementCollectionHash: ActionHash,
	): Promise<Record | undefined> {
		const measurementCollection = this.measurementCollections.get(
			measurementCollectionHash,
		);
		return measurementCollection
			? measurementCollection.revisions[0]
			: undefined;
	}

	async get_all_deletes_for_measurement_collection(
		measurementCollectionHash: ActionHash,
	): Promise<Array<SignedActionHashed<Delete>> | undefined> {
		const measurementCollection = this.measurementCollections.get(
			measurementCollectionHash,
		);
		return measurementCollection ? measurementCollection.deletes : undefined;
	}

	async get_oldest_delete_for_measurement_collection(
		measurementCollectionHash: ActionHash,
	): Promise<SignedActionHashed<Delete> | undefined> {
		const measurementCollection = this.measurementCollections.get(
			measurementCollectionHash,
		);
		return measurementCollection ? measurementCollection.deletes[0] : undefined;
	}
	async delete_measurement_collection(
		original_measurement_collection_hash: ActionHash,
	): Promise<ActionHash> {
		const record = await fakeRecord(
			await fakeDeleteEntry(original_measurement_collection_hash),
		);

		this.measurementCollections
			.get(original_measurement_collection_hash)
			.deletes.push(record.signed_action as SignedActionHashed<Delete>);

		return record.signed_action.hashed.hash;
	}

	async get_measurement_collections_for_bpv_device(
		bpvDeviceHash: ActionHash,
	): Promise<Array<Link>> {
		return this.measurementCollectionsForBpvDevice.get(bpvDeviceHash) || [];
	}
}

export async function sampleBpvDevice(
	client: LivingPowerClient,
	partialBpvDevice: Partial<BpvDevice> = {},
): Promise<BpvDevice> {
	return {
		...{
			name: 'Lorem ipsum 2',
			arduino_serial_number: 'Lorem ipsum 2',
		},
		...partialBpvDevice,
	};
}

export async function sampleMeasurementCollection(
	client: LivingPowerClient,
	partialMeasurementCollection: Partial<MeasurementCollection> = {},
): Promise<MeasurementCollection> {
	return {
		...{
			bpv_device_hash:
				partialMeasurementCollection.bpv_device_hash ||
				(await client.createBpvDevice(await sampleBpvDevice(client)))
					.actionHash,
			measurements: [
				{
					humidity_percentage: 40,
					light_level_lux: 20,
					temperature_celsius: 10,
					timestamp: Date.now() * 1000,
					voltage_millivolts: 300,
				},
			],
			external_resistor_ohms: 3,
		},
		...partialMeasurementCollection,
	};
}
