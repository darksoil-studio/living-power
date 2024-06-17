import { invoke } from '@tauri-apps/api/core';

import { Measurement } from '../living_power/living_power/types.js';

export function collectMeasurements(
	portName: string,
): Promise<Array<Measurement>> {
	return invoke('collect_measurements', {
		portName,
	});
}
