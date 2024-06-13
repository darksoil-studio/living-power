import { assert, test } from "vitest";

import { runScenario, dhtSync } from '@holochain/tryorama';
import { ActionHash, SignedActionHashed, Delete, Record } from '@holochain/client';
import { decode } from '@msgpack/msgpack';
import { EntryRecord } from '@holochain-open-dev/utils';
import { cleanNodeDecoding } from '@holochain-open-dev/utils/dist/clean-node-decoding.js';
import { toPromise } from '@holochain-open-dev/signals';

import { BpvDevice } from '../../../../ui/src/living_power/living_power/types.js';
import { sampleBpvDevice } from '../../../../ui/src/living_power/living_power/mocks.js';
import { setup } from './setup.js';

test('create BpvDevice', async () => {
  await runScenario(async scenario => {
    const { alice, bob } = await setup(scenario);

    // Alice creates a BpvDevice
    const bpvDevice: EntryRecord<BpvDevice> = await alice.store.client.createBpvDevice(await sampleBpvDevice(alice.store.client));
    assert.ok(bpvDevice);
  });
});

test('create and read BpvDevice', async () => {
  await runScenario(async scenario => {
    const { alice, bob } = await setup(scenario);

    const sample = await sampleBpvDevice(alice.store.client);

    // Alice creates a BpvDevice
    const bpvDevice: EntryRecord<BpvDevice> = await alice.store.client.createBpvDevice(sample);
    assert.ok(bpvDevice);

    // Wait for the created entry to be propagated to the other node.
    await dhtSync(
      [alice.player, bob.player],
      alice.player.cells[0].cell_id[0]
    );

    // Bob gets the created BpvDevice
    const createReadOutput: EntryRecord<BpvDevice> = await toPromise(bob.store.bpvDevices.get(bpvDevice.actionHash).original);
    assert.deepEqual(sample, cleanNodeDecoding(createReadOutput.entry));
  });
});

test('create and update BpvDevice', async () => {
  await runScenario(async scenario => {
    const { alice, bob } = await setup(scenario);

    // Alice creates a BpvDevice
    const bpvDevice: EntryRecord<BpvDevice> = await alice.store.client.createBpvDevice(await sampleBpvDevice(alice.store.client));
    assert.ok(bpvDevice);
        
    const originalActionHash = bpvDevice.actionHash;
 
    // Alice updates the BpvDevice
    let contentUpdate = await sampleBpvDevice(alice.store.client);

    let updatedBpvDevice: EntryRecord<BpvDevice> = await alice.store.client.updateBpvDevice(originalActionHash, contentUpdate);
    assert.ok(updatedBpvDevice);

    // Wait for the created entry to be propagated to the other node.
    await dhtSync(
      [alice.player, bob.player],
      alice.player.cells[0].cell_id[0]
    );
        
    // Bob gets the updated BpvDevice
    const readUpdatedOutput0: EntryRecord<BpvDevice> = await toPromise(bob.store.bpvDevices.get(bpvDevice.actionHash).latestVersion);
    assert.deepEqual(contentUpdate, cleanNodeDecoding(readUpdatedOutput0.entry));

    // Alice updates the BpvDevice again
    contentUpdate = await sampleBpvDevice(alice.store.client);

    updatedBpvDevice = await alice.store.client.updateBpvDevice(updatedBpvDevice.actionHash, contentUpdate);
    assert.ok(updatedBpvDevice);

    // Wait for the created entry to be propagated to the other node.
    await dhtSync(
      [alice.player, bob.player],
      alice.player.cells[0].cell_id[0]
    );
        
    // Bob gets the updated BpvDevice
    const readUpdatedOutput1: EntryRecord<BpvDevice> = await toPromise(bob.store.bpvDevices.get(originalActionHash).latestVersion);
    assert.deepEqual(contentUpdate, cleanNodeDecoding(readUpdatedOutput1.entry));
  });
});

test('create and delete BpvDevice', async () => {
  await runScenario(async scenario => {
    const { alice, bob } = await setup(scenario);

    // Alice creates a BpvDevice
    const bpvDevice: EntryRecord<BpvDevice> = await alice.store.client.createBpvDevice(await sampleBpvDevice(alice.store.client));
    assert.ok(bpvDevice);
        
    // Alice deletes the BpvDevice
    const deleteActionHash = await alice.store.client.deleteBpvDevice(bpvDevice.actionHash);
    assert.ok(deleteActionHash);

    // Wait for the created entry to be propagated to the other node.
    await dhtSync(
      [alice.player, bob.player],
      alice.player.cells[0].cell_id[0]
    );
        
    // Bob tries to get the deleted BpvDevice
    const deletes: Array<SignedActionHashed<Delete>> = await toPromise(bob.store.bpvDevices.get(bpvDevice.actionHash).deletes);
    assert.equal(deletes.length, 1);
  });
});
