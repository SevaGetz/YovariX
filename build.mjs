import { build, context } from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';

const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const src = path.resolve('src');
const pluginsDir = path.join(src, 'plugins');

const version = pkg.version;
const raw = `https://raw.githubusercontent.com/${pkg.repo}/main/dist/YovariX.user.js`;

const CONNECT = ['giphy.com', 'twimg.com', 'raw.githubusercontent.com', 'api.github.com'];

const header = `// ==UserScript==
// @name         YovariX
// @namespace    Yovari.x.mod
// @version      ${version}
// @description  YovariX: modular mod for X/Twitter
// @match        https://x.com/*
// @match        https://*.x.com/*
// @match        https://twitter.com/*
// @match        https://*.twitter.com/*
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_xmlhttpRequest
// @grant        GM_registerMenuCommand
// @grant        GM_openInTab
// @grant        GM_setClipboard
// @grant        GM_addValueChangeListener
${CONNECT.map((c) => `// @connect      ${c}`).join('\n')}
// @run-at       document-idle
// @updateURL    ${raw}
// @downloadURL  ${raw}
// ==/UserScript==
`;

const pluginsPlugin = {
  name: 'yx-plugins',
  setup(b) {
    b.onResolve({ filter: /^~plugins$/ }, () => ({ path: 'plugins', namespace: 'yx-plugins' }));
    b.onLoad({ filter: /.*/, namespace: 'yx-plugins' }, () => {
      const dirs = fs.readdirSync(pluginsDir, { withFileTypes: true })
        .filter((d) => d.isDirectory() && fs.existsSync(path.join(pluginsDir, d.name, 'index.js')))
        .map((d) => d.name).sort();
      const imports = dirs.map((d, i) => `import p${i} from ${JSON.stringify(path.join(pluginsDir, d, 'index.js'))};`);
      return {
        contents: `${imports.join('\n')}\nexport default [${dirs.map((_, i) => 'p' + i).join(', ')}];`,
        resolveDir: src,
        watchDirs: [pluginsDir],
      };
    });
  },
};

const opts = {
  entryPoints: ['src/index.js'],
  outfile: 'dist/YovariX.user.js',
  bundle: true,
  format: 'iife',
  target: 'es2020',
  charset: 'utf8',
  legalComments: 'none',
  banner: { js: header },
  alias: { '@core': path.join(src, 'core') },
  define: { __VERSION__: JSON.stringify(version), __REPO__: JSON.stringify(pkg.repo), __RAW__: JSON.stringify(raw) },
  plugins: [pluginsPlugin],
  logLevel: 'info',
};

if (process.argv.includes('--watch')) {
  const ctx = await context(opts);
  await ctx.watch();
} else {
  await build(opts);
}
