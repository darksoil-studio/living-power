import {
	EntryRecord,
	ZomeClient,
	isSignalFromCellWithRole,
} from '@holochain-open-dev/utils';
import {
	ActionHash,
	AgentPubKey,
	AppClient,
	CreateLink,
	Delete,
	DeleteLink,
	EntryHash,
	Link,
	Record,
	SignedActionHashed,
} from '@holochain/client';

import { MeasurementCollection } from './types.js';
import { BpvDevice } from './types.js';
import { LivingPowerSignal } from './types.js';

export class LivingPowerClient extends ZomeClient<LivingPowerSignal> {
	constructor(
		public client: AppClient,
		public roleName: string,
		public zomeName = 'living_power',
	) {
		super(client, roleName, zomeName);
	}
	/** Bpv Device */

	async createBpvDevice(bpvDevice: BpvDevice): Promise<EntryRecord<BpvDevice>> {
		const record: Record = await this.callZome('create_bpv_device', bpvDevice);
		return new EntryRecord(record);
	}

	async getLatestBpvDevice(
		bpvDeviceHash: ActionHash,
	): Promise<EntryRecord<BpvDevice> | undefined> {
		const record: Record = await this.callZome(
			'get_latest_bpv_device',
			bpvDeviceHash,
		);
		return record ? new EntryRecord(record) : undefined;
	}

	async getOriginalBpvDevice(
		bpvDeviceHash: ActionHash,
	): Promise<EntryRecord<BpvDevice> | undefined> {
		const record: Record = await this.callZome(
			'get_original_bpv_device',
			bpvDeviceHash,
		);
		return record ? new EntryRecord(record) : undefined;
	}

	async getAllRevisionsForBpvDevice(
		bpvDeviceHash: ActionHash,
	): Promise<Array<EntryRecord<BpvDevice>>> {
		const records: Record[] = await this.callZome(
			'get_all_revisions_for_bpv_device',
			bpvDeviceHash,
		);
		return records.map(r => new EntryRecord(r));
	}

	async updateBpvDevice(
		previousBpvDeviceHash: ActionHash,
		updatedBpvDevice: BpvDevice,
	): Promise<EntryRecord<BpvDevice>> {
		const record: Record = await this.callZome('update_bpv_device', {
			previous_bpv_device_hash: previousBpvDeviceHash,
			updated_bpv_device: updatedBpvDevice,
		});
		return new EntryRecord(record);
	}

	deleteBpvDevice(originalBpvDeviceHash: ActionHash): Promise<ActionHash> {
		return this.callZome('delete_bpv_device', originalBpvDeviceHash);
	}

	getAllDeletesForBpvDevice(
		originalBpvDeviceHash: ActionHash,
	): Promise<Array<SignedActionHashed<Delete>>> {
		return this.callZome(
			'get_all_deletes_for_bpv_device',
			originalBpvDeviceHash,
		);
	}

	getOldestDeleteForBpvDevice(
		originalBpvDeviceHash: ActionHash,
	): Promise<SignedActionHashed<Delete> | undefined> {
		return this.callZome(
			'get_oldest_delete_for_bpv_device',
			originalBpvDeviceHash,
		);
	}

	/** All Bpv Devices */

	async getAllBpvDevices(): Promise<Array<Link>> {
		return this.callZome('get_all_bpv_devices', undefined);
	}

	/** Measurement Collection */
	async createMeasurementCollection(
		measurementCollection: MeasurementCollection,
	): Promise<Array<ActionHash>> {
		return await this.callZome(
			'create_measurement_collections',
			measurementCollection,
		);
	}

	async getMeasurementCollection(
		measurementCollectionHash: ActionHash,
	): Promise<EntryRecord<MeasurementCollection> | undefined> {
		const record: Record = await this.callZome(
			'get_measurement_collection',
			measurementCollectionHash,
		);
		return record ? new EntryRecord(record) : undefined;
	}

	deleteMeasurementCollection(
		originalMeasurementCollectionHash: ActionHash,
	): Promise<ActionHash> {
		return this.callZome(
			'delete_measurement_collection',
			originalMeasurementCollectionHash,
		);
	}

	getAllDeletesForMeasurementCollection(
		originalMeasurementCollectionHash: ActionHash,
	): Promise<Array<SignedActionHashed<Delete>>> {
		return this.callZome(
			'get_all_deletes_for_measurement_collection',
			originalMeasurementCollectionHash,
		);
	}

	getOldestDeleteForMeasurementCollection(
		originalMeasurementCollectionHash: ActionHash,
	): Promise<SignedActionHashed<Delete> | undefined> {
		return this.callZome(
			'get_oldest_delete_for_measurement_collection',
			originalMeasurementCollectionHash,
		);
	}

	async getMeasurementCollectionsForBpvDevice(
		bpvDeviceHash: ActionHash,
	): Promise<Array<Link>> {
		return this.callZome(
			'get_measurement_collections_for_bpv_device',
			bpvDeviceHash,
		);
	}

	async getDeletedMeasurementCollectionsForBpvDevice(
		bpvDeviceHash: ActionHash,
	): Promise<
		Array<[SignedActionHashed<CreateLink>, SignedActionHashed<DeleteLink>[]]>
	> {
		return this.callZome(
			'get_deleted_measurement_collections_for_bpv_device',
			bpvDeviceHash,
		);
	}
}
