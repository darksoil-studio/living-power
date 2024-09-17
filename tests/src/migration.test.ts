import { toPromise } from '@holochain-open-dev/signals';
import { decodePath } from '@holochain-open-dev/utils';
import { CellId, CellType } from '@holochain/client';
import {
	AgentApp,
	dhtSync,
	enableAndGetAgentApp,
	pause,
	runScenario,
} from '@holochain/tryorama';
import { assert, test } from 'vitest';

import { LivingPowerClient } from '../../ui/src/living_power/living_power/living-power-client.js';
import { LivingPowerStore } from '../../ui/src/living_power/living_power/living-power-store.js';
import { sampleMeasurementCollection } from '../../ui/src/living_power/living_power/mocks.js';
import { appPath, oldAppPath } from './app-path.js';
import { setup } from './living_power/living_power/setup.js';

test('migrate from the previous happ to the new version, assert that the data is maintainted', async () => {
	await runScenario(async scenario => {
		const { alice, bob } = await setup(scenario, oldAppPath);

		// Bob gets all bpv devices
		let collectionOutput = await toPromise(bob.store.allBpvDevices);
		assert.equal(collectionOutput.size, 0);

		// Alice adds a BpvDevice
		await alice.store.client.setBpvDeviceInfo('someserialnumber', {
			name: 'alicesdevice',
		});

		await dhtSync([alice.player, bob.player], alice.player.cells[0].cell_id[0]);

		// Bob gets all bpv devices again
		collectionOutput = await toPromise(bob.store.allBpvDevices);
		assert.equal(collectionOutput.size, 1);
		assert.equal(Array.from(collectionOutput.keys())[0], 'someserialnumber');
		const info = await toPromise(Array.from(collectionOutput.values())[0].info);

		assert.equal(info.name, 'alicesdevice');

		await alice.store.client.createMeasurementCollection(
			await sampleMeasurementCollection(alice.store.client),
		);
		await alice.store.client.createMeasurementCollection(
			await sampleMeasurementCollection(alice.store.client),
		);

		const appInfo = await alice.player.conductor.installApp(
			{
				path: appPath,
			},
			{
				agentPubKey: alice.player.cells[0].cell_id[1],
			},
		);
		const port = await alice.player.conductor.attachAppInterface();
		const issued = await alice.player.conductor
			.adminWs()
			.issueAppAuthenticationToken({
				installed_app_id: appInfo.installed_app_id,
			});
		const appWs = await alice.player.conductor.connectAppWs(issued.token, port);
		const agentApp: AgentApp = await enableAndGetAgentApp(
			alice.player.conductor.adminWs(),
			appWs,
			appInfo,
		);

		const previousAppInfo = await alice.store.client.client.appInfo();
		const previousCellId: CellId =
			previousAppInfo.cell_info['living_power'][0][CellType.Provisioned]
				.cell_id;

		await appWs.callZome({
			zome_name: 'living_power',
			role_name: 'living_power',
			payload: previousCellId,
			fn_name: 'migrate_from_old_cell',
		});

		await pause(200);
		const aliceStore2 = new LivingPowerStore(
			new LivingPowerClient(appWs, 'living_power'),
		);
		collectionOutput = await toPromise(aliceStore2.allBpvDevices);
		assert.equal(collectionOutput.size, 1);
		assert.equal(Array.from(collectionOutput.keys())[0], 'someserialnumber');
		const info2 = await toPromise(
			Array.from(collectionOutput.values())[0].info,
		);

		assert.equal(info2.name, 'alicesdevice');
	});
});
