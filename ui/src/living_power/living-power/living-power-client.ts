import { 
  SignedActionHashed,
  CreateLink,
  Link,
  DeleteLink,
  Delete,
  AppClient, 
  Record, 
  ActionHash, 
  EntryHash, 
  AgentPubKey,
} from '@holochain/client';
import { isSignalFromCellWithRole, EntryRecord, ZomeClient } from '@holochain-open-dev/utils';

import { LivingPowerSignal } from './types.js';

export class LivingPowerClient extends ZomeClient<LivingPowerSignal> {

  constructor(public client: AppClient, public roleName: string, public zomeName = 'living_power') {
    super(client, roleName, zomeName);
  }
}
