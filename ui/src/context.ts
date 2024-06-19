import { Router } from '@holochain-open-dev/elements';
import { AsyncSignal } from '@holochain-open-dev/signals';
import { createContext } from '@lit/context';

import { SerialPortInfo } from './arduinos/connected-arduinos';

export const rootRouterContext = createContext<Router>('router');
