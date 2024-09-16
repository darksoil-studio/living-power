import { ActionCommittedSignal } from '@holochain-open-dev/utils';

export type LivingPowerSignal = ActionCommittedSignal<EntryTypes, LinkTypes>;

export type EntryTypes = {
	type: 'MeasurementCollection';
} & MeasurementCollection;

export type LinkTypes = string;

export interface BpvDeviceInfo {
	name: string;
}

export interface Measurement {
	timestamp: number;
	humidity_percentage: number;
	temperature_celsius: number;
	light_level_lux: number;
	voltage_millivolts: number;
}

export interface MeasurementCollection {
	arduino_serial_number: string;
	measurements: Array<Measurement>;
	external_resistor_ohms: number;
}
