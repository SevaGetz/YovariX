import { h, toast, xFont } from '../dom';
import { plugins, isEnabled, setEnabled, exportConfig, importConfig, resetConfig } from '../api';
import { t, tr, onLangChange } from '../i18n';
import { settings as general } from '../general';
import { I, iconBtn, tile } from './icons';
import { renderThemes, renderOfficialThemes } from './themes';
import { getThemes } from '../themes';
import { isNewer } from '../version';
import { showReloadPrompt } from './reload';
import { fetchLatest } from '../updater';
import { releases, renderEntries } from '../changelog';
import { openInstaller } from '../install';
import { sw, optionRows } from './controls';
import { showOnboarding } from './onboarding';

/* ---------- page "Plugins" ---------- */
function renderPlugins(box) {
  const search = h('input', { class: 'yx-search', type: 'text', placeholder: t('search') });
  const list = h('div');
  box.append(search, list);

  const draw = () => {
    const q = search.value.trim().toLowerCase();
    list.textContent = '';
    const shown = [...plugins]
      .sort((a, b) => a.name.localeCompare(b.name))
      .filter((p) => !q || (p.name + ' ' + tr(p.title) + ' ' + tr(p.description)).toLowerCase().includes(q));
    if (!shown.length) list.append(h('div', { class: 'yx-empty' }, t('nothing')));
    shown.forEach((p) => {
      const opts = h('div', { class: 'yx-opts', hidden: true }, p.settings ? optionRows(p.settings) : null);
      const gear = p.settings ? iconBtn(t('pluginSettings'), I.tune, false, () => { opts.hidden = !opts.hidden; }) : null;
      list.append(h('div', { class: 'yx-plugin' },
        h('div', { class: 'yx-prow' },
          h('div', { class: 'yx-pinfo' },
            h('div', { class: 'yx-pname' }, tr(p.title) || p.name),
            h('div', { class: 'yx-pdesc' }, tr(p.description))),
          gear,
          sw(isEnabled(p), (v) => setEnabled(p, v))),
        opts));
    });
  };
  search.addEventListener('input', draw);
  draw();
}

/* ---------- page "What's new" ---------- */
function renderChangelog(box) {
  const list = releases();
  box.append(list.length ? renderEntries(list) : h('div', { class: 'yx-empty' }, t('nothing')));
}

/* ---------- page "Backup" ---------- */
export function downloadText(name, text) {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  const a = h('a', { href: url, download: name });
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function pickJson(cb) {
  const inp = h('input', { type: 'file', accept: 'application/json,.json' });
  inp.onchange = () => {
    const f = inp.files && inp.files[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => { try { cb(JSON.parse(r.result)); } catch (e) { toast(t('readErr') + e.message); } };
    r.readAsText(f);
  };
  inp.click();
}

function renderBackup(box) {
  box.append(h('div', { class: 'yx-btns', style: { paddingTop: 0 } },
    h('button', {
      type: 'button',
      onclick: () => downloadText('yovarix-settings-' + new Date().toISOString().slice(0, 10) + '.json', JSON.stringify(exportConfig(), null, 2)),
    }, t('export')),
    h('button', {
      type: 'button',
      onclick: () => pickJson((o) => { importConfig(o); toast(t('imported')); }),
    }, t('import')),
    h('button', {
      type: 'button', class: 'yx-danger',
      onclick: () => { if (confirm(t('confirmReset'))) { resetConfig(); toast(t('resetDone')); } },
    }, t('reset'))));
}

/* ---------- page "General" ---------- */
const openUrl = (url) => (typeof GM_openInTab === 'function' ? GM_openInTab(url, { active: true }) : window.open(url, '_blank'));

function checkUpdate() {
  fetchLatest().then((v) => {
    if (isNewer(v, __VERSION__)) { openInstaller(); showReloadPrompt(v, 'pending'); } else toast(t('upToDate', { v: __VERSION__ }));
  }).catch(() => toast(t('updateErr')));
}

function renderGeneral(box) {
  box.append(
    h('div', { class: 'yx-opts' }, optionRows(general)),
    h('div', { class: 'yx-btns' },
      h('button', { type: 'button', onclick: () => openUrl('https://github.com/' + __REPO__) }, t('repo')),
      h('button', { type: 'button', onclick: checkUpdate }, t('update')),
      h('button', { type: 'button', onclick: () => { closeSettings(); showOnboarding(openSettings); } }, t('onbAgain'))),
    h('div', { class: 'yx-hint', style: { paddingTop: '12px' } }, t('version') + ': v' + __VERSION__));
}

/* ---------- plates ---------- */
function getPages() {
  const on = plugins.filter(isEnabled).length;
  const pages = [
    { id: 'general', icon: I.tune, title: t('general'), desc: t('generalDesc'), render: renderGeneral },
    { id: 'plugins', icon: I.plugins, title: t('plugins'), desc: t('pluginsDesc', { n: on, m: plugins.length }), render: renderPlugins },
    { id: 'themes', icon: I.themes, title: t('themes'), desc: t('themesDesc', { n: getThemes().links.filter((l) => l.enabled).length }), render: renderThemes },
    { id: 'themes-official', parent: 'themes', hidden: true, icon: I.themes, title: t('officialThemes'), render: renderOfficialThemes },
  ];
  plugins.filter((p) => p.started && p.tile).forEach((p) => pages.push({
    id: 'plugin:' + p.name,
    icon: p.tile.icon || I.star,
    title: tr(p.tile.title),
    desc: tr(p.tile.desc),
    render: p.tile.render,
  }));
  pages.push({ id: 'backup', icon: I.backup, title: t('backup'), desc: t('backupDesc'), render: renderBackup });
  pages.push({ id: 'changelog', icon: I.news, title: t('changelog'), desc: t('changelogDesc'), render: renderChangelog });
  return pages;
}

/* ---------- window ---------- */
let closeActive = null;
export const closeSettings = () => { if (closeActive) closeActive(); };

export function openSettings(pageId) {
  if (document.querySelector('.yx-ov')) return;
  const cs = getComputedStyle(document.body);
  const ov = h('div', { class: 'yx-ov' });
  const box = h('div', { class: 'yx-modal' });
  const bg = cs.backgroundColor === 'rgba(0, 0, 0, 0)' ? 'rgb(0, 0, 0)' : cs.backgroundColor;
  const [r, g, b] = (bg.match(/\d+/g) || [0, 0, 0]).map(Number);
  box.dataset.theme = (r * 299 + g * 587 + b * 114) / 1000 > 128 ? 'light' : 'dark';
  box.style.background = bg;
  box.style.color = cs.color;
  box.style.fontFamily = xFont();
  box.style.setProperty('--yx-bg', bg);
  box.style.setProperty('--yx-fg', cs.color);

  const back = iconBtn(t('back'), I.back, true, () => show((getPages().find((p) => p.id === current) || {}).parent || null));
  back.hidden = true;
  const title = h('h2', null, 'YovariX');
  const body = h('div', { class: 'yx-body' });
  box.append(
    h('div', { class: 'yx-head' }, back, title, h('span', { class: 'yx-ver' }, 'v' + __VERSION__),
      iconBtn(t('close'), I.close, true, () => close())),
    body);
  ov.appendChild(box);
  document.body.appendChild(ov);

  let cleanup = null;
  let current = null;
  function show(id) {
    current = id;
    back.title = t('back');
    const xb = box.querySelector('.yx-head .yx-icon:last-child');
    if (xb) xb.title = t('close');
    if (cleanup) { try { cleanup(); } catch (e) {} cleanup = null; }
    body.textContent = '';
    const page = getPages().find((p) => p.id === id);
    if (!page) {
      title.textContent = 'YovariX';
      back.hidden = true;
      body.append(h('div', { class: 'yx-tiles' }, getPages().filter((p) => !p.hidden).map((p) => tile(p.icon, p.title, p.desc, () => show(p.id)))));
      return;
    }
    title.textContent = page.title;
    back.hidden = false;
    cleanup = page.render(body, show) || null;
  }

  const offLang = onLangChange(() => show(current));
  const onKey = (e) => { if (e.key === 'Escape') { e.stopPropagation(); close(); } };
  function close() {
    if (closeActive === close) closeActive = null;
    if (cleanup) { try { cleanup(); } catch (e) {} }
    ov.remove();
    offLang();
    document.removeEventListener('keydown', onKey, true);
  }
  document.addEventListener('keydown', onKey, true);
  closeActive = close;
  ov.addEventListener('mousedown', (e) => { if (e.target === ov) close(); });
  show(pageId || null);
}
