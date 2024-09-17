import { dirname } from 'path';
import { fileURLToPath } from 'url';

export const appPath =
	dirname(fileURLToPath(import.meta.url)) + '/../../workdir/living-power.happ';

export const oldAppPath =
	dirname(fileURLToPath(import.meta.url)) + '/../old-living-power.happ';
