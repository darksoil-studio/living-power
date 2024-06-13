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
 | ({  type: 'BpvDevice'; } & BpvDevice);

export type LinkTypes = string;



export interface BpvDevice { 
  name: string;

  arduino_serial_number: string;
}

