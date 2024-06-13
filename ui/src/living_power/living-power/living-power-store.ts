import { BpvDevice } from './types.js';

import { 
  collectionSignal, 
  liveLinksSignal, 
  deletedLinksSignal, 
  allRevisionsOfEntrySignal,
  latestVersionOfEntrySignal, 
  immutableEntrySignal, 
  deletesForEntrySignal,
  pipe,
  AsyncComputed
} from "@holochain-open-dev/signals";
import { slice, HashType, retype, EntryRecord, LazyHoloHashMap } from "@holochain-open-dev/utils";
import { NewEntryAction, Record, ActionHash, EntryHash, AgentPubKey } from '@holochain/client';

import { LivingPowerClient } from './living-power-client.js';

export class LivingPowerStore {
  constructor(public client: LivingPowerClient) {}
  
  /** Bpv Device */

  bpvDevices = new LazyHoloHashMap((bpvDeviceHash: ActionHash) => ({
    latestVersion: latestVersionOfEntrySignal(this.client, () => this.client.getLatestBpvDevice(bpvDeviceHash)),
    original: immutableEntrySignal(() => this.client.getOriginalBpvDevice(bpvDeviceHash)),
    allRevisions: allRevisionsOfEntrySignal(this.client, () => this.client.getAllRevisionsForBpvDevice(bpvDeviceHash)),
    deletes: deletesForEntrySignal(this.client, bpvDeviceHash, () => this.client.getAllDeletesForBpvDevice(bpvDeviceHash)),
  }));
  
  /** All Bpv Devices */

  allBpvDevices = pipe(
    collectionSignal(
      this.client, 
      () => this.client.getAllBpvDevices(),
      'AllBpvDevices'
    ),
    allBpvDevices => slice(this.bpvDevices, allBpvDevices.map(l => l.target))
  );
}
