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

import { BpvDeviceInfo, MeasurementCollection } from './types.js';
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

	async setBpvDeviceInfo(
		arduinoSerialNumber: string,
		info: BpvDeviceInfo,
	): Promise<void> {
		await this.callZome('set_bpv_device_info', {
			arduino_serial_number: arduinoSerialNumber,
			info,
		});
	}

	async getBpvDeviceInfo(arduinoSerialNumber: string): Promise<Array<Link>> {
		return this.callZome('get_bpv_device_info', arduinoSerialNumber);
	}

	async bpvDeviceHash(arduinoSerialNumber: string): Promise<EntryHash> {
		return this.callZome('bpv_device_hash', arduinoSerialNumber);
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
		arduinoSerialNumber: string,
	): Promise<Array<Link>> {
		return this.callZome(
			'get_measurement_collections_for_bpv_device',
			arduinoSerialNumber,
		);
	}

	async getDeletedMeasurementCollectionsForBpvDevice(
		arduinoSerialNumber: string,
	): Promise<
		Array<[SignedActionHashed<CreateLink>, SignedActionHashed<DeleteLink>[]]>
	> {
		return this.callZome(
			'get_deleted_measurement_collections_for_bpv_device',
			arduinoSerialNumber,
		);
	}
}
