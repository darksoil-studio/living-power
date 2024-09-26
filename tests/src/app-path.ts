import { dirname } from 'path';
import { fileURLToPath } from 'url';

export const appPath =
	process.env.HAPP_PATH ||
	dirname(fileURLToPath(import.meta.url)) + '/../../workdir/living-power.happ';

export const oldAppPath =
	process.env.OLD_HAPP_PATH ||
	dirname(fileURLToPath(import.meta.url)) + '/../living-power.happ';
