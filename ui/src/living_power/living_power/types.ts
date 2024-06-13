import { ActionCommittedSignal } from '@holochain-open-dev/utils';
import { ActionHash } from '@holochain/client';

export type LivingPowerSignal = ActionCommittedSignal<EntryTypes, LinkTypes>;

export type EntryTypes =
	| ({ type: 'MeasurementCollection' } & MeasurementCollection)
	| ({ type: 'BpvDevice' } & BpvDevice);

export type LinkTypes = string;

export interface BpvDevice {
	name: string;
	arduino_serial_number: string;
}

export interface Measurement {
	timestamp: number;
	humidity_percentage: number;
	temperature_centigrades: number;
	light_level_lux: number;
	voltage_millivolts: number;
}

export interface MeasurementCollection {
	bpv_device_hash: ActionHash;
	measurements: Array<Measurement>;
	external_resistor_ohms: number;
}
