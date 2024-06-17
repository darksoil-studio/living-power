import { internalIpV4Sync } from 'internal-ip';
import path from 'path';
import { defineConfig } from 'vite';
import { viteStaticCopy } from 'vite-plugin-static-copy';

export default defineConfig({
	server: {
		host: '0.0.0.0',
		port: 1420,
		strictPort: true,
		hmr: {
			protocol: 'ws',
			host: internalIpV4Sync(),
			port: 1421,
		},
	},
	plugins: [
		viteStaticCopy({
			targets: [
				{
					src: path.resolve(
						__dirname,
						'node_modules/@shoelace-style/shoelace/dist/assets',
					),
					dest: path.resolve(__dirname, 'dist/shoelace'),
				},
			],
		}),
	],
});
