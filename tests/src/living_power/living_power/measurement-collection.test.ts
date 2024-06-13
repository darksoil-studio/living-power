import { toPromise } from '@holochain-open-dev/signals';
import { EntryRecord } from '@holochain-open-dev/utils';
import { cleanNodeDecoding } from '@holochain-open-dev/utils/dist/clean-node-decoding.js';
import {
	ActionHash,
	Delete,
	Record,
	SignedActionHashed,
} from '@holochain/client';
import { dhtSync, runScenario } from '@holochain/tryorama';
import { decode } from '@msgpack/msgpack';
import { assert, test } from 'vitest';

import { sampleMeasurementCollection } from '../../../../ui/src/living_power/living_power/mocks.js';
import { MeasurementCollection } from '../../../../ui/src/living_power/living_power/types.js';
import { setup } from './setup.js';

test('create MeasurementCollection', async () => {
	await runScenario(async scenario => {
		const { alice, bob } = await setup(scenario);

		// Alice creates a MeasurementCollection
		const measurementCollection: EntryRecord<MeasurementCollection> =
			await alice.store.client.createMeasurementCollection(
				await sampleMeasurementCollection(alice.store.client),
			);
		assert.ok(measurementCollection);
	});
});

test('create and read MeasurementCollection', async () => {
	await runScenario(async scenario => {
		const { alice, bob } = await setup(scenario);

		const sample = await sampleMeasurementCollection(alice.store.client);

		// Alice creates a MeasurementCollection
		const measurementCollection: EntryRecord<MeasurementCollection> =
			await alice.store.client.createMeasurementCollection(sample);
		assert.ok(measurementCollection);

		// Wait for the created entry to be propagated to the other node.
		await dhtSync([alice.player, bob.player], alice.player.cells[0].cell_id[0]);

		// Bob gets the created MeasurementCollection
		const createReadOutput: EntryRecord<MeasurementCollection> =
			await toPromise(
				bob.store.measurementCollections.get(measurementCollection.actionHash)
					.entry,
			);
		assert.deepEqual(sample, cleanNodeDecoding(createReadOutput.entry));
	});
});

test('create and delete MeasurementCollection', async () => {
	await runScenario(async scenario => {
		const { alice, bob } = await setup(scenario);

		// Alice creates a MeasurementCollection
		const measurementCollection: EntryRecord<MeasurementCollection> =
			await alice.store.client.createMeasurementCollection(
				await sampleMeasurementCollection(alice.store.client),
			);
		assert.ok(measurementCollection);

		// Alice deletes the MeasurementCollection
		const deleteActionHash =
			await alice.store.client.deleteMeasurementCollection(
				measurementCollection.actionHash,
			);
		assert.ok(deleteActionHash);

		// Wait for the created entry to be propagated to the other node.
		await dhtSync([alice.player, bob.player], alice.player.cells[0].cell_id[0]);

		// Bob tries to get the deleted MeasurementCollection
		const deletes: Array<SignedActionHashed<Delete>> = await toPromise(
			bob.store.measurementCollections.get(measurementCollection.actionHash)
				.deletes,
		);
		assert.equal(deletes.length, 1);
	});
});
