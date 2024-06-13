import { MeasureCollection } from './types.js';

import { BpvDevice } from './types.js';

import { 
  SignedActionHashed,
  CreateLink,
  Link,
  DeleteLink,
  Delete,
  AppClient, 
  Record, 
  ActionHash, 
  EntryHash, 
  AgentPubKey,
} from '@holochain/client';
import { isSignalFromCellWithRole, EntryRecord, ZomeClient } from '@holochain-open-dev/utils';

import { LivingPowerSignal } from './types.js';

export class LivingPowerClient extends ZomeClient<LivingPowerSignal> {
  constructor(public client: AppClient, public roleName: string, public zomeName = 'living_power') {
    super(client, roleName, zomeName);
  }
  /** Bpv Device */

  async createBpvDevice(bpvDevice: BpvDevice): Promise<EntryRecord<BpvDevice>> {
    const record: Record = await this.callZome('create_bpv_device', bpvDevice);
    return new EntryRecord(record);
  }
  
  async getLatestBpvDevice(bpvDeviceHash: ActionHash): Promise<EntryRecord<BpvDevice> | undefined> {
    const record: Record = await this.callZome('get_latest_bpv_device', bpvDeviceHash);
    return record ? new EntryRecord(record) : undefined;
  }

  async getOriginalBpvDevice(bpvDeviceHash: ActionHash): Promise<EntryRecord<BpvDevice> | undefined> {
    const record: Record = await this.callZome('get_original_bpv_device', bpvDeviceHash);
    return record ? new EntryRecord(record) : undefined;
  }

  async getAllRevisionsForBpvDevice(bpvDeviceHash: ActionHash): Promise<Array<EntryRecord<BpvDevice>>> {
    const records: Record[] = await this.callZome('get_all_revisions_for_bpv_device', bpvDeviceHash);
    return records.map(r => new EntryRecord(r));
  }

  async updateBpvDevice(previousBpvDeviceHash: ActionHash, updatedBpvDevice: BpvDevice): Promise<EntryRecord<BpvDevice>> {
    const record: Record = await this.callZome('update_bpv_device', {
      previous_bpv_device_hash: previousBpvDeviceHash,
      updated_bpv_device: updatedBpvDevice
    });
    return new EntryRecord(record);
  }

  deleteBpvDevice(originalBpvDeviceHash: ActionHash): Promise<ActionHash> {
    return this.callZome('delete_bpv_device', originalBpvDeviceHash);
  }

  getAllDeletesForBpvDevice(originalBpvDeviceHash: ActionHash): Promise<Array<SignedActionHashed<Delete>>> {
    return this.callZome('get_all_deletes_for_bpv_device', originalBpvDeviceHash);
  }

  getOldestDeleteForBpvDevice(originalBpvDeviceHash: ActionHash): Promise<SignedActionHashed<Delete> | undefined> {
    return this.callZome('get_oldest_delete_for_bpv_device', originalBpvDeviceHash);
  }

  /** All Bpv Devices */

  async getAllBpvDevices(): Promise<Array<Link>> {
    return this.callZome('get_all_bpv_devices', undefined);
  }
  /** Measure Collection */

  async createMeasureCollection(measureCollection: MeasureCollection): Promise<EntryRecord<MeasureCollection>> {
    const record: Record = await this.callZome('create_measure_collection', measureCollection);
    return new EntryRecord(record);
  }
  
  async getMeasureCollection(measureCollectionHash: ActionHash): Promise<EntryRecord<MeasureCollection> | undefined> {
    const record: Record = await this.callZome('get_measure_collection', measureCollectionHash);
    return record ? new EntryRecord(record) : undefined;
  }

  deleteMeasureCollection(originalMeasureCollectionHash: ActionHash): Promise<ActionHash> {
    return this.callZome('delete_measure_collection', originalMeasureCollectionHash);
  }

  getAllDeletesForMeasureCollection(originalMeasureCollectionHash: ActionHash): Promise<Array<SignedActionHashed<Delete>>> {
    return this.callZome('get_all_deletes_for_measure_collection', originalMeasureCollectionHash);
  }

  getOldestDeleteForMeasureCollection(originalMeasureCollectionHash: ActionHash): Promise<SignedActionHashed<Delete> | undefined> {
    return this.callZome('get_oldest_delete_for_measure_collection', originalMeasureCollectionHash);
  }
  
  async getMeasureCollectionsForBpvDevice(bpvDeviceHash: ActionHash): Promise<Array<Link>> {
    return this.callZome('get_measure_collections_for_bpv_device', bpvDeviceHash);
  }

  async getDeletedMeasureCollectionsForBpvDevice(bpvDeviceHash: ActionHash): Promise<Array<[SignedActionHashed<CreateLink>, SignedActionHashed<DeleteLink>[]]>> {
    return this.callZome('get_deleted_measure_collections_for_bpv_device', bpvDeviceHash);
  }

}
