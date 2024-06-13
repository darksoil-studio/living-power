import { assert, test } from "vitest";

import { runScenario, dhtSync } from '@holochain/tryorama';
import { ActionHash, Record, EntryHash } from '@holochain/client';
import { decode } from '@msgpack/msgpack';
import { EntryRecord } from '@holochain-open-dev/utils';
import { toPromise } from '@holochain-open-dev/signals';

import { BpvDevice } from '../../../../ui/src/living_power/living_power/types.js';
import { sampleBpvDevice } from '../../../../ui/src/living_power/living_power/mocks.js';
import { setup } from './setup.js';

test('create a BpvDevice and get all bpv devices', async () => {
  await runScenario(async scenario => {
    const { alice, bob } = await setup(scenario);

    // Bob gets all bpv devices
    let collectionOutput = await toPromise(bob.store.allBpvDevices);
    assert.equal(collectionOutput.size, 0);

    // Alice creates a BpvDevice
    const bpvDevice: EntryRecord<BpvDevice> = await alice.store.client.createBpvDevice(await sampleBpvDevice(alice.store.client));
    assert.ok(bpvDevice);
    
    await dhtSync(
      [alice.player, bob.player],
      alice.player.cells[0].cell_id[0]
    );
    
    // Bob gets all bpv devices again
    collectionOutput = await toPromise(bob.store.allBpvDevices);
    assert.equal(collectionOutput.size, 1);
    assert.deepEqual(bpvDevice.actionHash, Array.from(collectionOutput.keys())[0]);    
  });
});

