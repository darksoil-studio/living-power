import { assert, test } from "vitest";

import { runScenario, dhtSync } from '@holochain/tryorama';
import { ActionHash, SignedActionHashed, Delete, Record } from '@holochain/client';
import { decode } from '@msgpack/msgpack';
import { EntryRecord } from '@holochain-open-dev/utils';
import { cleanNodeDecoding } from '@holochain-open-dev/utils/dist/clean-node-decoding.js';
import { toPromise } from '@holochain-open-dev/signals';

import { MeasureCollection } from '../../../../ui/src/living_power/living_power/types.js';
import { sampleMeasureCollection } from '../../../../ui/src/living_power/living_power/mocks.js';
import { setup } from './setup.js';

test('create MeasureCollection', async () => {
  await runScenario(async scenario => {
    const { alice, bob } = await setup(scenario);

    // Alice creates a MeasureCollection
    const measureCollection: EntryRecord<MeasureCollection> = await alice.store.client.createMeasureCollection(await sampleMeasureCollection(alice.store.client));
    assert.ok(measureCollection);
  });
});

test('create and read MeasureCollection', async () => {
  await runScenario(async scenario => {
    const { alice, bob } = await setup(scenario);

    const sample = await sampleMeasureCollection(alice.store.client);

    // Alice creates a MeasureCollection
    const measureCollection: EntryRecord<MeasureCollection> = await alice.store.client.createMeasureCollection(sample);
    assert.ok(measureCollection);

    // Wait for the created entry to be propagated to the other node.
    await dhtSync(
      [alice.player, bob.player],
      alice.player.cells[0].cell_id[0]
    );

    // Bob gets the created MeasureCollection
    const createReadOutput: EntryRecord<MeasureCollection> = await toPromise(bob.store.measureCollections.get(measureCollection.actionHash).entry);
    assert.deepEqual(sample, cleanNodeDecoding(createReadOutput.entry));
  });
});


test('create and delete MeasureCollection', async () => {
  await runScenario(async scenario => {
    const { alice, bob } = await setup(scenario);

    // Alice creates a MeasureCollection
    const measureCollection: EntryRecord<MeasureCollection> = await alice.store.client.createMeasureCollection(await sampleMeasureCollection(alice.store.client));
    assert.ok(measureCollection);
        
    // Alice deletes the MeasureCollection
    const deleteActionHash = await alice.store.client.deleteMeasureCollection(measureCollection.actionHash);
    assert.ok(deleteActionHash);

    // Wait for the created entry to be propagated to the other node.
    await dhtSync(
      [alice.player, bob.player],
      alice.player.cells[0].cell_id[0]
    );
        
    // Bob tries to get the deleted MeasureCollection
    const deletes: Array<SignedActionHashed<Delete>> = await toPromise(bob.store.measureCollections.get(measureCollection.actionHash).deletes);
    assert.equal(deletes.length, 1);
  });
});
