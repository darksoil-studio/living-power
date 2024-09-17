import { toPromise } from '@holochain-open-dev/signals';
import { dhtSync, runScenario } from '@holochain/tryorama';
import { assert, test } from 'vitest';

import { setup } from './setup.js';

test('create a BpvDevice and get all bpv devices', async () => {
	await runScenario(async scenario => {
		const { alice, bob } = await setup(scenario);

		// Bob gets all bpv devices
		let collectionOutput = await toPromise(bob.store.allBpvDevices);
		assert.equal(collectionOutput.size, 0);

		// Alice adds a BpvDevice
		await alice.store.client.setBpvDeviceInfo('someserialnumber', {
			name: 'alicesdevice',
		});

		// Bob adds a BpvDevice
		await alice.store.client.setBpvDeviceInfo('someserialnumber', {
			name: 'bobsdevice',
		});

		await dhtSync([alice.player, bob.player], alice.player.cells[0].cell_id[0]);

		// Bob gets all bpv devices again
		collectionOutput = await toPromise(bob.store.allBpvDevices);
		assert.equal(collectionOutput.size, 1);
		assert.equal(Array.from(collectionOutput.keys())[0], 'someserialnumber');
		const info = await toPromise(Array.from(collectionOutput.values())[0].info);

		assert.ok(info.name === 'alicesdevice' || info.name === 'bobsdevice');
	});
});
