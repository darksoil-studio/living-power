import { Scenario } from '@holochain/tryorama';

import { LivingPowerClient } from '../../../../ui/src/living_power/living_power/living-power-client.js';
import { LivingPowerStore } from '../../../../ui/src/living_power/living_power/living-power-store.js';
import { appPath } from '../../app-path.js';

export async function setup(scenario: Scenario) {
	// Add 2 players with the test hApp to the Scenario. The returned players
	// can be destructured.
	const [alice, bob] = await scenario.addPlayersWithApps([
		{ appBundleSource: { path: appPath } },
		{ appBundleSource: { path: appPath } },
	]);

	// Shortcut peer discovery through gossip and register all agents in every
	// conductor of the scenario.
	await scenario.shareAllAgents();

	const aliceStore = new LivingPowerStore(
		new LivingPowerClient(alice.appWs as any, 'living_power', 'living_power'),
	);

	const bobStore = new LivingPowerStore(
		new LivingPowerClient(bob.appWs as any, 'living_power', 'living_power'),
	);

	// Shortcut peer discovery through gossip and register all agents in every
	// conductor of the scenario.
	await scenario.shareAllAgents();

	return {
		alice: {
			player: alice,
			store: aliceStore,
		},
		bob: {
			player: bob,
			store: bobStore,
		},
	};
}
