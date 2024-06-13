import { BpvDevice } from './types.js';

import {
  AgentPubKeyMap,
  decodeEntry,
  fakeEntry,
  fakeCreateAction,
  fakeUpdateEntry,
  fakeDeleteEntry,
  fakeRecord,
  pickBy,
  ZomeMock,
  RecordBag,
  entryState,
  HoloHashMap,
  HashType,
  hash
} from "@holochain-open-dev/utils";
import {
  decodeHashFromBase64,
  NewEntryAction,
  AgentPubKey,
  ActionHash,
  EntryHash,
  Delete,
  AppClient,
  fakeAgentPubKey,
  fakeDnaHash,
  Link,
  fakeActionHash,
  SignedActionHashed,
  fakeEntryHash,
  Record,
} from "@holochain/client";
import { LivingPowerClient } from './living-power-client.js'

export class LivingPowerZomeMock extends ZomeMock implements AppClient {
  constructor(
    myPubKey?: AgentPubKey
  ) {
    super("living_power_test", "living_power", myPubKey);
  }
  /** Bpv Device */
  bpvDevices = new HoloHashMap<ActionHash, {
    deletes: Array<SignedActionHashed<Delete>>;
    revisions: Array<Record>;
  }>();

  async create_bpv_device(bpvDevice: BpvDevice): Promise<Record> {
    const entryHash = hash(bpvDevice, HashType.ENTRY);
    const record = await fakeRecord(await fakeCreateAction(entryHash), fakeEntry(bpvDevice));
    
    this.bpvDevices.set(record.signed_action.hashed.hash, {
      deletes: [],
      revisions: [record]
    });
  

    return record;
  }
  
  async get_latest_bpv_device(bpvDeviceHash: ActionHash): Promise<Record | undefined> {
    const bpvDevice = this.bpvDevices.get(bpvDeviceHash);
    return bpvDevice ? bpvDevice.revisions[bpvDevice.revisions.length - 1] : undefined;
  }
  
  async get_all_revisions_for_bpv_device(bpvDeviceHash: ActionHash): Promise<Record[] | undefined> {
    const bpvDevice = this.bpvDevices.get(bpvDeviceHash);
    return bpvDevice ? bpvDevice.revisions : undefined;
  }
  
  async get_original_bpv_device(bpvDeviceHash: ActionHash): Promise<Record | undefined> {
    const bpvDevice = this.bpvDevices.get(bpvDeviceHash);
    return bpvDevice ? bpvDevice.revisions[0] : undefined;
  }
  
  async get_all_deletes_for_bpv_device(bpvDeviceHash: ActionHash): Promise<Array<SignedActionHashed<Delete>> | undefined> {
    const bpvDevice = this.bpvDevices.get(bpvDeviceHash);
    return bpvDevice ? bpvDevice.deletes : undefined;
  }

  async get_oldest_delete_for_bpv_device(bpvDeviceHash: ActionHash): Promise<SignedActionHashed<Delete> | undefined> {
    const bpvDevice = this.bpvDevices.get(bpvDeviceHash);
    return bpvDevice ? bpvDevice.deletes[0] : undefined;
  }
  async delete_bpv_device(original_bpv_device_hash: ActionHash): Promise<ActionHash> {
    const record = await fakeRecord(await fakeDeleteEntry(original_bpv_device_hash));
    
    this.bpvDevices.get(original_bpvDevice_hash).deletes.push(record.signed_action as SignedActionHashed<Delete>);
    
    return record.signed_action.hashed.hash;
  }

  async update_bpv_device(input: { previous_bpv_device_hash: ActionHash; updated_bpv_device: BpvDevice; }): Promise<Record> {
    const record = await fakeRecord(await fakeUpdateEntry(input.previous_bpv_device_hash, undefined, undefined, fakeEntry(input.updated_bpv_device)), fakeEntry(input.updated_bpv_device));

    for (const [originalHash, bpvDevice] of Array.from(this.bpvDevices.entries())) {
      if (bpvDevice.revisions.find(r => r.signed_action.hashed.hash.toString() === input.previous_bpv_device_hash.toString())) {
        bpvDevice.revisions.push(record);
      }
    }
     
    const bpvDevice = input.updated_bpv_device;
    
    
    return record;
  }
  

}

export async function sampleBpvDevice(client: LivingPowerClient, partialBpvDevice: Partial<BpvDevice> = {}): Promise<BpvDevice> {
    return {
        ...{
          name: "Lorem ipsum 2",
          arduino_serial_number: "Lorem ipsum 2",
        },
        ...partialBpvDevice
    };
}
