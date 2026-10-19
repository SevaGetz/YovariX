import { h } from '../dom';

export const ico = (inner, fill) => h('span', {
  innerHTML: '<svg viewBox="0 0 24 24" width="' + (fill ? 20 : 26) + '" height="' + (fill ? 20 : 26) + '" fill="' + (fill ? 'currentColor' : 'none') +
    '" stroke="' + (fill ? 'none' : 'currentColor') + '" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">' + inner + '</svg>',
});
export const I = {
  back: '<path d="M7.414 13l5.043 5.04-1.414 1.42L3.586 12l7.457-7.46 1.414 1.42L7.414 11H21v2H7.414z"/>',
  close: '<path d="M10.59 12L4.54 5.96l1.42-1.42L12 10.59l6.04-6.05 1.42 1.42L13.41 12l6.05 6.04-1.42 1.42L12 13.41l-6.04 6.05-1.42-1.42L10.59 12z"/>',
  plugins: '<path d="M10 4.5a2 2 0 1 1 4 0V6h3.5A1.5 1.5 0 0 1 19 7.5V11h-1.5a2 2 0 1 0 0 4H19v3.5a1.5 1.5 0 0 1-1.5 1.5H14v-1.5a2 2 0 1 0-4 0V20H6.5A1.5 1.5 0 0 1 5 18.5V15h1.5a2 2 0 1 0 0-4H5V7.5A1.5 1.5 0 0 1 6.5 6H10z"/>',
  backup: '<path d="M12 4v11m0 0l-4-4m4 4l4-4M5 19h14"/>',
  star: '<path d="M12 3.5l2.6 5.3 5.9.85-4.25 4.15 1 5.85L12 16.9l-5.25 2.75 1-5.85L3.5 9.65l5.9-.85z"/>',
  chev: '<path d="M9 5l7 7-7 7"/>',
  refresh: '<path d="M20 12a8 8 0 1 1-2.34-5.66M20 4v4h-4"/>',
  trash: '<path d="M5 7h14M10 11v6M14 11v6M6 7l1 12h10l1-12M9 7V4h6v3"/>',
  themes: '<path d="M12 3a9 9 0 1 0 0 18c1.1 0 1.5-.7 1.5-1.4 0-.9-.6-1.3-.6-2.1 0-.9.7-1.5 1.6-1.5H17a4 4 0 0 0 4-4C21 6.6 17 3 12 3z"/><circle cx="7.5" cy="11" r="1"/><circle cx="10" cy="7" r="1"/><circle cx="15" cy="7" r="1"/>',
  news: '<path d="M6 3h8l5 5v13H6zM14 3v5h5M9 12h7M9 16h7"/>',
  tune: '<path d="M4 7h9M19 7h1M4 17h1M11 17h9"/><circle cx="16" cy="7" r="2"/><circle cx="8" cy="17" r="2"/>',
};
export const iconBtn = (title, inner, fill, onclick) => h('button', { type: 'button', class: 'yx-icon', title, onclick }, ico(inner, fill));

export const tile = (icon, title, desc, onclick) => h('button', { type: 'button', class: 'yx-tile', onclick },
  h('span', { class: 'yx-tile-ico' }, ico(icon)),
  h('span', { class: 'yx-tile-txt' }, h('span', { class: 'yx-tile-title' }, title), h('span', { class: 'yx-tile-desc' }, desc)),
  h('span', { class: 'yx-tile-chev' }, ico(I.chev)));
