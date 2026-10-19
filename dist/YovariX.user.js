// ==UserScript==
// @name         YovariX
// @namespace    Yovari.x.mod
// @version      1.1.2
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
// @connect      giphy.com
// @connect      twimg.com
// @connect      raw.githubusercontent.com
// @connect      api.github.com
// @run-at       document-idle
// @updateURL    https://raw.githubusercontent.com/SevaGetz/YovariX/main/dist/YovariX.user.js
// @downloadURL  https://raw.githubusercontent.com/SevaGetz/YovariX/main/dist/YovariX.user.js
// ==/UserScript==

(() => {
  // src/core/storage.js
  var read = (key, def) => {
    try {
      const raw = GM_getValue(key, null);
      if (raw === null || raw === void 0) return def;
      return typeof raw === "string" ? JSON.parse(raw) : raw;
    } catch (e) {
      return def;
    }
  };
  var write = (key, value) => GM_setValue(key, JSON.stringify(value));

  // src/core/dom.js
  var debug = false;
  var setDebug = (v) => {
    debug = !!v;
  };
  var LOG = (...a) => {
    if (debug) console.log("[YovariX]", ...a);
  };
  function h(tag, props, ...kids) {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(props || {})) {
      if (v == null || v === false) continue;
      if (k === "class") e.className = v;
      else if (k.startsWith("on")) e.addEventListener(k.slice(2).toLowerCase(), v);
      else if (k === "style" && typeof v === "object") Object.assign(e.style, v);
      else if (k in e) e[k] = v;
      else e.setAttribute(k, v === true ? "" : v);
    }
    e.append(...kids.flat().filter((x) => x != null && x !== false));
    return e;
  }
  var el = (tag, cls) => h(tag, cls ? { class: cls } : null);
  function xFont() {
    const ref = document.querySelector('[data-testid="primaryColumn"]') || document.querySelector("#react-root") || document.body;
    const ff = getComputedStyle(ref).fontFamily;
    return ff && !/^\s*(Times|serif)/i.test(ff) ? ff : 'TwitterChirp, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';
  }
  function toast(msg) {
    const t6 = h("div", { class: "yx-toast", style: { fontFamily: xFont() } }, msg);
    document.body.appendChild(t6);
    setTimeout(() => t6.remove(), 3500);
  }
  var styles = /* @__PURE__ */ new Map();
  var styleEls = /* @__PURE__ */ new WeakMap();
  var seenRoots = [];
  var hostOf = (root) => root === document ? document.head || document.documentElement : root;
  function applyOne(root, id) {
    let m = styleEls.get(root);
    if (!m) {
      m = /* @__PURE__ */ new Map();
      styleEls.set(root, m);
    }
    let s = m.get(id);
    if (!s || !s.isConnected) {
      s = document.createElement("style");
      s.dataset.yx = id;
      hostOf(root).appendChild(s);
      m.set(id, s);
    }
    s.textContent = styles.get(id);
  }
  function addStyle(id, css) {
    styles.set(id, css);
    [document, ...seenRoots].forEach((r) => applyOne(r, id));
  }
  function removeStyle(id) {
    styles.delete(id);
    [document, ...seenRoots].forEach((r) => {
      const m = styleEls.get(r);
      const s = m && m.get(id);
      if (s) {
        s.remove();
        m.delete(id);
      }
    });
  }
  var OBS = { childList: true, subtree: true, attributes: true, attributeFilter: ["src"] };
  var watched = /* @__PURE__ */ new WeakSet();
  var mo = null;
  function initObserver(cb) {
    mo = new MutationObserver(cb);
    mo.observe(document.documentElement, OBS);
  }
  function watchRoot(root) {
    if (watched.has(root)) return;
    watched.add(root);
    if (mo) mo.observe(root, OBS);
    styles.forEach((_, id) => applyOne(root, id));
  }
  function getRoots() {
    const out = [document];
    const walk = (root) => {
      root.querySelectorAll("*").forEach((n) => {
        if (n.shadowRoot) {
          out.push(n.shadowRoot);
          watchRoot(n.shadowRoot);
          walk(n.shadowRoot);
        }
      });
    };
    walk(document);
    seenRoots = out.slice(1);
    return out;
  }
  var getSeenRoots = () => seenRoots;
  var qAll = (roots, sel) => roots.flatMap((r) => [...r.querySelectorAll(sel)]);

  // src/core/locales.js
  var locales_default = {
    ru: {
      back: "Назад",
      close: "Закрыть",
      general: "Общие",
      generalDesc: "Язык, меню, отладка",
      plugins: "Плагины",
      pluginsDesc: "{n} из {m} включено",
      search: "Поиск плагинов…",
      nothing: "Ничего не найдено",
      pluginSettings: "Настройки плагина",
      backup: "Резервная копия",
      backupDesc: "Экспорт и импорт настроек",
      export: "Экспорт настроек",
      import: "Импорт настроек",
      reset: "Сбросить",
      confirmReset: "Сбросить включённые плагины и их настройки? Данные плагинов (например, избранные GIF) не затрагиваются.",
      imported: "Настройки импортированы",
      resetDone: "Настройки сброшены",
      readErr: "Не получилось прочитать файл: ",
      notYovarix: "это не файл настроек YovariX",
      lang: "Язык",
      langAuto: "Авто",
      menuItem: "Пункт YovariX в меню «Ещё»",
      menuItemHint: "Если выключить, настройки открываются из меню менеджера скриптов",
      debug: "Отладочные сообщения в консоли",
      themes: "Темы",
      themesDesc: "Онлайн-темы и свой CSS ({n} вкл.)",
      themeUrl: "Ссылка на CSS темы…",
      add: "Добавить",
      badUrl: "Нужна ссылка http(s)",
      dup: "Тема уже добавлена",
      stLoading: "Загрузка…",
      stOk: "Загружено",
      stError: "Ошибка загрузки",
      stCached: "Не удалось обновить, используется кэш",
      refresh: "Обновить",
      remove: "Удалить",
      customCss: "Свой CSS",
      customPh: "/* твой CSS */",
      noThemes: "Тем пока нет",
      officialThemes: "Официальные темы",
      noOfficial: "Официальных тем пока нет",
      myThemes: "Мои темы",
      officialDesc: "Темы из репозитория YovariX ({n} вкл.)",
      version: "Версия",
      repo: "Репозиторий",
      update: "Проверить обновление",
      upToDate: "Установлена последняя версия (v{v})",
      updateErr: "Не удалось проверить обновление",
      reloadTitle: "Обновление до v{v}",
      reloadText: "Новая версия YovariX установлена. Перезагрузите вкладку, чтобы применить изменения.",
      reloadPending: "Установите v{v} во вкладке, которая открылась, затем перезагрузите эту вкладку, чтобы применить изменения.",
      reloadBtn: "Перезагрузить",
      later: "Позже",
      install: "Установить",
      availTitle: "Доступна v{v}",
      reloadAvail: "Вышла новая версия YovariX. Нажмите «Установить», затем перезагрузите вкладку.",
      autoUpdate: "Проверять обновления при открытии X",
      autoUpdateHint: "Не чаще раза в 2 часа",
      changelog: "Что нового",
      changelogDesc: "Список изменений по версиям",
      newsTitle: "YovariX обновлён до v{v}",
      allChanges: "Все изменения",
      onbAgain: "Приветствие и первичная настройка",
      onbWelcome: "Добро пожаловать!",
      onbWelcomeText: "YovariX — модульный мод для X/Twitter. Быстро настроим основное, это займёт минуту.",
      onbPluginsTitle: "Выберите плагины",
      onbPluginsText: "Включите нужные — позже это можно поменять в Настройки → Плагины. Там же у плагинов есть дополнительные опции (значок с ползунками).",
      onbThemesHint: "Онлайн-темы и свой CSS добавляются в Настройки → Темы.",
      onbOpenTitle: "Как открыть настройки",
      onbOpenText: "Настройки доступны в любой момент двумя способами:",
      onbHowMenu: "В боковом меню X нажмите «Ещё» — там появится пункт YovariX:",
      onbHowManager: "Или нажмите на иконку менеджера скриптов (Tampermonkey, Violentmonkey) в браузере и выберите YovariX.",
      onbSkip: "Пропустить",
      onbNext: "Далее",
      onbOpen: "Открыть настройки",
      onbDone: "Готово"
    },
    en: {
      back: "Back",
      close: "Close",
      general: "General",
      generalDesc: "Language, menu, debugging",
      plugins: "Plugins",
      pluginsDesc: "{n} of {m} enabled",
      search: "Search plugins…",
      nothing: "Nothing found",
      pluginSettings: "Plugin settings",
      backup: "Backup",
      backupDesc: "Export and import settings",
      export: "Export settings",
      import: "Import settings",
      reset: "Reset",
      confirmReset: "Reset enabled plugins and their settings? Plugin data (e.g. favorite GIFs) is not affected.",
      imported: "Settings imported",
      resetDone: "Settings reset",
      readErr: "Could not read the file: ",
      notYovarix: "this is not a YovariX settings file",
      lang: "Language",
      langAuto: "Auto",
      menuItem: 'YovariX item in the "More" menu',
      menuItemHint: "If disabled, open settings from the userscript manager menu",
      debug: "Debug messages in the console",
      themes: "Themes",
      themesDesc: "Online themes and custom CSS ({n} on)",
      themeUrl: "Link to a theme CSS file…",
      add: "Add",
      badUrl: "An http(s) link is required",
      dup: "Theme already added",
      stLoading: "Loading…",
      stOk: "Loaded",
      stError: "Load failed",
      stCached: "Update failed, using cache",
      refresh: "Refresh",
      remove: "Remove",
      customCss: "Custom CSS",
      customPh: "/* your CSS */",
      noThemes: "No themes yet",
      officialThemes: "Official themes",
      noOfficial: "No official themes yet",
      myThemes: "My themes",
      officialDesc: "Themes from the YovariX repository ({n} on)",
      version: "Version",
      repo: "Repository",
      update: "Check for updates",
      upToDate: "You have the latest version (v{v})",
      updateErr: "Could not check for updates",
      reloadTitle: "Update to v{v}",
      reloadText: "A new YovariX version is installed. Reload the tab to apply the changes.",
      reloadPending: "Install v{v} in the tab that just opened, then reload this tab to apply the changes.",
      reloadBtn: "Reload",
      later: "Later",
      install: "Install",
      availTitle: "v{v} is available",
      reloadAvail: 'A new YovariX version is out. Click "Install", then reload the tab.',
      autoUpdate: "Check for updates when X opens",
      autoUpdateHint: "At most once every 2 hours",
      changelog: "What's new",
      changelogDesc: "Changes by version",
      newsTitle: "YovariX updated to v{v}",
      allChanges: "All changes",
      onbAgain: "Welcome & initial setup",
      onbWelcome: "Welcome!",
      onbWelcomeText: "YovariX is a modular mod for X/Twitter. Let's set up the basics, it takes a minute.",
      onbPluginsTitle: "Choose plugins",
      onbPluginsText: "Turn on what you need. You can change this later in Settings → Plugins, where plugins also have extra options (the sliders icon).",
      onbThemesHint: "Online themes and custom CSS are added in Settings → Themes.",
      onbOpenTitle: "How to open settings",
      onbOpenText: "You can open the settings at any time in two ways:",
      onbHowMenu: 'In the X sidebar click "More" — a YovariX item appears there:',
      onbHowManager: "Or click your userscript manager icon (Tampermonkey, Violentmonkey) in the browser and choose YovariX.",
      onbSkip: "Skip",
      onbNext: "Next",
      onbOpen: "Open settings",
      onbDone: "Done"
    }
  };

  // src/core/i18n.js
  var source = () => "auto";
  var setLangSource = (fn) => {
    source = fn;
  };
  var lang = () => {
    const p = source();
    if (p === "ru" || p === "en") return p;
    return (navigator.language || "en").toLowerCase().startsWith("ru") ? "ru" : "en";
  };
  var subs = /* @__PURE__ */ new Set();
  var onLangChange = (cb) => {
    subs.add(cb);
    return () => subs.delete(cb);
  };
  var emitLang = () => subs.forEach((f) => {
    try {
      f();
    } catch (e) {
      console.error(e);
    }
  });
  var createT = (d) => (key, vars) => {
    let s = d[lang()] && d[lang()][key] || d.en && d.en[key] || key;
    if (vars) s = s.replace(/\{(\w+)\}/g, (m, k) => k in vars ? vars[k] : m);
    return s;
  };
  var tr = (v) => {
    if (typeof v === "function") return v();
    if (v && typeof v === "object") return v[lang()] || v.en || "";
    return v == null ? "" : v;
  };
  var t = createT(locales_default);

  // src/core/api.js
  var ENABLED_KEY = "yovarix:enabled";
  var optsKey = (n) => "yovarix:opts:" + n;
  var plugins = [];
  var listeners = /* @__PURE__ */ new Set();
  var onPluginsChange = (cb) => {
    listeners.add(cb);
    return () => listeners.delete(cb);
  };
  var notify = () => emit();
  var emit = () => listeners.forEach((f) => {
    try {
      f();
    } catch (e) {
      console.error(e);
    }
  });
  var optCache = /* @__PURE__ */ new Map();
  var getOpts = (name) => {
    if (!optCache.has(name)) optCache.set(name, read(optsKey(name), {}) || {});
    return optCache.get(name);
  };
  function definePluginSettings(def) {
    const owner = { name: null };
    const store = new Proxy({}, {
      get(_, key) {
        if (!(key in def)) return void 0;
        const saved = getOpts(owner.name);
        return key in saved ? saved[key] : def[key].default;
      },
      set(_, key, value) {
        const saved = { ...getOpts(owner.name), [key]: value };
        optCache.set(owner.name, saved);
        write(optsKey(owner.name), saved);
        if (def[key] && def[key].onChange) def[key].onChange(value);
        return true;
      }
    });
    return { def, store, owner };
  }
  var extras = [];
  var registerCoreSettings = (name, settings6) => {
    settings6.owner.name = name;
    extras.push({ name, settings: settings6 });
  };
  var withSettings = () => [...extras, ...plugins].filter((p) => p.settings);
  function definePlugin(p) {
    if (!p.name) throw new Error("plugin without name");
    if (p.settings) p.settings.owner.name = p.name;
    return p;
  }
  var enabledMap = () => read(ENABLED_KEY, {}) || {};
  var isEnabled = (p) => {
    const m = enabledMap();
    return p.name in m ? !!m[p.name] : p.enabledByDefault !== false;
  };
  function startPlugin(p) {
    if (p.started) return;
    try {
      if (p.styles) addStyle("plugin:" + p.name, p.styles);
      p.start && p.start();
      p.started = true;
      LOG("plugin on:", p.name);
    } catch (e) {
      console.error("[YovariX] start failed:", p.name, e);
    }
  }
  function stopPlugin(p) {
    if (!p.started) return;
    try {
      p.stop && p.stop();
    } catch (e) {
      console.error("[YovariX] stop failed:", p.name, e);
    }
    removeStyle("plugin:" + p.name);
    p.started = false;
    LOG("plugin off:", p.name);
  }
  function syncPlugins() {
    plugins.forEach((p) => isEnabled(p) ? startPlugin(p) : stopPlugin(p));
    emit();
  }
  function setEnabled(p, on) {
    write(ENABLED_KEY, { ...enabledMap(), [p.name]: !!on });
    syncPlugins();
  }
  function registerPlugins(list) {
    plugins.push(...list);
    syncPlugins();
  }
  var backups = [];
  var registerBackup = (key, get, set) => backups.push({ key, get, set });
  var exportConfig = () => ({
    yovarix: 1,
    extra: Object.fromEntries(backups.map((b) => [b.key, b.get()])),
    enabled: enabledMap(),
    options: Object.fromEntries(withSettings().map((p) => [p.name, { ...getOpts(p.name) }]))
  });
  function importConfig(obj) {
    if (!obj || obj.yovarix !== 1) throw new Error(t("notYovarix"));
    write(ENABLED_KEY, obj.enabled || {});
    withSettings().forEach((p) => {
      const o = obj.options && obj.options[p.name] || {};
      optCache.set(p.name, o);
      write(optsKey(p.name), o);
    });
    backups.forEach((b) => {
      if (obj.extra && b.key in obj.extra) b.set(obj.extra[b.key]);
    });
    syncPlugins();
  }
  function resetConfig() {
    write(ENABLED_KEY, {});
    withSettings().forEach((p) => {
      optCache.set(p.name, {});
      write(optsKey(p.name), {});
    });
    syncPlugins();
  }

  // src/plugins/adBlock/i18n.js
  var t2 = createT({
    ru: {
      title: "Блокировщик рекламы",
      desc: "Скрывает рекламные посты в ленте, результатах поиска и под постами",
      optPremium: "Скрывать карточку «Подпишитесь на Premium»",
      optPremiumHint: "Рекламный блок Premium в правой колонке"
    },
    en: {
      title: "Ad blocker",
      desc: "Hides promoted posts in the timeline, search results and under posts",
      optPremium: 'Hide the "Subscribe to Premium" card',
      optPremiumHint: "The Premium promo block in the right column"
    }
  });

  // src/plugins/adBlock/index.js
  var ATTR = "data-yx-ad";
  var settings = definePluginSettings({
    premiumPromo: { type: "boolean", title: () => t2("optPremium"), hint: () => t2("optPremiumHint"), default: true, onChange: notify }
  });
  var STYLE_ID = "plugin:adBlock:rules";
  var CSS = `[${ATTR}] { display: none !important; }`;
  var LABELS = /* @__PURE__ */ new Set([
    "ad",
    "promoted",
    "promoted by",
    "реклама",
    "промо",
    "anzeige",
    "gesponsert",
    "anuncio",
    "promocionado",
    "publicidad",
    "sponsorisé",
    "publicité",
    "annuncio",
    "sponsorizzato",
    "anúncio",
    "patrocinado",
    "promovido",
    "advertentie",
    "gepromoot",
    "reklam",
    "reklama",
    "sponsorowane",
    "iklan",
    "ad·",
    "広告",
    "プロモーション",
    "광고",
    "프로모션",
    "推广",
    "推廣",
    "广告",
    "廣告",
    "إعلان",
    "विज्ञापन"
  ]);
  var SKIP = '[data-testid="tweetText"], [data-testid^="card."], [data-testid="User-Name"]';
  function hasLabel(article2) {
    for (const el2 of article2.querySelectorAll("span")) {
      if (el2.childElementCount) continue;
      const txt = (el2.textContent || "").trim().toLowerCase();
      if (!txt || txt.length > 20 || !LABELS.has(txt)) continue;
      if (el2.closest(SKIP)) continue;
      return true;
    }
    return false;
  }
  var hasTrackedLink = (article2) => [...article2.querySelectorAll('a[href*="twclid="]')].some((a) => !a.closest('[data-testid="tweetText"]'));
  var hasOwnTime = (article2) => !!article2.querySelector('a[href*="/status/"] time');
  var isAd = (article2) => hasTrackedLink(article2) || hasLabel(article2) && !hasOwnTime(article2);
  var cellOf = (article2) => article2.closest('[data-testid="cellInnerDiv"]') || article2;
  var isPremiumPromo = (aside) => !!aside.querySelector('a[href^="/i/premium_sign_up"]');
  function scanPromos(roots) {
    qAll(roots, 'aside[role="complementary"]').forEach((aside) => {
      const hide = settings.store.premiumPromo && isPremiumPromo(aside);
      if (hide && !aside.hasAttribute(ATTR)) {
        aside.setAttribute(ATTR, "");
        LOG("premium promo hidden");
      } else if (!hide && aside.hasAttribute(ATTR)) aside.removeAttribute(ATTR);
    });
  }
  function scan(roots) {
    scanPromos(roots);
    qAll(roots, 'article[data-testid="tweet"]').forEach((article2) => {
      const cell = cellOf(article2);
      const ad = isAd(article2);
      if (ad && !cell.hasAttribute(ATTR)) {
        cell.setAttribute(ATTR, "");
        LOG("ad hidden");
      } else if (!ad && cell.hasAttribute(ATTR)) cell.removeAttribute(ATTR);
    });
  }
  var adBlock_default = definePlugin({
    name: "adBlock",
    title: () => t2("title"),
    description: () => t2("desc"),
    enabledByDefault: false,
    settings,
    start() {
      addStyle(STYLE_ID, CSS);
    },
    stop() {
      removeStyle(STYLE_ID);
      qAll(getRoots(), "[" + ATTR + "]").forEach((n) => n.removeAttribute(ATTR));
    },
    scan
  });

  // src/plugins/embedLink/i18n.js
  var t3 = createT({
    ru: {
      title: "Ссылки с эмбедом",
      desc: "Кнопка «Поделиться → Копировать ссылку» копирует ссылку через эмбед-фиксер (fixupx.com и др.), чтобы в Discord/Telegram сразу был превью",
      optService: "Сервис эмбедов",
      optCustom: "Свой домен",
      optCustomHint: "Работает, если выше выбран «Свой домен». Например: fx.example.com",
      optToast: "Показывать уведомление при замене ссылки",
      custom: "Свой домен…",
      done: "Ссылка скопирована: {host}"
    },
    en: {
      title: "Embed links",
      desc: "Share → Copy link copies the link through an embed fixer (fixupx.com etc.) so Discord/Telegram shows a preview right away",
      optService: "Embed service",
      optCustom: "Custom domain",
      optCustomHint: 'Used when "Custom domain…" is selected above. Example: fx.example.com',
      optToast: "Show a notification when the link is replaced",
      custom: "Custom domain…",
      done: "Link copied: {host}"
    }
  });

  // src/plugins/embedLink/settings.js
  var SERVICES = ["fixupx.com", "fxtwitter.com", "vxtwitter.com", "fixvx.com"];
  var settings2 = definePluginSettings({
    service: {
      type: "select",
      title: () => t3("optService"),
      default: "fixupx.com",
      choices: [...SERVICES.map((h2) => ({ value: h2, label: h2 })), { value: "custom", label: () => t3("custom") }]
    },
    custom: { type: "text", title: () => t3("optCustom"), hint: () => t3("optCustomHint"), default: "" },
    toast: { type: "boolean", title: () => t3("optToast"), default: false }
  });

  // src/plugins/embedLink/helpers.js
  var COPY_ICON = "M18.36 5.64c-1.95-1.96-5.11-1.96-7.07 0";
  var COPY_TEXT = /^(copy link|копировать ссылку)/i;
  var cleanHost = (s) => String(s || "").trim().replace(/^[a-z]+:\/\//i, "").split(/[/?#\s]/)[0].toLowerCase();
  function isCopyItem(item) {
    const p = item.querySelector("svg path");
    if (p && (p.getAttribute("d") || "").startsWith(COPY_ICON)) return true;
    return COPY_TEXT.test((item.textContent || "").trim());
  }
  function tweetPath(pathname) {
    const m = /^\/([^/]+)\/status\/(\d+)/.exec(pathname || "");
    return m ? { user: m[1], id: m[2] } : null;
  }
  function refFromArticle(article2, origin) {
    if (!article2) return null;
    const a = [...article2.querySelectorAll('a[href*="/status/"]')].find((x) => x.querySelector("time"));
    return a ? tweetPath(new URL(a.getAttribute("href"), origin).pathname) : null;
  }
  var buildUrl = (host, ref) => `https://${host}/${ref.user}/status/${ref.id}`;

  // src/plugins/embedLink/index.js
  var article = null;
  var timer = 0;
  var hostNow = () => {
    const s = settings2.store;
    return s.service === "custom" ? cleanHost(s.custom) : s.service;
  };
  function copy(text) {
    if (typeof GM_setClipboard === "function") GM_setClipboard(text, "text");
    else if (navigator.clipboard) navigator.clipboard.writeText(text).catch(() => {
    });
  }
  function onClick(e) {
    const target = e.target;
    if (!target || !target.closest) return;
    const item = target.closest('[role="menuitem"]');
    if (item) {
      if (!isCopyItem(item)) return;
      const ref = refFromArticle(article && article.isConnected ? article : null, location.origin) || tweetPath(location.pathname);
      const host = hostNow();
      if (!ref || !host) return;
      clearTimeout(timer);
      timer = setTimeout(() => {
        copy(buildUrl(host, ref));
        if (settings2.store.toast) toast(t3("done", { host }));
      }, 150);
      return;
    }
    if (target.closest('[role="menu"]')) return;
    article = target.closest("article");
  }
  var embedLink_default = definePlugin({
    name: "embedLink",
    title: () => t3("title"),
    description: () => t3("desc"),
    enabledByDefault: false,
    settings: settings2,
    start() {
      document.addEventListener("click", onClick, true);
    },
    stop() {
      document.removeEventListener("click", onClick, true);
      clearTimeout(timer);
      article = null;
    }
  });

  // src/core/general.js
  var settings3 = definePluginSettings({
    lang: {
      type: "select",
      title: () => t("lang"),
      default: "auto",
      onChange: emitLang,
      choices: [{ value: "auto", label: () => t("langAuto") }, { value: "ru", label: "Русский" }, { value: "en", label: "English" }]
    },
    menuItem: { type: "boolean", title: () => t("menuItem"), hint: () => t("menuItemHint"), default: true, onChange: notify },
    autoUpdate: { type: "boolean", title: () => t("autoUpdate"), hint: () => t("autoUpdateHint"), default: true },
    debug: { type: "boolean", title: () => t("debug"), default: false, onChange: setDebug }
  });
  registerCoreSettings("core", settings3);
  setLangSource(() => settings3.store.lang);
  var apply = () => setDebug(settings3.store.debug);
  apply();
  onPluginsChange(apply);

  // src/core/ui/icons.js
  var ico = (inner, fill) => h("span", {
    innerHTML: '<svg viewBox="0 0 24 24" width="' + (fill ? 20 : 26) + '" height="' + (fill ? 20 : 26) + '" fill="' + (fill ? "currentColor" : "none") + '" stroke="' + (fill ? "none" : "currentColor") + '" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">' + inner + "</svg>"
  });
  var I = {
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
    tune: '<path d="M4 7h9M19 7h1M4 17h1M11 17h9"/><circle cx="16" cy="7" r="2"/><circle cx="8" cy="17" r="2"/>'
  };
  var iconBtn = (title, inner, fill, onclick) => h("button", { type: "button", class: "yx-icon", title, onclick }, ico(inner, fill));
  var tile = (icon, title, desc, onclick) => h(
    "button",
    { type: "button", class: "yx-tile", onclick },
    h("span", { class: "yx-tile-ico" }, ico(icon)),
    h("span", { class: "yx-tile-txt" }, h("span", { class: "yx-tile-title" }, title), h("span", { class: "yx-tile-desc" }, desc)),
    h("span", { class: "yx-tile-chev" }, ico(I.chev))
  );

  // src/core/themes.js
  var KEY = "yovarix:themes";
  var CACHE = "yovarix:themecache";
  var TTL = 10 * 60 * 1e3;
  var DEF = { links: [], custom: "", customOn: true };
  var getThemes = () => ({ ...DEF, ...read(KEY, {}) || {} });
  var save = (s) => write(KEY, s);
  var getCache = () => read(CACHE, {}) || {};
  var subs2 = /* @__PURE__ */ new Set();
  var onThemesChange = (cb) => {
    subs2.add(cb);
    return () => subs2.delete(cb);
  };
  var emit2 = () => subs2.forEach((f) => {
    try {
      f();
    } catch (e) {
      console.error(e);
    }
  });
  var status = /* @__PURE__ */ new Map();
  var getStatus = (u) => status.get(u) || "";
  var getMeta = (u) => (getCache()[u] || {}).meta || {};
  function normalizeUrl(u) {
    u = (u || "").trim();
    const m = u.match(/^https?:\/\/github\.com\/([^/]+)\/([^/]+)\/blob\/(.+)$/);
    return m ? `https://raw.githubusercontent.com/${m[1]}/${m[2]}/${m[3]}` : u;
  }
  function parseMeta(css) {
    const m = css.match(/\/\*\*?([\s\S]*?)\*\//);
    const o = {};
    if (m) for (const k of ["name", "author", "description", "version"]) {
      const r = m[1].match(new RegExp("@" + k + "\\s+(.+)"));
      if (r) o[k] = r[1].trim();
    }
    return o;
  }
  var gm = (url, headers) => new Promise((res, rej) => GM_xmlhttpRequest({
    method: "GET",
    url,
    headers,
    responseType: "text",
    timeout: 15e3,
    onload: (r) => r.status >= 200 && r.status < 300 ? res(r.responseText) : rej(new Error("HTTP " + r.status)),
    onerror: () => rej(new Error("network")),
    ontimeout: () => rej(new Error("timeout"))
  }));
  async function resolveCss(url, text, depth = 0) {
    const abs = (u) => {
      try {
        return new URL(u, url).href;
      } catch (e) {
        return u;
      }
    };
    let out = text;
    const imports = [...text.matchAll(/@import\s+(?:url\(\s*)?['"]?([^'")\s;]+)['"]?\s*\)?[^;]*;/gi)];
    for (const m of imports) {
      let sub = "";
      if (depth < 3) {
        try {
          const u = abs(m[1]);
          sub = await resolveCss(u, await gm(u), depth + 1);
        } catch (e) {
          LOG("theme @import failed:", m[1], e.message);
        }
      }
      out = out.replace(m[0], sub);
    }
    return out.replace(/url\(\s*(['"]?)(?!data:|https?:|\/\/|#)([^'")]+)\1\s*\)/gi, (m, q, u) => `url("${abs(u)}")`);
  }
  var applied = /* @__PURE__ */ new Set();
  var apply2 = (id, css) => {
    applied.add(id);
    addStyle(id, css);
  };
  var unapply = (id) => {
    applied.delete(id);
    removeStyle(id);
  };
  function applyLink(l) {
    const id = "theme:" + l.url;
    const c = getCache()[l.url];
    if (l.enabled && c) apply2(id, c.css);
    else unapply(id);
  }
  function applyCustom() {
    const s = getThemes();
    if (s.customOn && s.custom.trim()) apply2("theme:custom", s.custom);
    else unapply("theme:custom");
  }
  async function load(url, force) {
    const cache = getCache();
    if (!force && cache[url] && Date.now() - cache[url].t < TTL) {
      status.set(url, "ok");
      emit2();
      return;
    }
    status.set(url, "loading");
    emit2();
    try {
      const raw = await gm(url);
      const css = await resolveCss(url, raw);
      const c = getCache();
      c[url] = { css, meta: parseMeta(raw), t: Date.now() };
      write(CACHE, c);
      status.set(url, "ok");
    } catch (e) {
      LOG("theme load failed:", url, e.message);
      status.set(url, cache[url] ? "cached" : "error");
    }
    const l = getThemes().links.find((x) => x.url === url);
    if (l) applyLink(l);
    emit2();
  }
  function reapplyAll() {
    [...applied].forEach(unapply);
    const s = getThemes();
    s.links.forEach((l) => {
      applyLink(l);
      if (l.enabled) load(l.url);
    });
    applyCustom();
    emit2();
  }
  function initThemes() {
    reapplyAll();
  }
  function addTheme(input) {
    const url = normalizeUrl(input);
    if (!/^https?:\/\/\S+$/i.test(url)) return "badUrl";
    const s = getThemes();
    if (s.links.some((l) => l.url === url)) return "dup";
    s.links.push({ url, enabled: true });
    save(s);
    load(url, true);
    emit2();
    return null;
  }
  function removeTheme(url) {
    const s = getThemes();
    s.links = s.links.filter((l) => l.url !== url);
    save(s);
    unapply("theme:" + url);
    status.delete(url);
    emit2();
  }
  function setThemeEnabled(url, on) {
    const s = getThemes();
    const l = s.links.find((x) => x.url === url);
    if (!l) return;
    l.enabled = !!on;
    save(s);
    applyLink(l);
    if (on) load(url);
    emit2();
  }
  var refreshTheme = (url) => load(url, true);
  var OFFICIAL_KEY = "yovarix:officialthemes";
  var OFFICIAL_TTL = 60 * 60 * 1e3;
  var OFFICIAL_API = `https://api.github.com/repos/${"SevaGetz/YovariX"}/contents/themes`;
  var official = { status: "", items: [] };
  var officialBusy = false;
  var getOfficial = () => official;
  async function loadOfficial(force) {
    if (officialBusy) return;
    const c = read(OFFICIAL_KEY, null);
    const cached = c && Array.isArray(c.items) ? c.items : null;
    if (!force && cached && Date.now() - c.t < OFFICIAL_TTL) {
      official = { status: "ok", items: cached };
      emit2();
      return;
    }
    officialBusy = true;
    official = { status: "loading", items: cached || [] };
    emit2();
    try {
      let list = [];
      try {
        list = JSON.parse(await gm(OFFICIAL_API, { Accept: "application/vnd.github+json" }));
      } catch (e) {
        if (e.message !== "HTTP 404") throw e;
      }
      if (!Array.isArray(list)) throw new Error("bad response");
      const items = list.filter((f) => f && f.type === "file" && /\.css$/i.test(f.name) && f.download_url).map((f) => ({ name: f.name.replace(/\.css$/i, ""), url: f.download_url })).sort((a, b) => a.name.localeCompare(b.name));
      await Promise.all(items.map(async (it) => {
        try {
          it.meta = parseMeta(await gm(it.url));
        } catch (e) {
          it.meta = {};
        }
      }));
      write(OFFICIAL_KEY, { items, t: Date.now() });
      official = { status: "ok", items };
    } catch (e) {
      LOG("official themes load failed:", e.message);
      official = { status: cached ? "cached" : "error", items: cached || [] };
    }
    officialBusy = false;
    emit2();
  }
  function setOfficialTheme(url, on) {
    const s = getThemes();
    const l = s.links.find((x) => x.url === url);
    if (l) {
      setThemeEnabled(url, on);
      return;
    }
    if (!on) return;
    s.links.push({ url, enabled: true, official: true });
    save(s);
    load(url, true);
    emit2();
  }
  function setCustom(css, on) {
    const s = getThemes();
    if (css != null) s.custom = css;
    if (on != null) s.customOn = !!on;
    save(s);
    applyCustom();
  }
  registerBackup("themes", getThemes, (v) => {
    if (v && typeof v === "object") {
      save({ ...DEF, ...v });
      reapplyAll();
    }
  });

  // src/core/ui/themes.js
  var sw = (checked, onChange) => {
    const i = h("input", { type: "checkbox", checked: !!checked });
    i.addEventListener("change", () => onChange(i.checked));
    return h("label", { class: "yx-sw" }, i, h("span"));
  };
  var fallbackName = (u) => {
    try {
      return decodeURIComponent(new URL(u).pathname.split("/").pop()) || u;
    } catch (e) {
      return u;
    }
  };
  var STATUS = { loading: "stLoading", ok: "stOk", error: "stError", cached: "stCached" };
  function renderThemes(box, go) {
    const input = h("input", { class: "yx-search", type: "text", placeholder: t("themeUrl") });
    const add = () => {
      const err = addTheme(input.value);
      if (err) {
        toast(t(err));
        return;
      }
      input.value = "";
    };
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") add();
    });
    const list = h("div");
    const draw = () => {
      list.textContent = "";
      const offUrls = new Set(getOfficial().items.map((i) => i.url));
      const links = getThemes().links.filter((l) => !l.official && !offUrls.has(l.url));
      if (!links.length) list.append(h("div", { class: "yx-empty" }, t("noThemes")));
      links.forEach((l) => {
        const meta = getMeta(l.url);
        const st = getStatus(l.url);
        const sub = [st ? t(STATUS[st]) : "", meta.author, meta.version && "v" + meta.version].filter(Boolean).join(" · ");
        list.append(h(
          "div",
          { class: "yx-plugin" },
          h(
            "div",
            { class: "yx-prow" },
            h(
              "div",
              { class: "yx-pinfo" },
              h("div", { class: "yx-pname" }, meta.name || fallbackName(l.url)),
              meta.description ? h("div", { class: "yx-pdesc" }, meta.description) : null,
              h("div", { class: "yx-pdesc" + (st === "error" ? " yx-err" : ""), style: { wordBreak: "break-all" } }, l.url + (sub ? " — " + sub : ""))
            ),
            iconBtn(t("refresh"), I.refresh, false, () => refreshTheme(l.url)),
            iconBtn(t("remove"), I.trash, false, () => removeTheme(l.url)),
            sw(l.enabled, (v) => setThemeEnabled(l.url, v))
          )
        ));
      });
    };
    const off = onThemesChange(draw);
    draw();
    const s = getThemes();
    const area = h("textarea", { class: "yx-code", spellcheck: false, placeholder: t("customPh") });
    area.value = s.custom;
    let timer3 = 0;
    area.addEventListener("input", () => {
      clearTimeout(timer3);
      timer3 = setTimeout(() => setCustom(area.value, null), 400);
    });
    const onCount = getThemes().links.filter((l) => l.enabled && l.official).length;
    box.append(
      tile(I.themes, t("officialThemes"), t("officialDesc", { n: onCount }), () => go("themes-official")),
      h("div", { class: "yx-sect" }, t("myThemes")),
      h("div", { class: "yx-add" }, input, h("button", { type: "button", class: "yx-primary", onclick: add }, t("add"))),
      list,
      h("div", { class: "yx-sect" }, t("customCss"), sw(s.customOn, (v) => setCustom(null, v))),
      area
    );
    return () => {
      off();
      clearTimeout(timer3);
    };
  }
  function renderOfficialThemes(box) {
    const offList = h("div");
    const drawOfficial = () => {
      offList.textContent = "";
      const { status: status2, items } = getOfficial();
      if (!items.length) {
        const msg = status2 === "loading" ? t("stLoading") : status2 === "error" ? t("stError") : t("noOfficial");
        offList.append(h("div", { class: "yx-empty" + (status2 === "error" ? " yx-err" : "") }, msg));
        return;
      }
      if (status2 === "cached") offList.append(h("div", { class: "yx-pdesc" }, t("stCached")));
      const links = getThemes().links;
      items.forEach((it) => {
        const meta = { ...it.meta || {}, ...getMeta(it.url) };
        const l = links.find((x) => x.url === it.url);
        const sub = [meta.author, meta.version && "v" + meta.version].filter(Boolean).join(" · ");
        offList.append(h(
          "div",
          { class: "yx-plugin" },
          h(
            "div",
            { class: "yx-prow" },
            h(
              "div",
              { class: "yx-pinfo" },
              h("div", { class: "yx-pname" }, meta.name || it.name),
              meta.description ? h("div", { class: "yx-pdesc" }, meta.description) : null,
              sub ? h("div", { class: "yx-pdesc" }, sub) : null
            ),
            sw(!!(l && l.enabled), (v) => setOfficialTheme(it.url, v))
          )
        ));
      });
    };
    const off = onThemesChange(drawOfficial);
    drawOfficial();
    loadOfficial(false);
    box.append(
      h("div", { class: "yx-sect", style: { marginTop: 0 } }, t("officialThemes"), iconBtn(t("refresh"), I.refresh, false, () => loadOfficial(true))),
      offList
    );
    return off;
  }

  // src/core/version.js
  var isNewer = (a, b) => {
    const x = String(a).split(".").map(Number);
    const y = String(b).split(".").map(Number);
    for (let i = 0; i < Math.max(x.length, y.length); i++) {
      const d = (x[i] || 0) - (y[i] || 0);
      if (d) return d > 0;
    }
    return false;
  };

  // src/core/install.js
  function openInstaller() {
    const a = document.createElement("a");
    a.href = "https://raw.githubusercontent.com/SevaGetz/YovariX/main/dist/YovariX.user.js";
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  // src/core/ui/pop.js
  function showPop(key, { title, body, buttons }) {
    const old = document.querySelector('.yx-pop[data-key="' + key + '"]');
    if (old) old.remove();
    let host = document.querySelector(".yx-pops");
    if (!host) {
      host = h("div", { class: "yx-pops" });
      document.body.appendChild(host);
    }
    const cs = getComputedStyle(document.body);
    const bg = cs.backgroundColor === "rgba(0, 0, 0, 0)" ? "rgb(0, 0, 0)" : cs.backgroundColor;
    const [r, g, b] = (bg.match(/\d+/g) || [0, 0, 0]).map(Number);
    const box = h("div", { class: "yx-modal yx-small yx-pop", role: "alertdialog" });
    box.dataset.key = key;
    box.dataset.theme = (r * 299 + g * 587 + b * 114) / 1e3 > 128 ? "light" : "dark";
    box.style.background = bg;
    box.style.color = cs.color;
    box.style.fontFamily = xFont();
    box.style.setProperty("--yx-bg", bg);
    box.style.setProperty("--yx-fg", cs.color);
    box.append(h(
      "div",
      { class: "yx-dlg" },
      h("h2", null, title),
      body,
      h("div", { class: "yx-btns" }, buttons.map((b2) => h("button", {
        type: "button",
        class: b2.primary ? "yx-primary" : null,
        onclick: () => b2.onclick(box)
      }, b2.label)))
    ));
    host.appendChild(box);
    return box;
  }

  // src/core/ui/reload.js
  function showReloadPrompt(version, mode = "installed") {
    const avail = mode === "available";
    const text = { installed: "reloadText", pending: "reloadPending", available: "reloadAvail" }[mode] || "reloadText";
    showPop("reload", {
      title: t(avail ? "availTitle" : "reloadTitle", { v: version }),
      body: h("p", null, t(text, { v: version })),
      buttons: [
        { label: t("later"), onclick: (box) => box.remove() },
        avail ? { label: t("install"), primary: true, onclick: () => {
          openInstaller();
          showReloadPrompt(version, "pending");
        } } : { label: t("reloadBtn"), primary: true, onclick: () => location.reload() }
      ]
    });
  }

  // src/core/updater.js
  var RUNNING = "yovarix:running";
  var LAST_CHECK = "yovarix:lastCheck";
  var EVERY = 2 * 60 * 60 * 1e3;
  var fetchLatest = () => new Promise((res, rej) => GM_xmlhttpRequest({
    method: "GET",
    url: "https://raw.githubusercontent.com/SevaGetz/YovariX/main/dist/YovariX.user.js?t=" + Date.now(),
    responseType: "text",
    timeout: 15e3,
    onload: (r) => {
      const m = r.status >= 200 && r.status < 300 && /@version\s+(\S+)/.exec(r.responseText || "");
      if (m) res(m[1]);
      else rej(new Error("bad response"));
    },
    onerror: () => rej(new Error("network")),
    ontimeout: () => rej(new Error("timeout"))
  }));
  function autoCheck() {
    if (!settings3.store.autoUpdate) return;
    if (Date.now() - read(LAST_CHECK, 0) < EVERY) return;
    write(LAST_CHECK, Date.now());
    fetchLatest().then((v) => {
      if (isNewer(v, "1.1.2")) showReloadPrompt(v, "available");
    }).catch(() => {
    });
  }
  function initUpdateWatch() {
    write(RUNNING, "1.1.2");
    setTimeout(autoCheck, 3e3);
    if (typeof GM_addValueChangeListener !== "function") return;
    GM_addValueChangeListener(RUNNING, (name, oldV, newV, remote) => {
      if (!remote) return;
      let v = newV;
      try {
        v = typeof newV === "string" ? JSON.parse(newV) : newV;
      } catch (e) {
      }
      if (typeof v === "string" && isNewer(v, "1.1.2")) showReloadPrompt(v);
    });
  }

  // src/releases.js
  var releases_default = [
    {
      v: "1.0",
      date: "2026-10-15",
      ru: [
        "Официальный Релиз🎉🎉🎉"
      ],
      en: [
        "Official Release🎉🎉🎉"
      ]
    },
    {
      v: "0.9",
      date: "2026-10-13",
      ru: [
        "Плагин «Скрыть пункты меню»: отключает выбранные пункты бокового меню (Обзор, Grok, Premium и др.)",
        "Плагин «Ссылки с эмбедом»: «Поделиться → Копировать ссылку» копирует ссылку через fixupx.com, fxtwitter.com, vxtwitter.com, fixvx.com или свой домен",
        "Автопроверка обновлений при открытии X (не чаще раза в 2 часа) и карточка «Перезагрузить вкладку» после обновления",
        "Кнопка «Проверить обновление» больше не оставляет лишнюю вкладку",
        "Карточка «Что нового» после обновления и страница со всеми изменениями в настройках"
      ],
      en: [
        "Hide menu items plugin: turns off selected sidebar items (Explore, Grok, Premium, etc.)",
        "Embed links plugin: Share → Copy link copies the link through fixupx.com, fxtwitter.com, vxtwitter.com, fixvx.com or your own domain",
        'Automatic update check when X opens (at most once every 2 hours) and a "Reload the tab" card after an update',
        'The "Check for updates" button no longer leaves an extra tab behind',
        `A "What's new" card after updates and a page with all changes in the settings`
      ]
    }
  ];

  // src/core/changelog.js
  var KEY2 = "yovarix:changelogSeen";
  var keyOf = (v) => String(v).split(".").slice(0, 2).join(".");
  var current = keyOf("1.1.2");
  var releases = () => releases_default.filter((e) => !isNewer(e.v, current)).sort((a, b) => isNewer(a.v, b.v) ? -1 : 1);
  var renderEntries = (list) => h("div", { class: "yx-news" }, list.flatMap((e) => [
    h("h3", null, "v" + e.v, e.date ? h("span", null, e.date) : null),
    h("ul", null, (e[lang()] || e.en || []).map((s) => h("li", null, s)))
  ]));
  function initChangelog(openSettings2) {
    const seen = read(KEY2, null);
    if (seen === null) {
      write(KEY2, current);
      return;
    }
    const fresh = releases().filter((e) => isNewer(e.v, seen)).slice(0, 3);
    if (isNewer(current, seen)) write(KEY2, current);
    if (!fresh.length) return;
    setTimeout(() => showPop("news", {
      title: t("newsTitle", { v: "1.1.2" }),
      body: renderEntries(fresh),
      buttons: [
        { label: t("allChanges"), onclick: (box) => {
          box.remove();
          openSettings2("changelog");
        } },
        { label: t("close"), primary: true, onclick: (box) => box.remove() }
      ]
    }), 1500);
  }

  // src/core/ui/controls.js
  var sw2 = (checked, onChange) => {
    const i = h("input", { type: "checkbox", checked: !!checked });
    i.addEventListener("change", () => onChange(i.checked));
    return h("label", { class: "yx-sw" }, i, h("span"));
  };
  function control(store, key, def) {
    const cur = store[key];
    if (def.type === "boolean") return sw2(cur, (v) => {
      store[key] = v;
    });
    if (def.type === "select") {
      const choices = def.choices.map((c) => typeof c === "object" ? c : { value: c, label: String(c) });
      const s = h("select", null, choices.map((c) => h("option", { value: String(c.value) }, tr(c.label))));
      s.value = String(cur);
      s.addEventListener("change", () => {
        store[key] = choices.find((c) => String(c.value) === s.value).value;
      });
      return s;
    }
    if (def.type === "number") {
      const i2 = h("input", { type: "number", min: def.min, max: def.max, value: cur, style: { width: "90px" } });
      i2.addEventListener("change", () => {
        const n = parseFloat(i2.value);
        if (!isNaN(n)) store[key] = n;
      });
      return i2;
    }
    const i = h("input", { type: "text", value: cur == null ? "" : cur });
    i.addEventListener("change", () => {
      store[key] = i.value;
    });
    return i;
  }
  var optionRows = (settings6, keys) => Object.entries(settings6.def).filter(([key]) => !keys || keys.includes(key)).map(([key, def]) => h(
    "div",
    { class: "yx-opt" },
    h("label", null, tr(def.title) || key, def.hint ? h("span", { class: "yx-hint" }, tr(def.hint)) : null),
    control(settings6.store, key, def)
  ));

  // src/core/ui/onboarding.js
  var KEY3 = "yovarix:onboarded";
  var STEPS = 3;
  function showOnboarding(openSettings2) {
    if (document.querySelector(".yx-ov")) return;
    const cs = getComputedStyle(document.body);
    const bg = cs.backgroundColor === "rgba(0, 0, 0, 0)" ? "rgb(0, 0, 0)" : cs.backgroundColor;
    const [r, g, b] = (bg.match(/\d+/g) || [0, 0, 0]).map(Number);
    const ov = h("div", { class: "yx-ov" });
    const box = h("div", { class: "yx-modal yx-onb", role: "dialog" });
    box.dataset.theme = (r * 299 + g * 587 + b * 114) / 1e3 > 128 ? "light" : "dark";
    box.style.background = bg;
    box.style.color = cs.color;
    box.style.fontFamily = xFont();
    box.style.setProperty("--yx-bg", bg);
    box.style.setProperty("--yx-fg", cs.color);
    const title = h("h2", null, "YovariX");
    const counter = h("span", { class: "yx-ver" });
    const closeBtn = iconBtn(t("close"), I.close, true, () => finish());
    const body = h("div", { class: "yx-body" });
    const foot = h("div", { class: "yx-foot" });
    box.append(h("div", { class: "yx-head" }, title, counter, closeBtn), body, foot);
    ov.appendChild(box);
    document.body.appendChild(ov);
    let step = 0;
    let done = false;
    const renderLang = () => [
      h("h3", { class: "yx-onb-h" }, t("onbWelcome")),
      h("p", { class: "yx-onb-p" }, t("onbWelcomeText")),
      h("div", { class: "yx-opts" }, optionRows(settings3, ["lang", "autoUpdate"]))
    ];
    const renderPlugins2 = () => [
      h("h3", { class: "yx-onb-h" }, t("onbPluginsTitle")),
      h("p", { class: "yx-onb-p" }, t("onbPluginsText")),
      h("div", null, [...plugins].sort((a, c) => a.name.localeCompare(c.name)).map((p) => h(
        "div",
        { class: "yx-plugin" },
        h(
          "div",
          { class: "yx-prow" },
          h(
            "div",
            { class: "yx-pinfo" },
            h("div", { class: "yx-pname" }, tr(p.title) || p.name),
            h("div", { class: "yx-pdesc" }, tr(p.description))
          ),
          sw2(isEnabled(p), (v) => setEnabled(p, v))
        )
      ))),
      h("div", { class: "yx-hint", style: { paddingTop: "8px" } }, t("onbThemesHint"))
    ];
    const renderOpen = () => [
      h("h3", { class: "yx-onb-h" }, t("onbOpenTitle")),
      h("p", { class: "yx-onb-p" }, t("onbOpenText")),
      h(
        "div",
        { class: "yx-how" },
        h("span", { class: "yx-how-n" }, "1"),
        h(
          "div",
          null,
          t("onbHowMenu"),
          h("div", { class: "yx-mock" }, ico(I.star, true), h("span", null, "YovariX"))
        )
      ),
      h(
        "div",
        { class: "yx-how" },
        h("span", { class: "yx-how-n" }, "2"),
        h("div", null, t("onbHowManager"))
      ),
      h("div", { class: "yx-opts" }, optionRows(settings3, ["menuItem"]))
    ];
    const pages = [renderLang, renderPlugins2, renderOpen];
    function draw() {
      const last = step === STEPS - 1;
      counter.textContent = step + 1 + "/" + STEPS;
      closeBtn.title = t("close");
      body.textContent = "";
      body.append(...pages[step]());
      body.scrollTop = 0;
      foot.textContent = "";
      foot.append(...[
        last ? null : h("button", { type: "button", onclick: () => finish() }, t("onbSkip")),
        h("span", { class: "yx-spacer" }),
        step > 0 ? h("button", { type: "button", onclick: () => {
          step--;
          draw();
        } }, t("back")) : null,
        last ? h("button", { type: "button", onclick: () => finish(true) }, t("onbOpen")) : null,
        last ? h("button", { type: "button", class: "yx-primary", onclick: () => finish() }, t("onbDone")) : h("button", { type: "button", class: "yx-primary", onclick: () => {
          step++;
          draw();
        } }, t("onbNext"))
      ].filter(Boolean));
    }
    const offLang = onLangChange(draw);
    const onKey = (e) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        finish();
      }
    };
    document.addEventListener("keydown", onKey, true);
    function finish(thenOpen) {
      if (done) return;
      done = true;
      write(KEY3, true);
      offLang();
      document.removeEventListener("keydown", onKey, true);
      ov.remove();
      if (thenOpen) openSettings2();
    }
    draw();
  }
  function initOnboarding(openSettings2) {
    if (read(KEY3, false)) return;
    setTimeout(() => showOnboarding(openSettings2), 1500);
  }

  // src/core/ui/settings.js
  function renderPlugins(box) {
    const search = h("input", { class: "yx-search", type: "text", placeholder: t("search") });
    const list = h("div");
    box.append(search, list);
    const draw = () => {
      const q = search.value.trim().toLowerCase();
      list.textContent = "";
      const shown = [...plugins].sort((a, b) => a.name.localeCompare(b.name)).filter((p) => !q || (p.name + " " + tr(p.title) + " " + tr(p.description)).toLowerCase().includes(q));
      if (!shown.length) list.append(h("div", { class: "yx-empty" }, t("nothing")));
      shown.forEach((p) => {
        const opts = h("div", { class: "yx-opts", hidden: true }, p.settings ? optionRows(p.settings) : null);
        const gear = p.settings ? iconBtn(t("pluginSettings"), I.tune, false, () => {
          opts.hidden = !opts.hidden;
        }) : null;
        list.append(h(
          "div",
          { class: "yx-plugin" },
          h(
            "div",
            { class: "yx-prow" },
            h(
              "div",
              { class: "yx-pinfo" },
              h("div", { class: "yx-pname" }, tr(p.title) || p.name),
              h("div", { class: "yx-pdesc" }, tr(p.description))
            ),
            gear,
            sw2(isEnabled(p), (v) => setEnabled(p, v))
          ),
          opts
        ));
      });
    };
    search.addEventListener("input", draw);
    draw();
  }
  function renderChangelog(box) {
    const list = releases();
    box.append(list.length ? renderEntries(list) : h("div", { class: "yx-empty" }, t("nothing")));
  }
  function downloadText(name, text) {
    const url = URL.createObjectURL(new Blob([text], { type: "application/json" }));
    const a = h("a", { href: url, download: name });
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2e3);
  }
  function pickJson(cb) {
    const inp = h("input", { type: "file", accept: "application/json,.json" });
    inp.onchange = () => {
      const f = inp.files && inp.files[0];
      if (!f) return;
      const r = new FileReader();
      r.onload = () => {
        try {
          cb(JSON.parse(r.result));
        } catch (e) {
          toast(t("readErr") + e.message);
        }
      };
      r.readAsText(f);
    };
    inp.click();
  }
  function renderBackup(box) {
    box.append(h(
      "div",
      { class: "yx-btns", style: { paddingTop: 0 } },
      h("button", {
        type: "button",
        onclick: () => downloadText("yovarix-settings-" + (/* @__PURE__ */ new Date()).toISOString().slice(0, 10) + ".json", JSON.stringify(exportConfig(), null, 2))
      }, t("export")),
      h("button", {
        type: "button",
        onclick: () => pickJson((o) => {
          importConfig(o);
          toast(t("imported"));
        })
      }, t("import")),
      h("button", {
        type: "button",
        class: "yx-danger",
        onclick: () => {
          if (confirm(t("confirmReset"))) {
            resetConfig();
            toast(t("resetDone"));
          }
        }
      }, t("reset"))
    ));
  }
  var openUrl = (url) => typeof GM_openInTab === "function" ? GM_openInTab(url, { active: true }) : window.open(url, "_blank");
  function checkUpdate() {
    fetchLatest().then((v) => {
      if (isNewer(v, "1.1.2")) {
        openInstaller();
        showReloadPrompt(v, "pending");
      } else toast(t("upToDate", { v: "1.1.2" }));
    }).catch(() => toast(t("updateErr")));
  }
  function renderGeneral(box) {
    box.append(
      h("div", { class: "yx-opts" }, optionRows(settings3)),
      h(
        "div",
        { class: "yx-btns" },
        h("button", { type: "button", onclick: () => openUrl("https://github.com/SevaGetz/YovariX") }, t("repo")),
        h("button", { type: "button", onclick: checkUpdate }, t("update")),
        h("button", { type: "button", onclick: () => {
          closeSettings();
          showOnboarding(openSettings);
        } }, t("onbAgain"))
      ),
      h("div", { class: "yx-hint", style: { paddingTop: "12px" } }, t("version") + ": v1.1.2")
    );
  }
  function getPages() {
    const on = plugins.filter(isEnabled).length;
    const pages = [
      { id: "general", icon: I.tune, title: t("general"), desc: t("generalDesc"), render: renderGeneral },
      { id: "plugins", icon: I.plugins, title: t("plugins"), desc: t("pluginsDesc", { n: on, m: plugins.length }), render: renderPlugins },
      { id: "themes", icon: I.themes, title: t("themes"), desc: t("themesDesc", { n: getThemes().links.filter((l) => l.enabled).length }), render: renderThemes },
      { id: "themes-official", parent: "themes", hidden: true, icon: I.themes, title: t("officialThemes"), render: renderOfficialThemes }
    ];
    plugins.filter((p) => p.started && p.tile).forEach((p) => pages.push({
      id: "plugin:" + p.name,
      icon: p.tile.icon || I.star,
      title: tr(p.tile.title),
      desc: tr(p.tile.desc),
      render: p.tile.render
    }));
    pages.push({ id: "backup", icon: I.backup, title: t("backup"), desc: t("backupDesc"), render: renderBackup });
    pages.push({ id: "changelog", icon: I.news, title: t("changelog"), desc: t("changelogDesc"), render: renderChangelog });
    return pages;
  }
  var closeActive = null;
  var closeSettings = () => {
    if (closeActive) closeActive();
  };
  function openSettings(pageId) {
    if (document.querySelector(".yx-ov")) return;
    const cs = getComputedStyle(document.body);
    const ov = h("div", { class: "yx-ov" });
    const box = h("div", { class: "yx-modal" });
    const bg = cs.backgroundColor === "rgba(0, 0, 0, 0)" ? "rgb(0, 0, 0)" : cs.backgroundColor;
    const [r, g, b] = (bg.match(/\d+/g) || [0, 0, 0]).map(Number);
    box.dataset.theme = (r * 299 + g * 587 + b * 114) / 1e3 > 128 ? "light" : "dark";
    box.style.background = bg;
    box.style.color = cs.color;
    box.style.fontFamily = xFont();
    box.style.setProperty("--yx-bg", bg);
    box.style.setProperty("--yx-fg", cs.color);
    const back = iconBtn(t("back"), I.back, true, () => show((getPages().find((p) => p.id === current2) || {}).parent || null));
    back.hidden = true;
    const title = h("h2", null, "YovariX");
    const body = h("div", { class: "yx-body" });
    box.append(
      h(
        "div",
        { class: "yx-head" },
        back,
        title,
        h("span", { class: "yx-ver" }, "v1.1.2"),
        iconBtn(t("close"), I.close, true, () => close())
      ),
      body
    );
    ov.appendChild(box);
    document.body.appendChild(ov);
    let cleanup = null;
    let current2 = null;
    function show(id) {
      current2 = id;
      back.title = t("back");
      const xb = box.querySelector(".yx-head .yx-icon:last-child");
      if (xb) xb.title = t("close");
      if (cleanup) {
        try {
          cleanup();
        } catch (e) {
        }
        cleanup = null;
      }
      body.textContent = "";
      const page = getPages().find((p) => p.id === id);
      if (!page) {
        title.textContent = "YovariX";
        back.hidden = true;
        body.append(h("div", { class: "yx-tiles" }, getPages().filter((p) => !p.hidden).map((p) => tile(p.icon, p.title, p.desc, () => show(p.id)))));
        return;
      }
      title.textContent = page.title;
      back.hidden = false;
      cleanup = page.render(body, show) || null;
    }
    const offLang = onLangChange(() => show(current2));
    const onKey = (e) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        close();
      }
    };
    function close() {
      if (closeActive === close) closeActive = null;
      if (cleanup) {
        try {
          cleanup();
        } catch (e) {
        }
      }
      ov.remove();
      offLang();
      document.removeEventListener("keydown", onKey, true);
    }
    document.addEventListener("keydown", onKey, true);
    closeActive = close;
    ov.addEventListener("mousedown", (e) => {
      if (e.target === ov) close();
    });
    show(pageId || null);
  }

  // src/plugins/gifFav/i18n.js
  var t4 = createT({
    ru: {
      title: "Избранные GIF",
      desc: "Вкладка «Избранное» в пикере GIF, звёздочки на GIF в пикере и в твитах, конвертация mp4 → GIF при отправке",
      optConvert: "Конвертировать GIF из твитов (mp4) в настоящий .gif при отправке",
      optMaxW: "Макс. ширина GIF при конвертации",
      optClose: "Закрывать окно выбора GIF после выбора",
      count: "{n} шт.",
      total: "Всего: {n}",
      all: "Все",
      favTab: "★ Избранное",
      addFav: "В избранное",
      delFav: "Убрать из избранного",
      empty: "Пока пусто. Наведи на GIF (в пикере или в твите) и нажми ★",
      export: "Экспорт",
      import: "Импорт",
      clear: "Очистить всё",
      confirmClear: "Удалить все GIF из избранного? Это нельзя отменить.",
      imported: "Импортировано: {n}",
      notArray: "не массив",
      loading: "Загружаю GIF…",
      dlFail: "Не удалось скачать GIF",
      noTarget: "Не нашёл ни поле загрузки, ни поле ввода. Подробности в консоли (F12).",
      converting: "Конвертирую в GIF…",
      convFail: "Не получилось конвертировать, отправляю как видео",
      netErr: "Ошибка сети при скачивании GIF"
    },
    en: {
      title: "Favorite GIFs",
      desc: 'A "Favorites" tab in the GIF picker, stars on GIFs in the picker and in tweets, mp4 → GIF conversion on send',
      optConvert: "Convert GIFs from tweets (mp4) to a real .gif when sending",
      optMaxW: "Max GIF width when converting",
      optClose: "Close the GIF picker after choosing",
      count: "{n} items",
      total: "Total: {n}",
      all: "All",
      favTab: "★ Favorites",
      addFav: "Add to favorites",
      delFav: "Remove from favorites",
      empty: "Nothing here yet. Hover a GIF (in the picker or in a tweet) and click ★",
      export: "Export",
      import: "Import",
      clear: "Clear all",
      confirmClear: "Delete all favorite GIFs? This cannot be undone.",
      imported: "Imported: {n}",
      notArray: "not an array",
      loading: "Downloading GIF…",
      dlFail: "Could not download the GIF",
      noTarget: "Could not find an upload field or composer. See the console (F12) for details.",
      converting: "Converting to GIF…",
      convFail: "Conversion failed, sending as video",
      netErr: "Network error while downloading the GIF"
    }
  });

  // src/plugins/gifFav/settings.js
  var settings4 = definePluginSettings({
    convert: { type: "boolean", title: () => t4("optConvert"), default: true },
    maxW: { type: "select", title: () => t4("optMaxW"), default: 400, choices: [
      { value: 220, label: "220 px" },
      { value: 300, label: "300 px" },
      { value: 400, label: "400 px" },
      { value: 480, label: "480 px" }
    ] },
    closeAfter: { type: "boolean", title: () => t4("optClose"), default: true }
  });

  // src/plugins/gifFav/styles.js
  var CSS2 = `
  .fav-star{position:absolute;top:6px;right:6px;z-index:50;width:30px;height:30px;border-radius:50%;
    background:rgba(0,0,0,.65);color:#fff;font-size:18px;line-height:1;display:flex;align-items:center;
    justify-content:center;text-align:center;padding:0;box-sizing:border-box;font-family:Arial,sans-serif;cursor:pointer;opacity:0;pointer-events:none;transition:opacity .15s;user-select:none}
  .fav-host:hover > .fav-star,.fav-star.active{opacity:1;pointer-events:auto}
  .fav-star.active{color:#ffd400}
  .fav-bar{display:flex;gap:8px;box-sizing:border-box}
  .fav-bar.fav-pad{padding:8px 12px 12px}
  .fav-bar button{border:1px solid rgba(128,128,128,.5);background:transparent;color:inherit;border-radius:999px;
    padding:6px 14px;cursor:pointer;font:inherit;font-size:14px}
  .fav-bar button.on{background:#1d9bf0;border-color:#1d9bf0;color:#fff}
  .fav-panel{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;overflow-y:auto;
    max-height:min(60svh,468px);align-content:start;box-sizing:border-box}
  .fav-panel.fav-pad{padding:0 12px 12px}
  .fav-panel[hidden]{display:none}
  .fav-tile{position:relative;height:0;padding-bottom:100%;overflow:hidden;border-radius:6px;cursor:pointer;background:rgba(128,128,128,.2)}
  .fav-tile img,.fav-tile video{position:absolute;top:0;left:0;width:100%;height:100%;object-fit:cover;display:block}
  .fav-tile .fav-del{position:absolute;top:6px;right:6px;width:28px;height:28px;border:0;border-radius:50%;
    background:rgba(0,0,0,.65);color:#ffd400;font-size:16px;line-height:1;cursor:pointer;padding:0;margin:0;
    box-sizing:border-box;display:flex;align-items:center;justify-content:center;text-align:center;font-family:Arial,sans-serif}
  .fav-empty{grid-column:1/-1;padding:24px 8px;text-align:center;opacity:.7;font-size:14px}
  .fav-hidden{display:none !important}
  .yx-modal .fav-panel{max-height:min(46vh,380px);padding:0 0 8px}
`;

  // src/plugins/gifFav/store.js
  var KEY4 = "gifFavs";
  var subs3 = /* @__PURE__ */ new Set();
  var isHttp = (u) => typeof u === "string" && /^https?:/.test(u);
  var load2 = () => {
    const a = read(KEY4, []);
    return Array.isArray(a) ? a : [];
  };
  var has = (u) => load2().some((f) => f.url === u);
  var subscribe = (cb) => {
    subs3.add(cb);
    return () => subs3.delete(cb);
  };
  function save2(a) {
    write(KEY4, a);
    subs3.forEach((f) => f());
  }
  function toggle(item) {
    if (!item || !item.url) return;
    const a = load2();
    const i = a.findIndex((f) => f.url === item.url);
    if (i >= 0) a.splice(i, 1);
    else a.unshift({ url: item.url, type: item.type, preview: item.preview || "", t: Date.now() });
    save2(a);
  }
  function importItems(arr) {
    if (!Array.isArray(arr)) throw new Error(t4("notArray"));
    const cur = load2();
    let added = 0;
    arr.forEach((it) => {
      if (it && isHttp(it.url) && !cur.some((c) => c.url === it.url)) {
        cur.push({ url: it.url, type: it.type === "video" ? "video" : "img", preview: it.preview || "", t: it.t || Date.now() });
        added++;
      }
    });
    save2(cur);
    return added;
  }

  // src/plugins/gifFav/panel.js
  function fillPanel(panel, onPick) {
    panel.textContent = "";
    const favs = load2();
    if (!favs.length) {
      const e = el("div", "fav-empty");
      e.textContent = t4("empty");
      panel.appendChild(e);
      return;
    }
    favs.forEach((item) => {
      const tile2 = el("div", "fav-tile");
      let m;
      if (item.type === "video") {
        m = el("video");
        m.muted = true;
        m.loop = true;
        m.playsInline = true;
        m.preload = "none";
        const loadVideo = () => {
          if (!m.getAttribute("src")) {
            m.preload = "metadata";
            m.src = item.url;
          }
        };
        if (item.preview) m.poster = item.preview;
        else {
          const io = new IntersectionObserver((es) => {
            if (es.some((e) => e.isIntersecting)) {
              loadVideo();
              io.disconnect();
            }
          }, { root: panel });
          io.observe(tile2);
        }
        tile2.addEventListener("mouseenter", () => {
          loadVideo();
          m.play().catch(() => {
          });
        });
        tile2.addEventListener("mouseleave", () => m.pause());
      } else {
        m = el("img");
        m.loading = "lazy";
        m.src = item.preview || item.url;
      }
      const del = el("button", "fav-del");
      del.type = "button";
      del.textContent = "★";
      del.title = t4("delFav");
      del.onclick = (e) => {
        e.stopPropagation();
        toggle(item);
      };
      tile2.append(m, del);
      if (onPick) tile2.onclick = () => onPick(item);
      else tile2.style.cursor = "default";
      panel.appendChild(tile2);
    });
  }

  // src/plugins/gifFav/encoder.js
  function gifQuantize(frames) {
    const hist = new Uint32Array(32768);
    for (const d of frames) {
      for (let p = 0; p < d.length; p += 16) hist[d[p] >> 3 << 10 | d[p + 1] >> 3 << 5 | d[p + 2] >> 3]++;
    }
    const list = [];
    for (let i = 0; i < 32768; i++) if (hist[i]) list.push(i);
    let boxes = [list];
    while (boxes.length < 256) {
      let bi = -1, bl = 1;
      for (let i = 0; i < boxes.length; i++) if (boxes[i].length > bl) {
        bl = boxes[i].length;
        bi = i;
      }
      if (bi < 0) break;
      const box = boxes[bi];
      let rmin = 31, rmax = 0, gmin = 31, gmax = 0, bmin = 31, bmax = 0;
      for (const c of box) {
        const r = c >> 10, g = c >> 5 & 31, b = c & 31;
        if (r < rmin) rmin = r;
        if (r > rmax) rmax = r;
        if (g < gmin) gmin = g;
        if (g > gmax) gmax = g;
        if (b < bmin) bmin = b;
        if (b > bmax) bmax = b;
      }
      const dr = rmax - rmin, dg = gmax - gmin, db = bmax - bmin;
      const ch = dr >= dg && dr >= db ? 10 : dg >= db ? 5 : 0;
      box.sort((a, b) => (a >> ch & 31) - (b >> ch & 31));
      let total = 0;
      for (const c of box) total += hist[c];
      let acc = 0, cut = 0;
      for (let i = 0; i < box.length; i++) {
        acc += hist[box[i]];
        if (acc >= total / 2) {
          cut = i;
          break;
        }
      }
      if (cut > box.length - 2) cut = box.length - 2;
      boxes.splice(bi, 1, box.slice(0, cut + 1), box.slice(cut + 1));
    }
    const pal = new Uint8Array(768);
    boxes.forEach((box, bi) => {
      let n = 0, r = 0, g = 0, b = 0;
      for (const c of box) {
        const w = hist[c];
        n += w;
        r += (c >> 10) * w;
        g += (c >> 5 & 31) * w;
        b += (c & 31) * w;
      }
      if (!n) n = 1;
      pal[bi * 3] = Math.round(r / n * 255 / 31);
      pal[bi * 3 + 1] = Math.round(g / n * 255 / 31);
      pal[bi * 3 + 2] = Math.round(b / n * 255 / 31);
    });
    const cnt = boxes.length;
    const cache = new Int16Array(32768).fill(-1);
    const nearest = (key) => {
      const r = (key >> 10 & 31) * 255 / 31, g = (key >> 5 & 31) * 255 / 31, b = (key & 31) * 255 / 31;
      let best = 0, bd = 1e9;
      for (let i = 0; i < cnt; i++) {
        const dr = pal[i * 3] - r, dg = pal[i * 3 + 1] - g, db = pal[i * 3 + 2] - b;
        const dd = dr * dr + dg * dg + db * db;
        if (dd < bd) {
          bd = dd;
          best = i;
        }
      }
      return best;
    };
    const idx = frames.map((d) => {
      const out = new Uint8Array(d.length >> 2);
      for (let p = 0, q = 0; p < d.length; p += 4, q++) {
        const key = d[p] >> 3 << 10 | d[p + 1] >> 3 << 5 | d[p + 2] >> 3;
        let v = cache[key];
        if (v < 0) {
          v = nearest(key);
          cache[key] = v;
        }
        out[q] = v;
      }
      return out;
    });
    return { pal, idx };
  }
  function gifLzw(indices, minCode) {
    const clear = 1 << minCode, eoi = clear + 1;
    let codeSize = minCode + 1, next = eoi + 1;
    const out = [];
    let cur = 0, bits = 0;
    const emit3 = (c) => {
      cur |= c << bits;
      bits += codeSize;
      while (bits >= 8) {
        out.push(cur & 255);
        cur >>>= 8;
        bits -= 8;
      }
    };
    let dict = /* @__PURE__ */ new Map();
    emit3(clear);
    let prefix = indices[0];
    for (let i = 1; i < indices.length; i++) {
      const k = indices[i], key = prefix << 8 | k;
      const v = dict.get(key);
      if (v !== void 0) {
        prefix = v;
        continue;
      }
      emit3(prefix);
      if (next > (1 << codeSize) - 1 && codeSize < 12) codeSize++;
      if (next < 4096) dict.set(key, next++);
      else {
        emit3(clear);
        dict = /* @__PURE__ */ new Map();
        next = eoi + 1;
        codeSize = minCode + 1;
      }
      prefix = k;
    }
    emit3(prefix);
    if (next > (1 << codeSize) - 1 && codeSize < 12) codeSize++;
    emit3(eoi);
    if (bits > 0) out.push(cur & 255);
    return out;
  }
  function gifWrite(w, h2, pal, idxFrames, delayCs) {
    const parts = [];
    const u16 = (n) => [n & 255, n >> 8 & 255];
    parts.push(Uint8Array.from([71, 73, 70, 56, 57, 97, ...u16(w), ...u16(h2), 247, 0, 0]));
    parts.push(pal);
    parts.push(Uint8Array.from([33, 255, 11, ..."NETSCAPE2.0".split("").map((c) => c.charCodeAt(0)), 3, 1, 0, 0, 0]));
    for (const idx of idxFrames) {
      parts.push(Uint8Array.from([33, 249, 4, 0, ...u16(delayCs), 0, 0]));
      parts.push(Uint8Array.from([44, 0, 0, 0, 0, ...u16(w), ...u16(h2), 0, 8]));
      const data = gifLzw(idx, 8);
      const blocks = [];
      for (let i = 0; i < data.length; i += 255) {
        const chunk = data.slice(i, i + 255);
        blocks.push(chunk.length, ...chunk);
      }
      blocks.push(0);
      parts.push(Uint8Array.from(blocks));
    }
    parts.push(Uint8Array.from([59]));
    let total = 0;
    for (const p of parts) total += p.length;
    const res = new Uint8Array(total);
    let o = 0;
    for (const p of parts) {
      res.set(p, o);
      o += p.length;
    }
    return res;
  }
  var GIF_MAX_BYTES = 14 * 1024 * 1024;
  function videoBlobToGif(blob, maxW) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(blob);
      const v = document.createElement("video");
      v.muted = true;
      v.playsInline = true;
      v.preload = "auto";
      let finished = false;
      const done = (fn, arg) => {
        if (finished) return;
        finished = true;
        clearTimeout(loadTimer);
        v.onerror = null;
        v.onloadeddata = null;
        URL.revokeObjectURL(url);
        v.removeAttribute("src");
        fn(arg);
      };
      const loadTimer = setTimeout(() => done(reject, new Error("таймаут загрузки видео")), 15e3);
      v.onerror = () => done(reject, new Error("не удалось декодировать видео"));
      v.onloadeddata = async () => {
        try {
          const dur = Math.min(v.duration || 0, 10);
          if (!dur || !v.videoWidth) throw new Error("пустое видео");
          const scale = Math.min(1, maxW / v.videoWidth);
          const w = Math.max(2, Math.round(v.videoWidth * scale));
          const h2 = Math.max(2, Math.round(v.videoHeight * scale));
          const canvas = document.createElement("canvas");
          canvas.width = w;
          canvas.height = h2;
          const ctx = canvas.getContext("2d", { willReadFrequently: true });
          const delayCs = 8, step = delayCs / 100;
          const n = Math.max(1, Math.min(120, Math.floor(dur / step)));
          const frames = [];
          for (let i = 0; i < n; i++) {
            const t6 = Math.min(i * step, Math.max(0, dur - 0.05));
            if (Math.abs(v.currentTime - t6) > 1e-3) {
              await new Promise((res) => {
                v.onseeked = res;
                setTimeout(res, 3e3);
                v.currentTime = t6;
              });
            }
            ctx.drawImage(v, 0, 0, w, h2);
            frames.push(ctx.getImageData(0, 0, w, h2).data);
          }
          const { pal, idx } = gifQuantize(frames);
          done(resolve, gifWrite(w, h2, pal, idx, delayCs));
        } catch (e) {
          done(reject, e);
        }
      };
      v.src = url;
    });
  }
  async function mp4ToGif(blob, cfgW) {
    let out = null;
    for (const w of [cfgW, 300, 220, 160].filter((x, i, arr) => x <= cfgW && arr.indexOf(x) === i)) {
      out = await videoBlobToGif(blob, w);
      LOG("gif " + w + "px, " + Math.round(out.length / 1024) + " KB");
      if (out.length <= GIF_MAX_BYTES) break;
    }
    return out;
  }

  // src/plugins/gifFav/send.js
  function findFileInput(d) {
    const all = qAll(getRoots(), 'input[type="file"]');
    LOG("file inputs found:", all.map((i) => (i.accept || "?") + " @" + (i.getRootNode() === document ? "document" : "shadow")));
    if (!all.length) return null;
    const media = all.filter((i) => !i.accept || /image|video|gif/i.test(i.accept));
    const pool = media.length ? media : all;
    const sameRoot = pool.filter((i) => i.getRootNode() === d.getRootNode());
    const list = sameRoot.length ? sameRoot : pool;
    return list[list.length - 1];
  }
  function findComposer(d) {
    const roots = getRoots();
    const dm = qAll(roots, '[data-testid="dm-composer-textarea"]').filter((n) => n.getClientRects().length);
    if (dm.length) {
      LOG("composer: dm-composer-textarea");
      return dm[dm.length - 1];
    }
    const cands = qAll(roots, 'textarea, [contenteditable="true"], [role="textbox"]').filter((n) => !d.contains(n) && n.id !== "gif-search" && n.getClientRects().length);
    LOG("composer candidates:", cands.length);
    if (!cands.length) return null;
    const same = cands.filter((n) => n.getRootNode() === d.getRootNode());
    const list = same.length ? same : cands;
    return list[list.length - 1];
  }
  function attachFile(file, d) {
    const input = findFileInput(d);
    if (input) {
      const dt = new DataTransfer();
      dt.items.add(file);
      input.files = dt.files;
      input.dispatchEvent(new Event("input", { bubbles: true, composed: true }));
      input.dispatchEvent(new Event("change", { bubbles: true, composed: true }));
      LOG("attached via file input");
      return true;
    }
    const composer = findComposer(d);
    if (composer) {
      const dt = new DataTransfer();
      dt.items.add(file);
      composer.focus();
      composer.dispatchEvent(new ClipboardEvent("paste", { clipboardData: dt, bubbles: true, cancelable: true, composed: true }));
      LOG("attached via paste");
      return true;
    }
    return false;
  }
  function closeDialog(d) {
    const c = d.querySelector('button[aria-label="Закрыть"], button[aria-label="Close"]');
    if (c) c.click();
    else document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", keyCode: 27, bubbles: true }));
  }
  function pick(item, d) {
    toast(t4("loading"));
    GM_xmlhttpRequest({
      method: "GET",
      url: item.url,
      responseType: "blob",
      onload: (r) => {
        const blob = r.response;
        if (!blob || !blob.size) {
          toast(t4("dlFail"));
          return;
        }
        const finish = (file) => {
          if (!attachFile(file, d)) {
            toast(t4("noTarget"));
            return;
          }
          if (settings4.store.closeAfter) setTimeout(() => closeDialog(d), 300);
        };
        const type = blob.type || (item.type === "video" ? "video/mp4" : "image/gif");
        if (/^video\//.test(type) && settings4.store.convert) {
          toast(t4("converting"));
          mp4ToGif(blob, settings4.store.maxW).then((bytes) => finish(new File([bytes], "favorite.gif", { type: "image/gif" }))).catch((e) => {
            LOG("конвертация в GIF не удалась, отправляю как видео:", e);
            toast(t4("convFail"));
            finish(new File([blob], "favorite.mp4", { type }));
          });
          return;
        }
        const ext = { "video/mp4": "mp4", "image/gif": "gif", "image/webp": "webp", "image/png": "png", "image/jpeg": "jpg" }[type] || "gif";
        finish(new File([blob], "favorite." + ext, { type }));
      },
      onerror: () => toast(t4("netErr"))
    });
  }

  // src/plugins/gifFav/picker.js
  var nodeOf = /* @__PURE__ */ new WeakMap();
  var stateOf = /* @__PURE__ */ new WeakMap();
  var states = /* @__PURE__ */ new Set();
  var EVENTS = ["pointerdown", "mousedown", "mouseup", "click"];
  var unsub = null;
  function giphyFull(src) {
    if (!/giphy\.com\/media\//.test(src)) return src;
    return src.replace(/\/[^\/?]+\.(gif|webp|mp4)(\?.*)?$/i, "/giphy.gif");
  }
  function getItem(n) {
    if (n.tagName === "VIDEO") {
      const s = n.querySelector("source");
      return { url: n.currentSrc || n.src || s && s.src, type: "video", preview: n.poster || "" };
    }
    const src = n.currentSrc || n.src;
    return { url: giphyFull(src), type: "img", preview: src };
  }
  function addStar(host, node) {
    const item = getItem(node);
    if (!isHttp(item.url)) return;
    let b = host.querySelector(":scope > .fav-star");
    if (!b) {
      if (getComputedStyle(host).position === "static") host.style.position = "relative";
      host.classList.add("fav-host");
      b = el("span", "fav-star");
      b.textContent = "★";
      b.title = t4("addFav");
      host.appendChild(b);
    }
    nodeOf.set(b, node);
    b.dataset.url = item.url;
    b.classList.toggle("active", has(item.url));
  }
  function refreshStars() {
    qAll(getRoots(), ".fav-star").forEach((b) => b.classList.toggle("active", has(b.dataset.url)));
  }
  function starAt(e) {
    const path = e.composedPath ? e.composedPath() : [e.target];
    for (const n of path) {
      if (n && n.classList && n.classList.contains("fav-star")) return n;
    }
    if (!e.clientX && !e.clientY) return null;
    const roots = [document, ...getSeenRoots().filter((r) => r.host && r.host.isConnected)];
    for (const r of roots) {
      const hit = (r.elementsFromPoint ? r.elementsFromPoint(e.clientX, e.clientY) : []).find((n) => n.classList && n.classList.contains("fav-star"));
      if (hit) return hit;
    }
    return null;
  }
  var handlers = EVENTS.map((ev) => (e) => {
    const b = starAt(e);
    if (!b) return;
    e.stopImmediatePropagation();
    e.preventDefault();
    if (ev === "click") {
      const n = nodeOf.get(b);
      if (n) toggle(getItem(n));
    }
  });
  function findPickers(roots) {
    const out = /* @__PURE__ */ new Set();
    qAll(roots, '#gif-search, input[placeholder*="GIF" i]').forEach((i) => {
      const d = i.closest('[role="dialog"]') || i.closest('[data-slot="xds-modal-surface"]') || i.parentElement && i.parentElement.parentElement && i.parentElement.parentElement.parentElement;
      if (d) out.add(d);
    });
    return out;
  }
  function findScroller(d) {
    let best = null, bestH = 0;
    d.querySelectorAll("*").forEach((n) => {
      if (n.closest(".fav-panel, .fav-bar")) return;
      const oy = getComputedStyle(n).overflowY;
      if ((oy === "auto" || oy === "scroll") && n.clientHeight > bestH) {
        best = n;
        bestH = n.clientHeight;
      }
    });
    return best;
  }
  function syncHidden(st) {
    const fav = st.mode === "fav";
    st.bar.querySelectorAll("button").forEach((b, i) => b.classList.toggle("on", i === 1 === fav));
    st.panel.hidden = !fav;
    let n = st.panel.nextElementSibling;
    while (n) {
      n.classList.toggle("fav-hidden", fav);
      n = n.nextElementSibling;
    }
  }
  var renderPanel = (st) => fillPanel(st.panel, (item) => pick(item, st.d));
  function setupPicker(d) {
    let st = stateOf.get(d);
    if (st && d.contains(st.bar)) return st;
    const root = d.getRootNode();
    const input = d.querySelector('#gif-search, input[placeholder*="GIF" i]');
    let sc = d.querySelector('[data-testid="gifSearchTrendingRoot"]') || d.querySelector('[data-testid="gifSearchTimelineRoot"]');
    if (!sc && input && input.parentElement && input.parentElement.parentElement) {
      sc = input.parentElement.parentElement.nextElementSibling;
    }
    if (!sc || sc.contains(input) || sc.classList.contains("fav-bar") || sc.classList.contains("fav-panel")) sc = findScroller(d);
    if (!sc || !sc.parentElement) return null;
    const bar = el("div", "fav-bar");
    const bAll = el("button");
    bAll.type = "button";
    bAll.textContent = t4("all");
    const bFav = el("button");
    bFav.type = "button";
    bFav.textContent = t4("favTab");
    bar.append(bAll, bFav);
    const panel = el("div", "fav-panel");
    panel.hidden = true;
    sc.before(bar, panel);
    const dr = d.getBoundingClientRect(), br = bar.getBoundingClientRect();
    if (br.width && br.left - dr.left < 10) {
      bar.classList.add("fav-pad");
      panel.classList.add("fav-pad");
    }
    st = { bar, panel, d, mode: "all" };
    bAll.onclick = () => {
      st.mode = "all";
      syncHidden(st);
    };
    bFav.onclick = () => {
      st.mode = "fav";
      renderPanel(st);
      syncHidden(st);
    };
    if (input) input.addEventListener("input", () => {
      if (states.has(st)) {
        st.mode = "all";
        syncHidden(st);
      }
    });
    stateOf.set(d, st);
    states.add(st);
    syncHidden(st);
    LOG("picker ready (shadow: " + (root !== document) + ")");
    return st;
  }
  function startPicker() {
    EVENTS.forEach((ev, i) => document.addEventListener(ev, handlers[i], true));
    unsub = subscribe(() => {
      refreshStars();
      states.forEach((st) => {
        if (st.mode === "fav") renderPanel(st);
      });
    });
  }
  function stopPicker() {
    EVENTS.forEach((ev, i) => document.removeEventListener(ev, handlers[i], true));
    if (unsub) {
      unsub();
      unsub = null;
    }
    states.forEach((st) => {
      st.bar.remove();
      st.panel.remove();
      let n = st.d.querySelectorAll(".fav-hidden");
      n.forEach((x) => x.classList.remove("fav-hidden"));
    });
    states.clear();
    qAll(getRoots(), ".fav-star").forEach((s) => {
      const host = s.parentElement;
      if (host) host.classList.remove("fav-host");
      s.remove();
    });
  }
  function scanPicker(roots) {
    const pickers = findPickers(roots);
    qAll(roots, "video").forEach((v) => {
      if (v.closest(".fav-panel")) return;
      const src = v.currentSrc || v.src || "";
      if (!/tweet_video/.test(src)) return;
      for (const d of pickers) if (d.contains(v)) return;
      const host = v.closest('[data-testid="videoPlayer"]') || v.parentElement;
      if (host) addStar(host, v);
    });
    pickers.forEach((d) => {
      const st = setupPicker(d);
      if (!st) return;
      if (st.mode === "fav") syncHidden(st);
      d.querySelectorAll("button > img").forEach((img) => {
        if (img.closest(".fav-panel, .fav-bar")) return;
        const u = img.currentSrc || img.src;
        if (!isHttp(u)) return;
        addStar(img.parentElement, img);
      });
    });
  }

  // src/plugins/gifFav/index.js
  function renderManager(box) {
    const grid = h("div", { class: "fav-panel" });
    const count = h("span");
    const refresh = () => {
      count.textContent = t4("total", { n: load2().length });
      fillPanel(grid, null);
    };
    refresh();
    const unsub2 = subscribe(refresh);
    box.append(
      h("div", { style: { opacity: ".65", fontSize: "13px", marginBottom: "8px" } }, count),
      grid,
      h(
        "div",
        { class: "yx-btns" },
        h("button", {
          type: "button",
          onclick: () => downloadText("yovarix-gifs-" + (/* @__PURE__ */ new Date()).toISOString().slice(0, 10) + ".json", JSON.stringify(load2(), null, 2))
        }, t4("export")),
        h("button", {
          type: "button",
          onclick: () => pickJson((arr) => {
            toast(t4("imported", { n: importItems(arr) }));
          })
        }, t4("import")),
        h("button", {
          type: "button",
          class: "yx-danger",
          onclick: () => {
            if (load2().length && confirm(t4("confirmClear"))) save2([]);
          }
        }, t4("clear"))
      )
    );
    return unsub2;
  }
  var gifFav_default = definePlugin({
    name: "gifFav",
    title: () => t4("title"),
    description: () => t4("desc"),
    enabledByDefault: false,
    settings: settings4,
    styles: CSS2,
    tile: {
      icon: '<path d="M12 3.5l2.6 5.3 5.9.85-4.25 4.15 1 5.85L12 16.9l-5.25 2.75 1-5.85L3.5 9.65l5.9-.85z"/>',
      title: () => t4("title"),
      desc: () => t4("count", { n: load2().length }),
      render: renderManager
    },
    start() {
      startPicker();
    },
    stop() {
      stopPicker();
    },
    scan: scanPicker
  });

  // src/plugins/sidebarHide/items.js
  var tid = (id) => `[data-testid="${id}"]`;
  var href = (h2) => `nav a[href="${h2}"]`;
  var ITEMS = [
    { id: "home", sel: tid("AppTabBar_Home_Link") },
    { id: "explore", sel: tid("AppTabBar_Explore_Link") },
    { id: "notifications", sel: tid("AppTabBar_Notifications_Link") },
    { id: "follow", sel: tid("AppTabBar_Follow_Link") },
    { id: "chat", sel: tid("AppTabBar_DirectMessage_Link") },
    { id: "calls", sel: tid("AppTabBar_Calls_Link") },
    { id: "grok", sel: href("/i/grok") },
    { id: "history", sel: href("/i/history") },
    { id: "studio", sel: href("/i/jf/creators/studio") },
    { id: "premium", sel: tid("premium-signup-tab") },
    { id: "profile", sel: tid("AppTabBar_Profile_Link") },
    { id: "more", sel: tid("AppTabBar_More_Menu"), hint: true },
    { id: "bookmarks", sel: href("/i/bookmarks") },
    { id: "jobs", sel: href("/jobs") },
    { id: "spaces", sel: href("/i/spaces") },
    { id: "lists", sel: 'nav a[href$="/lists"]' },
    { id: "communities", sel: 'nav a[href$="/communities"]' },
    { id: "post", sel: tid("SideNav_NewTweet_Button") },
    { id: "account", sel: tid("SideNav_AccountSwitcher_Button") }
  ];
  var keyOf2 = (id) => "hide_" + id;

  // src/plugins/sidebarHide/i18n.js
  var t5 = createT({
    ru: {
      title: "Скрыть пункты меню",
      desc: "Отключает выбранные пункты в боковом меню X (Обзор, Grok, Premium и т.д.)",
      count: "скрыто: {n}",
      hide: "Скрыть: {name}",
      moreHint: "Через «Ещё» открываются настройки и остальные разделы. Настройки также доступны по адресу /settings",
      home: "Главная",
      explore: "Обзор",
      notifications: "Уведомления",
      follow: "Читать",
      chat: "Чат",
      calls: "Звонки",
      grok: "Grok",
      history: "История",
      studio: "Творческая студия",
      premium: "Premium",
      profile: "Профиль",
      more: "Ещё",
      bookmarks: "Закладки",
      jobs: "Вакансии",
      spaces: "Spaces",
      lists: "Списки",
      communities: "Сообщества",
      post: "Кнопка «Опубликовать пост»",
      account: "Меню учётной записи"
    },
    en: {
      title: "Hide menu items",
      desc: "Turns off selected items in the X sidebar (Explore, Grok, Premium, etc.)",
      count: "hidden: {n}",
      hide: "Hide: {name}",
      moreHint: '"More" opens settings and the other sections. Settings are also reachable at /settings',
      home: "Home",
      explore: "Explore",
      notifications: "Notifications",
      follow: "Follow",
      chat: "Chat",
      calls: "Calls",
      grok: "Grok",
      history: "History",
      studio: "Creator Studio",
      premium: "Premium",
      profile: "Profile",
      more: "More",
      bookmarks: "Bookmarks",
      jobs: "Jobs",
      spaces: "Spaces",
      lists: "Lists",
      communities: "Communities",
      post: "Post button",
      account: "Account menu"
    }
  });

  // src/plugins/sidebarHide/settings.js
  var hooks = { apply: () => {
  } };
  var settings5 = definePluginSettings(Object.fromEntries(ITEMS.map((it) => [keyOf2(it.id), {
    type: "boolean",
    title: () => t5("hide", { name: t5(it.id) }),
    hint: it.hint ? () => t5("moreHint") : void 0,
    default: false,
    onChange: () => hooks.apply()
  }])));

  // src/plugins/sidebarHide/index.js
  var STYLE_ID2 = "plugin:sidebarHide:rules";
  var NAV = 'header[role="banner"]';
  var hiddenItems = () => ITEMS.filter((it) => settings5.store[keyOf2(it.id)]);
  function apply3() {
    const list = hiddenItems();
    if (!list.length) {
      removeStyle(STYLE_ID2);
      return;
    }
    addStyle(STYLE_ID2, list.map((it) => `${NAV} ${it.sel}`).join(",\n") + " { display: none !important; }");
  }
  var sidebarHide_default = definePlugin({
    name: "sidebarHide",
    title: () => t5("title"),
    description: () => t5("desc"),
    enabledByDefault: false,
    settings: settings5,
    start() {
      hooks.apply = apply3;
      apply3();
    },
    stop() {
      hooks.apply = () => {
      };
      removeStyle(STYLE_ID2);
    }
  });

  // yx-plugins:plugins
  var plugins_default = [adBlock_default, embedLink_default, gifFav_default, sidebarHide_default];

  // src/core/ui/menu.js
  var STAR_PATH = "M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z";
  function injectMenu(roots) {
    if (!settings3.store.menuItem) {
      qAll(roots, ".yx-menu-item").forEach((n) => n.remove());
      return;
    }
    qAll(roots, '[role="menu"]').forEach((menu) => {
      if (menu.querySelector(".yx-menu-item")) return;
      const link = menu.querySelector('a[data-testid="settings"], a[href="/settings"]');
      const row = link && link.parentElement;
      if (!row) return;
      const item = row.cloneNode(true);
      item.classList.add("yx-menu-item");
      const a = item.querySelector("a");
      if (a) {
        a.removeAttribute("href");
        a.removeAttribute("data-testid");
        a.setAttribute("role", "menuitem");
        a.tabIndex = 0;
      }
      const path = item.querySelector("svg path");
      if (path) path.setAttribute("d", STAR_PATH);
      const span = item.querySelector("span");
      if (span) span.textContent = "YovariX";
      item.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", keyCode: 27, bubbles: true }));
        setTimeout(() => openSettings(), 0);
      });
      row.after(item);
    });
  }
  function watchMenu() {
    new MutationObserver((muts) => {
      for (const m of muts) {
        for (const n of m.addedNodes) {
          if (n.nodeType !== 1) continue;
          if (n.matches('[role="menu"]') || n.querySelector('[role="menu"]') || n.closest('[role="menu"]')) {
            injectMenu([document]);
            return;
          }
        }
      }
    }).observe(document.documentElement, { childList: true, subtree: true });
  }

  // src/core/scanner.js
  function scan2() {
    const roots = getRoots();
    injectMenu(roots);
    plugins.forEach((p) => {
      if (!p.started || !p.scan) return;
      try {
        p.scan(roots);
      } catch (e) {
        console.error("[YovariX] scan error:", p.name, e);
      }
    });
  }
  var timer2 = 0;
  var schedule = () => {
    if (timer2) return;
    timer2 = setTimeout(() => {
      timer2 = 0;
      scan2();
    }, 150);
  };
  function initScanner() {
    initObserver(schedule);
    document.addEventListener("load", schedule, true);
    onPluginsChange(schedule);
    schedule();
  }

  // src/core/ui/styles.js
  var CORE_CSS = `
  .yx-ov{position:fixed;inset:0;z-index:2147483646;background:rgba(91,112,131,.4);display:flex;align-items:center;justify-content:center}
  .yx-modal{--yx-sub:#71767b;--yx-line:#2f3336;--yx-ctl:#536471;--yx-hover:rgba(231,233,234,.1);--yx-pbg:#eff3f4;--yx-pfg:#0f1419;
    width:min(600px,94vw);height:min(640px,90vh);display:flex;flex-direction:column;border-radius:16px;box-sizing:border-box;
    font-size:15px;-webkit-font-smoothing:antialiased;overflow:hidden;box-shadow:0 0 15px rgba(255,255,255,.2),0 0 3px rgba(255,255,255,.15),0 0 8px rgba(255,255,255,.15)}
  .yx-modal[data-theme=light]{--yx-sub:#536471;--yx-line:#eff3f4;--yx-ctl:#cfd9de;--yx-hover:rgba(15,20,25,.1);--yx-pbg:#0f1419;--yx-pfg:#fff;
    box-shadow:0 0 15px rgba(101,119,134,.2),0 0 3px rgba(101,119,134,.15),0 0 8px rgba(101,119,134,.15)}
  .yx-modal [hidden]{display:none !important}
  .yx-modal svg{display:block}
  .yx-modal button,.yx-modal input,.yx-modal select{font-family:inherit}
  .yx-head{display:flex;align-items:center;gap:20px;height:53px;padding:0 16px;flex:none}
  .yx-head h2{margin:0;font-size:20px;line-height:24px;font-weight:800;flex:1}
  .yx-ver{color:var(--yx-sub);font-size:13px}
  .yx-body{flex:1;overflow:auto;padding:4px 16px 16px}
  .yx-modal button{border:1px solid var(--yx-ctl);background:transparent;color:inherit;border-radius:999px;
    min-height:36px;padding:0 16px;cursor:pointer;font:inherit;font-size:15px;font-weight:700;transition:background .15s}
  .yx-modal button:hover{background:var(--yx-hover)}
  .yx-modal button.yx-primary{background:var(--yx-pbg);border-color:transparent;color:var(--yx-pfg)}
  .yx-modal button.yx-danger{color:#f4212e;border-color:rgba(244,33,46,.5)}
  .yx-modal button.yx-danger:hover{background:rgba(244,33,46,.1)}
  .yx-modal button.yx-icon{width:34px;height:34px;min-height:0;padding:0;border:0;display:flex;align-items:center;justify-content:center}
  .yx-btns{display:flex;flex-wrap:wrap;gap:8px;padding-top:16px}
  .yx-tiles{display:flex;flex-direction:column;padding-top:4px}
  .yx-modal button.yx-tile{display:flex;align-items:center;gap:16px;text-align:left;width:100%;border:0;border-radius:0;
    padding:14px 16px;margin:0 -16px;width:calc(100% + 32px);min-height:0;font-weight:400}
  .yx-tile-ico{flex:none;display:flex}
  .yx-tile-txt{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px}
  .yx-tile-title{font-weight:700;font-size:17px;line-height:20px}
  .yx-tile-desc{color:var(--yx-sub);font-size:13px;line-height:16px}
  .yx-tile-chev{flex:none;color:var(--yx-sub);display:flex}
  .yx-modal input[type=text].yx-search{width:100%;box-sizing:border-box;background:transparent;color:inherit;border:1px solid var(--yx-line);
    border-radius:999px;height:42px;padding:0 16px;font:inherit;margin:8px 0}
  .yx-search:focus,.yx-modal select:focus,.yx-modal input[type=number]:focus,.yx-modal input[type=text]:focus{outline:0;border-color:#1d9bf0}
  .yx-plugin{border-top:1px solid var(--yx-line);padding:14px 0}
  .yx-plugin:first-of-type{border-top:0}
  .yx-prow{display:flex;align-items:center;gap:12px}
  .yx-pinfo{flex:1;min-width:0}
  .yx-pname{font-weight:700;font-size:15px;line-height:20px}
  .yx-pdesc{color:var(--yx-sub);font-size:13px;line-height:16px;margin-top:2px}
  .yx-opts{margin-top:10px;padding:4px 14px;border:1px solid var(--yx-line);border-radius:12px}
  .yx-opt{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 0;border-top:1px solid var(--yx-line)}
  .yx-opt:first-child{border-top:0}
  .yx-opt > label:first-child{flex:1;font-size:15px}
  .yx-modal select,.yx-modal input[type=number],.yx-modal input[type=text]{background:transparent;color:inherit;
    border:1px solid var(--yx-ctl);border-radius:4px;height:36px;padding:0 8px;font:inherit}
  .yx-modal[data-theme=dark]{color-scheme:dark}
  .yx-modal[data-theme=light]{color-scheme:light}
  .yx-modal select option{background-color:var(--yx-bg);color:var(--yx-fg)}
  .yx-sw{position:relative;display:inline-block;width:38px;height:22px;flex:none;cursor:pointer}
  .yx-sw input{opacity:0;width:0;height:0;position:absolute}
  .yx-sw span{position:absolute;inset:0;border-radius:999px;background:var(--yx-ctl);transition:background .15s}
  .yx-sw span::after{content:"";position:absolute;top:2px;left:2px;width:18px;height:18px;border-radius:50%;background:#fff;transition:transform .15s}
  .yx-sw input:checked + span{background:#1d9bf0}
  .yx-sw input:checked + span::after{transform:translateX(16px)}
  .yx-hint{display:block;color:var(--yx-sub);font-size:13px;line-height:16px;margin-top:2px}
  .yx-add{display:flex;gap:8px;align-items:center;margin:8px 0 4px}
  .yx-modal .yx-add input[type=text].yx-search{flex:1;margin:0}
  .yx-code{width:100%;box-sizing:border-box;min-height:160px;resize:vertical;background:transparent;color:inherit;
    border:1px solid var(--yx-ctl);border-radius:8px;padding:10px;font:13px/1.45 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}
  .yx-code:focus{outline:0;border-color:#1d9bf0}
  .yx-sect{margin-top:20px;display:flex;align-items:center;justify-content:space-between;gap:12px;font-weight:700;font-size:17px;padding-bottom:8px}
  .yx-err{color:#f4212e}
  .yx-empty{color:var(--yx-sub);text-align:center;padding:32px 0}
  .yx-menu-item{cursor:pointer}
  .yx-modal.yx-small{width:min(380px,94vw);height:auto}
  .yx-pops{position:fixed;right:20px;bottom:20px;z-index:2147483646;display:flex;flex-direction:column;gap:12px;align-items:flex-end;pointer-events:none}
  .yx-pops .yx-pop{pointer-events:auto}
  .yx-news h3{margin:14px 0 4px;font-size:15px;line-height:20px;font-weight:700}
  .yx-news h3:first-child{margin-top:0}
  .yx-news h3 span{color:var(--yx-sub);font-weight:400;font-size:13px;margin-left:8px}
  .yx-news ul{margin:0;padding-left:18px;font-size:14px;line-height:19px}
  .yx-news li{margin:3px 0}
  .yx-pop .yx-news{max-height:40vh;overflow:auto}
  .yx-dlg{padding:20px}
  .yx-dlg h2{margin:0 0 8px;font-size:20px;line-height:24px;font-weight:800}
  .yx-dlg p{margin:0;color:var(--yx-sub);font-size:15px;line-height:20px}
  .yx-dlg .yx-btns{justify-content:flex-end;padding-top:16px}
  .yx-modal.yx-onb{width:min(520px,94vw);height:auto;max-height:90vh}
  .yx-onb-h{margin:8px 0 6px;font-size:20px;line-height:24px;font-weight:800}
  .yx-onb-p{margin:0 0 12px;color:var(--yx-sub);font-size:15px;line-height:20px}
  .yx-foot{display:flex;align-items:center;gap:8px;padding:12px 16px;border-top:1px solid var(--yx-line);flex:none}
  .yx-foot .yx-spacer{flex:1}
  .yx-how{display:flex;gap:12px;margin:0 0 14px;font-size:15px;line-height:20px}
  .yx-how-n{flex:none;width:24px;height:24px;border-radius:50%;background:var(--yx-pbg);color:var(--yx-pfg);
    font-weight:700;font-size:13px;display:flex;align-items:center;justify-content:center}
  .yx-mock{display:flex;align-items:center;gap:12px;width:fit-content;margin-top:8px;padding:10px 20px 10px 16px;
    border:1px solid var(--yx-line);border-radius:12px;font-weight:700}
  .yx-toast{position:fixed;left:50%;bottom:40px;transform:translateX(-50%);z-index:2147483647;background:#1d9bf0;color:#fff;
    padding:12px 16px;border-radius:4px;font-size:15px;max-width:80vw}
`;

  // src/index.js
  LOG("loaded v1.1.2", location.href);
  addStyle("core", CORE_CSS);
  registerPlugins(plugins_default);
  initThemes();
  watchMenu();
  initScanner();
  initUpdateWatch();
  initChangelog(openSettings);
  initOnboarding(openSettings);
  if (typeof GM_registerMenuCommand === "function") GM_registerMenuCommand("YovariX", () => openSettings());
})();
