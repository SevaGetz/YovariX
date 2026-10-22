(() => {
  'use strict';

  const REPO = 'SevaGetz/YovariX';

  const themeBtn = document.getElementById('theme');
  const mq = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
  const isDark = () => {
    const t = document.documentElement.dataset.theme;
    return t ? t === 'dark' : !!(mq && mq.matches);
  };
  if (themeBtn) {
    themeBtn.addEventListener('click', () => {
      const next = isDark() ? 'light' : 'dark';
      document.documentElement.dataset.theme = next;
      try { localStorage.setItem('yx-theme', next); } catch (e) { /* ignore */ }
      const m = document.querySelector('meta[name="color-scheme"]');
      if (m) m.content = next;
    });
  }

  const grid = document.getElementById('pgrid');
  if (grid) {
    const cards = [...grid.querySelectorAll('.pcard')];
    const search = document.getElementById('psearch');
    const count = document.getElementById('pcount');
    const empty = document.getElementById('pempty');
    const texts = new Map(cards.map((c) => [c, c.textContent.toLowerCase()]));
    const run = () => {
      const q = search.value.trim().toLowerCase();
      let shown = 0;
      cards.forEach((c) => {
        const ok = !q || texts.get(c).includes(q);
        c.hidden = !ok;
        if (ok) shown++;
      });
      count.textContent = shown;
      empty.hidden = shown !== 0;
    };
    search.addEventListener('input', run);
  }

  const ver = document.getElementById('ver');
  if (ver) {
    fetch(`https://raw.githubusercontent.com/${REPO}/main/package.json`, { cache: 'no-cache' })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((p) => { if (p && /^\d+(\.\d+)*$/.test(p.version)) ver.textContent = 'v' + p.version; })
      .catch(() => {});
  }
})();
