import { h, toast } from '../dom';
import { t } from '../i18n';
import { iconBtn, I } from './icons';
import { addTheme, getMeta, getOfficial, getStatus, getThemes, loadOfficial, onThemesChange, refreshTheme, removeTheme, setCustom, setOfficialTheme, setThemeEnabled } from '../themes';

const sw = (checked, onChange) => {
  const i = h('input', { type: 'checkbox', checked: !!checked });
  i.addEventListener('change', () => onChange(i.checked));
  return h('label', { class: 'yx-sw' }, i, h('span'));
};

const fallbackName = (u) => { try { return decodeURIComponent(new URL(u).pathname.split('/').pop()) || u; } catch (e) { return u; } };
const STATUS = { loading: 'stLoading', ok: 'stOk', error: 'stError', cached: 'stCached' };

export function renderThemes(box) {
  const input = h('input', { class: 'yx-search', type: 'text', placeholder: t('themeUrl') });
  const add = () => {
    const err = addTheme(input.value);
    if (err) { toast(t(err)); return; }
    input.value = '';
  };
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') add(); });

  const list = h('div');
  const draw = () => {
    list.textContent = '';
    const offUrls = new Set(getOfficial().items.map((i) => i.url));
    const links = getThemes().links.filter((l) => !l.official && !offUrls.has(l.url));
    if (!links.length) list.append(h('div', { class: 'yx-empty' }, t('noThemes')));
    links.forEach((l) => {
      const meta = getMeta(l.url);
      const st = getStatus(l.url);
      const sub = [st ? t(STATUS[st]) : '', meta.author, meta.version && 'v' + meta.version].filter(Boolean).join(' · ');
      list.append(h('div', { class: 'yx-plugin' },
        h('div', { class: 'yx-prow' },
          h('div', { class: 'yx-pinfo' },
            h('div', { class: 'yx-pname' }, meta.name || fallbackName(l.url)),
            meta.description ? h('div', { class: 'yx-pdesc' }, meta.description) : null,
            h('div', { class: 'yx-pdesc' + (st === 'error' ? ' yx-err' : ''), style: { wordBreak: 'break-all' } }, l.url + (sub ? ' — ' + sub : ''))),
          iconBtn(t('refresh'), I.refresh, false, () => refreshTheme(l.url)),
          iconBtn(t('remove'), I.trash, false, () => removeTheme(l.url)),
          sw(l.enabled, (v) => setThemeEnabled(l.url, v)))));
    });
  };

  const offList = h('div');
  const drawOfficial = () => {
    offList.textContent = '';
    const { status, items } = getOfficial();
    if (!items.length) {
      const msg = status === 'loading' ? t('stLoading') : status === 'error' ? t('stError') : t('noOfficial');
      offList.append(h('div', { class: 'yx-empty' + (status === 'error' ? ' yx-err' : '') }, msg));
      return;
    }
    if (status === 'cached') offList.append(h('div', { class: 'yx-pdesc' }, t('stCached')));
    const links = getThemes().links;
    items.forEach((it) => {
      const meta = { ...(it.meta || {}), ...getMeta(it.url) };
      const l = links.find((x) => x.url === it.url);
      const sub = [meta.author, meta.version && 'v' + meta.version].filter(Boolean).join(' · ');
      offList.append(h('div', { class: 'yx-plugin' },
        h('div', { class: 'yx-prow' },
          h('div', { class: 'yx-pinfo' },
            h('div', { class: 'yx-pname' }, meta.name || it.name),
            meta.description ? h('div', { class: 'yx-pdesc' }, meta.description) : null,
            sub ? h('div', { class: 'yx-pdesc' }, sub) : null),
          sw(!!(l && l.enabled), (v) => setOfficialTheme(it.url, v)))));
    });
  };

  const drawAll = () => { draw(); drawOfficial(); };
  const off = onThemesChange(drawAll);
  draw();
  drawOfficial();
  loadOfficial(false);

  const s = getThemes();
  const area = h('textarea', { class: 'yx-code', spellcheck: false, placeholder: t('customPh') });
  area.value = s.custom;
  let timer = 0;
  area.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(() => setCustom(area.value, null), 400); });

  box.append(
    h('div', { class: 'yx-sect', style: { marginTop: 0 } }, t('officialThemes'), iconBtn(t('refresh'), I.refresh, false, () => loadOfficial(true))),
    offList,
    h('div', { class: 'yx-sect' }, t('myThemes')),
    h('div', { class: 'yx-add' }, input, h('button', { type: 'button', class: 'yx-primary', onclick: add }, t('add'))),
    list,
    h('div', { class: 'yx-sect' }, t('customCss'), sw(s.customOn, (v) => setCustom(null, v))),
    area);
  return () => { off(); clearTimeout(timer); };
}
