// Tailwind 4 vía PostCSS: necesario con webpack (Turbopack no funciona con WASM en este entorno).
// El plugin propio debe ir antes: suple el escáner de ficheros cuando Tailwind usa el binario WASM.
import { fileURLToPath } from "node:url";

const inlineCandidatesPluginPath = fileURLToPath(
  new URL("./postcss-inline-candidates.cjs", import.meta.url),
);

const config = {
  plugins: [inlineCandidatesPluginPath, "@tailwindcss/postcss"],
};

export default config;
