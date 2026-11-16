// Plugin PostCSS de apoyo para Tailwind 4 con el escáner WASM (@tailwindcss/oxide-wasm32-wasi).
//
// En Windows, el sistema de ficheros WASI no resuelve rutas con letra de unidad y el escáner
// de Tailwind no encuentra ningún fichero: el CSS saldría sin utilidades. Si el escáner funciona
// (binario nativo, por ejemplo en Linux), este plugin no hace nada. Si no, lee los ficheros
// fuente con fs y declara sus palabras como candidatas con `@source inline()`; Tailwind descarta
// las que no son utilidades.
const { readdirSync, readFileSync } = require("node:fs");
const { join } = require("node:path");
const { Scanner } = require("@tailwindcss/oxide");

const PLUGIN_NAME = "inline-candidates-fallback";
const SOURCE_DIR = join(process.cwd(), "src");
const SOURCE_GLOB = "**/*.{ts,tsx,js,jsx}";
const SOURCE_FILE_PATTERN = /\.(tsx?|jsx?)$/;
// Solo caracteres que pueden formar una clase de Tailwind y no rompen el literal de @source inline().
const CANDIDATE_PATTERN = /[A-Za-z0-9!:/\-._[\]()%#@&>*=,]+/g;
const MAX_CANDIDATE_LENGTH = 120;
// Paréntesis solo permitidos dentro de corchetes (valores arbitrarios como text-[var(--x)]); fuera rompen inline().
const BRACKETED_VALUE_PATTERN = /^[^()[\]]*\[[^[\]]*\][^()[\]]*$/;
const PLAIN_TOKEN_PATTERN = /^[^()[\]]+$/;

function scannerFindsFiles() {
  const scanner = new Scanner({
    sources: [{ base: SOURCE_DIR, pattern: "**/*", negated: false }],
  });
  return scanner.scan().length > 0;
}

function collectSourceFiles() {
  return readdirSync(SOURCE_DIR, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile() && SOURCE_FILE_PATTERN.test(entry.name))
    .map((entry) => join(entry.parentPath, entry.name));
}

function isValidCandidate(token) {
  return (
    token.length <= MAX_CANDIDATE_LENGTH &&
    (PLAIN_TOKEN_PATTERN.test(token) || BRACKETED_VALUE_PATTERN.test(token))
  );
}

function collectCandidates() {
  const candidates = new Set();
  for (const file of collectSourceFiles()) {
    for (const token of readFileSync(file, "utf8").match(CANDIDATE_PATTERN) ?? []) {
      if (isValidCandidate(token)) candidates.add(token);
    }
  }
  return [...candidates];
}

function inlineCandidatesPlugin() {
  const needsFallback = !scannerFindsFiles();
  return {
    postcssPlugin: PLUGIN_NAME,
    Once(root, { AtRule, result }) {
      if (!needsFallback) return;
      root.append(
        new AtRule({ name: "source", params: `inline("${collectCandidates().join(" ")}")` }),
      );
      // Para que el modo dev regenere el CSS al cambiar los ficheros fuente.
      result.messages.push({
        type: "dir-dependency",
        plugin: PLUGIN_NAME,
        dir: SOURCE_DIR,
        glob: SOURCE_GLOB,
        parent: result.opts.from,
      });
    },
  };
}
inlineCandidatesPlugin.postcss = true;

module.exports = inlineCandidatesPlugin;
