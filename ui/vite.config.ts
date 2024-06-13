import { internalIpV4Sync } from "internal-ip";
import { defineConfig } from "vite";
import checker from "vite-plugin-checker";
import path from "path";
import { viteStaticCopy } from "vite-plugin-static-copy";

export default defineConfig({
  server: {
    host: "0.0.0.0",
    port: 1420,
    strictPort: true,
    hmr: {
      protocol: "ws",
      host: internalIpV4Sync(),
      port: 1421,
    }
  },
  plugins: [
    checker({
      typescript: true,
      eslint: {
        lintCommand: "eslint src",
      },
    }),
    viteStaticCopy({
      targets: [
        {
          src: path.resolve(
            __dirname,
            "node_modules/@shoelace-style/shoelace/dist/assets"
          ),
          dest: path.resolve(__dirname, "dist/shoelace"),
        },
      ],
    }),
  ],
});

