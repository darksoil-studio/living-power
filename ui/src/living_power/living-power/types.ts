import { 
  Record, 
  ActionHash, 
  DnaHash,
  SignedActionHashed,
  EntryHash, 
  AgentPubKey,
  Create,
  Update,
  Delete,
  CreateLink,
  DeleteLink
} from '@holochain/client';
import { ActionCommittedSignal } from '@holochain-open-dev/utils';

export type LivingPowerSignal = ActionCommittedSignal<EntryTypes, LinkTypes>;

export type EntryTypes =
 | ({ type: 'MeasureCollection'; } & MeasureCollection)
 | ({  type: 'BpvDevice'; } & BpvDevice);

export type LinkTypes = string;



export interface BpvDevice { 
  name: string;

  arduino_serial_number: string;
}




export interface MeasureCollection { 
  bpv_device_hash: ActionHash;

  measures: Array<number>;

  external_resistor_ohms: number;
}

