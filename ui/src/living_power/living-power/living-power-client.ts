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
  
}
