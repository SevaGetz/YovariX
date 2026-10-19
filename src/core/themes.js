import { read, write } from './storage';
import { addStyle, removeStyle, LOG } from './dom';
import { registerBackup } from './api';

const KEY = 'yovarix:themes';
const CACHE = 'yovarix:themecache';
const TTL = 10 * 60 * 1000;
const DEF = { links: [], custom: '', customOn: true };

export const getThemes = () => ({ ...DEF, ...(read(KEY, {}) || {}) });
const save = (s) => write(KEY, s);
const getCache = () => read(CACHE, {}) || {};

const subs = new Set();
export const onThemesChange = (cb) => { subs.add(cb); return () => subs.delete(cb); };
const emit = () => subs.forEach((f) => { try { f(); } catch (e) { console.error(e); } });

const status = new Map(); // url -> 'loading' | 'ok' | 'error' | 'cached'
export const getStatus = (u) => status.get(u) || '';
export const getMeta = (u) => (getCache()[u] || {}).meta || {};

// github.com/u/r/blob/... -> raw.githubusercontent.com/u/r/...
export function normalizeUrl(u) {
  u = (u || '').trim();
  const m = u.match(/^https?:\/\/github\.com\/([^/]+)\/([^/]+)\/blob\/(.+)$/);
  return m ? `https://raw.githubusercontent.com/${m[1]}/${m[2]}/${m[3]}` : u;
}

function parseMeta(css) {
  const m = css.match(/\/\*\*?([\s\S]*?)\*\//);
  const o = {};
  if (m) for (const k of ['name', 'author', 'description', 'version']) {
    const r = m[1].match(new RegExp('@' + k + '\\s+(.+)'));
    if (r) o[k] = r[1].trim();
  }
  return o;
}

const gm = (url, headers) => new Promise((res, rej) => GM_xmlhttpRequest({
  method: 'GET', url, headers, responseType: 'text', timeout: 15000,
  onload: (r) => (r.status >= 200 && r.status < 300 ? res(r.responseText) : rej(new Error('HTTP ' + r.status))),
  onerror: () => rej(new Error('network')),
  ontimeout: () => rej(new Error('timeout')),
}));

async function resolveCss(url, text, depth = 0) {
  const abs = (u) => { try { return new URL(u, url).href; } catch (e) { return u; } };
  let out = text;
  const imports = [...text.matchAll(/@import\s+(?:url\(\s*)?['"]?([^'")\s;]+)['"]?\s*\)?[^;]*;/gi)];
  for (const m of imports) {
    let sub = '';
    if (depth < 3) {
      try { const u = abs(m[1]); sub = await resolveCss(u, await gm(u), depth + 1); }
      catch (e) { LOG('theme @import failed:', m[1], e.message); }
    }
    out = out.replace(m[0], sub);
  }
  return out.replace(/url\(\s*(['"]?)(?!data:|https?:|\/\/|#)([^'")]+)\1\s*\)/gi, (m, q, u) => `url("${abs(u)}")`);
}

/* ---------- apply ---------- */
const applied = new Set();
const apply = (id, css) => { applied.add(id); addStyle(id, css); };
const unapply = (id) => { applied.delete(id); removeStyle(id); };

function applyLink(l) {
  const id = 'theme:' + l.url;
  const c = getCache()[l.url];
  if (l.enabled && c) apply(id, c.css); else unapply(id);
}

function applyCustom() {
  const s = getThemes();
  if (s.customOn && s.custom.trim()) apply('theme:custom', s.custom); else unapply('theme:custom');
}

async function load(url, force) {
  const cache = getCache();
  if (!force && cache[url] && Date.now() - cache[url].t < TTL) { status.set(url, 'ok'); emit(); return; }
  status.set(url, 'loading'); emit();
  try {
    const raw = await gm(url);
    const css = await resolveCss(url, raw);
    const c = getCache();
    c[url] = { css, meta: parseMeta(raw), t: Date.now() };
    write(CACHE, c);
    status.set(url, 'ok');
  } catch (e) {
    LOG('theme load failed:', url, e.message);
    status.set(url, cache[url] ? 'cached' : 'error');
  }
  const l = getThemes().links.find((x) => x.url === url);
  if (l) applyLink(l);
  emit();
}

function reapplyAll() {
  [...applied].forEach(unapply);
  const s = getThemes();
  s.links.forEach((l) => { applyLink(l); if (l.enabled) load(l.url); });
  applyCustom();
  emit();
}

export function initThemes() {
  reapplyAll();
}

export function addTheme(input) {
  const url = normalizeUrl(input);
  if (!/^https?:\/\/\S+$/i.test(url)) return 'badUrl';
  const s = getThemes();
  if (s.links.some((l) => l.url === url)) return 'dup';
  s.links.push({ url, enabled: true });
  save(s);
  load(url, true);
  emit();
  return null;
}

export function removeTheme(url) {
  const s = getThemes();
  s.links = s.links.filter((l) => l.url !== url);
  save(s);
  unapply('theme:' + url);
  status.delete(url);
  emit();
}

export function setThemeEnabled(url, on) {
  const s = getThemes();
  const l = s.links.find((x) => x.url === url);
  if (!l) return;
  l.enabled = !!on;
  save(s);
  applyLink(l);
  if (on) load(url);
  emit();
}

export const refreshTheme = (url) => load(url, true);

const OFFICIAL_KEY = 'yovarix:officialthemes';
const OFFICIAL_TTL = 60 * 60 * 1000;
const OFFICIAL_API = `https://api.github.com/repos/${__REPO__}/contents/themes`;

let official = { status: '', items: [] }; // status: '' | 'loading' | 'ok' | 'error' | 'cached'
let officialBusy = false;
export const getOfficial = () => official;

export async function loadOfficial(force) {
  if (officialBusy) return;
  const c = read(OFFICIAL_KEY, null);
  const cached = c && Array.isArray(c.items) ? c.items : null;
  if (!force && cached && Date.now() - c.t < OFFICIAL_TTL) { official = { status: 'ok', items: cached }; emit(); return; }
  officialBusy = true;
  official = { status: 'loading', items: cached || [] };
  emit();
  try {
    let list = [];
    try {
      list = JSON.parse(await gm(OFFICIAL_API, { Accept: 'application/vnd.github+json' }));
    } catch (e) {
      if (e.message !== 'HTTP 404') throw e;
    }
    if (!Array.isArray(list)) throw new Error('bad response');
    const items = list
      .filter((f) => f && f.type === 'file' && /\.css$/i.test(f.name) && f.download_url)
      .map((f) => ({ name: f.name.replace(/\.css$/i, ''), url: f.download_url }))
      .sort((a, b) => a.name.localeCompare(b.name));
    write(OFFICIAL_KEY, { items, t: Date.now() });
    official = { status: 'ok', items };
  } catch (e) {
    LOG('official themes load failed:', e.message);
    official = { status: cached ? 'cached' : 'error', items: cached || [] };
  }
  officialBusy = false;
  emit();
}

export function setCustom(css, on) {
  const s = getThemes();
  if (css != null) s.custom = css;
  if (on != null) s.customOn = !!on;
  save(s);
  applyCustom();
}

registerBackup('themes', getThemes, (v) => { if (v && typeof v === 'object') { save({ ...DEF, ...v }); reapplyAll(); } });
