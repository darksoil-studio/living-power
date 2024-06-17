import { createContext } from '@lit/context';

import { LivingPowerStore } from './living-power-store.js';

export const livingPowerStoreContext =
	createContext<LivingPowerStore>('living_power/store');
