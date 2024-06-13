import { ActionCommittedSignal } from '@holochain-open-dev/utils';
import {
	ActionHash,
	AgentPubKey,
	Create,
	CreateLink,
	Delete,
	DeleteLink,
	DnaHash,
	EntryHash,
	Record,
	SignedActionHashed,
	Update,
} from '@holochain/client';

export type LivingPowerSignal = ActionCommittedSignal<EntryTypes, LinkTypes>;

export type EntryTypes =
	| ({ type: 'MeasurementCollection' } & MeasurementCollection)
	| ({ type: 'BpvDevice' } & BpvDevice);

export type LinkTypes = string;

export interface BpvDevice {
	name: string;

	arduino_serial_number: string;
}

export interface MeasurementCollection {
	bpv_device_hash: ActionHash;

	measures: Array<number>;

	external_resistor_ohms: number;
}
