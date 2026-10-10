import {
  parseKeyValue, parseSections, parsePosts, parseZoned,
  richText, escapeHtml as esc, safeUrl, formatDate, formatDateTime, splitDuration,
} from './parse.js';

const CONFIG_DIR = 'config/';
const $ = (sel, root = document) => root.querySelector(sel);
const pad = (n) => String(n).padStart(2, '0');

/* ------------------------------------------------------------
   Abschnitte: Standardwerte (überschreibbar über @-Zeilen in den .txt-Dateien)
------------------------------------------------------------ */
const SECTIONS = {
  setup:   { file: 'setup.txt',   kind: 'sections', nav: 'Setup',   tag: 'Anleitung',   title: 'So kommst du auf den Server', button: 'Öffnen' },
  mods:    { file: 'mods.txt',    kind: 'sections', nav: 'Mods',    tag: 'Client',      title: 'Mods',                        button: 'Download' },
  plugins: { file: 'plugins.txt', kind: 'sections', nav: 'Plugins', tag: 'Server',      title: 'Plugins',                     button: 'Mehr Infos' },
  links:   { file: 'links.txt',   kind: 'sections', nav: 'Links',   tag: 'Ressourcen',  title: 'Downloads & Links',           button: 'Öffnen' },
  news:    { file: 'news.txt',    kind: 'posts',    nav: 'News',    tag: 'Updates',     title: 'Neuigkeiten' },
};
const DEFAULT_ORDER = ['setup', 'mods', 'plugins', 'links', 'news'];

/* ------------------------------------------------------------
   Laden
------------------------------------------------------------ */
async function loadText(file, { required = false } = {}) {
  try {
    const res = await fetch(`${CONFIG_DIR}${file}?t=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) throw new Error(`${CONFIG_DIR}${file} (HTTP ${res.status})`);
    return await res.text();
  } catch (err) {
    if (required) throw err;
    return null; // optionale Datei fehlt -> Abschnitt wird übersprungen
  }
}

/* ------------------------------------------------------------
   Kleine Render-Helfer
------------------------------------------------------------ */
function linkAttrs(url) {
  return /^https?:\/\//i.test(url) ? ' target="_blank" rel="noopener noreferrer"' : '';
}

function button(url, label, cls = '') {
  const u = safeUrl(url);
  if (!u) return '';
  return `<a class="btn ${cls}" href="${esc(u)}"${linkAttrs(u)}>${esc(label)}<span aria-hidden="true">↗</span></a>`;
}

function groupKind(name) {
  const n = name.toLowerCase();
  if (/(verbot|nicht)/.test(n)) return 'no';
  if (/(notwendig|pflicht|required)/.test(n)) return 'must';
  if (/erlaubt/.test(n)) return 'ok';
  return 'neutral';
}

function post({ id, tag, title, intro, updated, body }) {
  const date = updated ? (formatDate(updated) || updated) : '';
  return `
  <article class="post glass reveal" id="${id}">
    <div class="post-meta">
      ${tag ? `<span class="tag">${esc(tag)}</span>` : ''}
      ${tag && date ? '<span class="sep" aria-hidden="true"></span>' : ''}
      ${date ? `<span>Aktualisiert ${esc(date)}</span>` : ''}
    </div>
    <h2>${esc(title)}</h2>
    ${intro ? `<p class="lead">${richText(intro)}</p>` : ''}
    ${body}
  </article>`;
}

/* ------------------------------------------------------------
   Renderer je Abschnitt
------------------------------------------------------------ */
function renderSteps({ sections }, meta, def) {
  const rows = sections.flatMap((s) => s.rows).filter((r) => r[0]);
  if (!rows.length) return '';
  const fallback = meta.buttontext || def.button;
  return `<ol class="steps">${rows.map(([title, text = '', url = '', label = '']) => `
    <li>
      <div>
        <h3>${richText(title)}</h3>
        ${text ? `<p>${richText(text)}</p>` : ''}
        ${button(url, label || fallback)}
      </div>
    </li>`).join('')}</ol>`;
}

function renderGroups({ sections }, meta, def) {
  const groups = sections.filter((s) => s.rows.some((r) => r[0]));
  if (!groups.length) return '';
  const fallback = meta.buttontext || def.button;
  return groups.map((g) => {
    const rows = g.rows.filter((r) => r[0]);
    return `
    <section class="group">
      <div class="group-head">
        ${g.name ? `<span class="badge ${groupKind(g.name)}">${esc(g.name)}</span>` : ''}
        ${g.desc ? `<span class="group-desc">${richText(g.desc)}</span>` : ''}
      </div>
      <ul class="items">${rows.map(([name, desc = '', url = '']) => `
        <li class="item">
          <div class="item-main">
            <span class="item-name">${richText(name)}</span>
            ${desc ? `<span class="item-desc">${richText(desc)}</span>` : ''}
          </div>
          ${button(url, fallback)}
        </li>`).join('')}
      </ul>
    </section>`;
  }).join('');
}

function renderTiles({ sections }) {
  const groups = sections.filter((s) => s.rows.some((r) => r[0]));
  if (!groups.length) return '';
  return groups.map((g) => {
    const icon = /download/i.test(g.name) ? '↓' : '→';
    const tiles = g.rows.filter((r) => r[0]).map(([label, url = '', desc = '']) => {
      const u = safeUrl(url);
      const inner = `
        <span class="tile-ic" aria-hidden="true">${icon}</span>
        <span class="tile-text"><b>${richText(label)}</b>${desc ? `<small>${richText(desc)}</small>` : ''}</span>
        <span class="tile-arrow" aria-hidden="true">↗</span>`;
      return u
        ? `<a class="tile" href="${esc(u)}"${linkAttrs(u)}>${inner}</a>`
        : `<div class="tile">${inner}</div>`;
    }).join('');
    return `
    <section class="group">
      <div class="group-head">
        ${g.name ? `<span class="badge neutral">${esc(g.name)}</span>` : ''}
        ${g.desc ? `<span class="group-desc">${richText(g.desc)}</span>` : ''}
      </div>
      <div class="tiles">${tiles}</div>
    </section>`;
  }).join('');
}

function renderNews({ posts }) {
  if (!posts.length) return '';
  return `<div class="entries">${posts.map((p) => {
    const date = formatDate(p.date) || p.date;
    return `
    <div class="entry">
      <div class="entry-meta">
        ${p.tag ? `<span class="tag">${esc(p.tag)}</span>` : ''}
        ${date ? `<span>${esc(date)}</span>` : ''}
      </div>
      <h3>${richText(p.title)}</h3>
      ${p.paragraphs.map((t) => `<p>${richText(t).replace(/\n/g, '<br>')}</p>`).join('')}
    </div>`;
  }).join('')}</div>`;
}

const RENDERERS = {
  setup: renderSteps, mods: renderGroups, plugins: renderGroups, links: renderTiles, news: renderNews,
};

/* ------------------------------------------------------------
   Hero + Countdown
------------------------------------------------------------ */
function renderHero(cfg, schedule) {
  const { start, end, tz } = schedule;
  const badges = [
    cfg.version && `Minecraft ${cfg.version}`,
    cfg.loader,
    cfg.serversoftware,
  ].filter(Boolean);

  let countdown;
  if (end) {
    countdown = `
    <div class="countdown glass" id="countdown">
      <div class="cd-head">
        <span class="cd-label" id="cd-label">Der Server läuft noch</span>
        <span class="cd-end">bis ${esc(formatDateTime(end, tz))}</span>
      </div>
      <div class="cd-grid" id="cd-grid">
        <div class="cd-unit"><b data-u="d">00</b><small>Tage</small></div>
        <div class="cd-unit"><b data-u="h">00</b><small>Stunden</small></div>
        <div class="cd-unit"><b data-u="m">00</b><small>Minuten</small></div>
        <div class="cd-unit"><b data-u="s">00</b><small>Sekunden</small></div>
      </div>
      <p class="cd-ended" id="cd-ended" hidden></p>
      <div class="cd-bar" id="cd-bar" ${start ? '' : 'hidden'}><span id="cd-fill"></span></div>
      <p class="cd-foot" id="cd-foot"></p>
    </div>`;
  } else {
    countdown = `
    <div class="countdown glass">
      <div class="cd-head"><span class="cd-label">Laufzeit</span></div>
      <p class="cd-open">Unbefristet – es ist kein Ende geplant.</p>
    </div>`;
  }

  $('#hero').innerHTML = `
    ${cfg.untertitel ? `<p class="eyebrow">${esc(cfg.untertitel)}</p>` : ''}
    <h1>${esc(cfg.name || 'Minecraft-Server')}</h1>
    ${cfg.beschreibung ? `<p class="lead">${richText(cfg.beschreibung)}</p>` : ''}
    <div class="hero-row">
      ${cfg.ip ? `
      <button class="ip glass" type="button" data-copy="${esc(cfg.ip)}" aria-label="Server-IP kopieren">
        <span class="ip-label">Server-IP</span>
        <code>${esc(cfg.ip)}</code>
        <span class="ip-copy">Kopieren</span>
      </button>` : ''}
      <span class="status" id="status" hidden></span>
    </div>
    ${badges.length ? `<div class="badges">${badges.map((b) => `<span class="pill">${esc(b)}</span>`).join('')}</div>` : ''}
    ${countdown}`;
}

function startCountdown({ start, end }, cfg) {
  const root = $('#countdown');
  if (!root || !end) return;
  const label = $('#cd-label'), grid = $('#cd-grid'), ended = $('#cd-ended');
  const fill = $('#cd-fill'), foot = $('#cd-foot');
  const units = Object.fromEntries([...root.querySelectorAll('[data-u]')].map((el) => [el.dataset.u, el]));
  let timer;

  const tick = () => {
    const now = Date.now();
    if (now >= end) {
      root.classList.add('is-ended');
      label.textContent = 'Beendet';
      grid.hidden = true;
      ended.hidden = false;
      ended.textContent = cfg.ende_text || 'Der Server ist abgelaufen.';
      if (fill) fill.style.width = '100%';
      foot.textContent = '';
      clearInterval(timer);
      return;
    }
    const upcoming = start && now < start;
    label.textContent = upcoming ? 'Der Server startet in' : 'Der Server läuft noch';
    const t = splitDuration((upcoming ? start : end) - now);
    units.d.textContent = pad(t.d);
    units.h.textContent = pad(t.h);
    units.m.textContent = pad(t.m);
    units.s.textContent = pad(t.s);
    if (start && end > start) {
      const p = Math.min(1, Math.max(0, (now - start) / (end - start)));
      fill.style.width = `${(p * 100).toFixed(2)}%`;
      foot.textContent = upcoming ? '' : `${Math.round(p * 100)} % der Laufzeit sind vorbei`;
    }
  };
  tick();
  timer = setInterval(tick, 1000);
}

async function loadStatus(ip) {
  const el = $('#status');
  if (!el || !ip) return;
  try {
    const res = await fetch(`https://api.mcsrvstat.us/3/${encodeURIComponent(ip)}`);
    const j = await res.json();
    el.className = `status ${j.online ? 'on' : 'off'}`;
    el.textContent = j.online
      ? `Online · ${j.players?.online ?? 0}/${j.players?.max ?? '?'} Spieler`
      : 'Offline';
    el.hidden = false;
  } catch { /* Status ist optional – bei Fehler einfach ausblenden */ }
}

/* ------------------------------------------------------------
   Theme, Interaktionen, Fehler
------------------------------------------------------------ */
function applyTheme(cfg) {
  const hex = (cfg.akzentfarbe || '').trim();
  const m = hex.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (!m) return;
  const root = document.documentElement.style;
  root.setProperty('--accent', hex);
  let h = m[1];
  if (h.length === 3) h = [...h].map((c) => c + c).join('');
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
  const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  root.setProperty('--on-accent', lum > 0.55 ? '#07110b' : '#ffffff');
}

function setupInteractions() {
  // Kopieren
  document.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-copy]');
    if (!btn) return;
    const text = btn.dataset.copy;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = Object.assign(document.createElement('textarea'), { value: text });
      document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove();
    }
    const label = $('.ip-copy', btn);
    label.textContent = 'Kopiert ✓';
    btn.classList.add('copied');
    setTimeout(() => { label.textContent = 'Kopieren'; btn.classList.remove('copied'); }, 1800);
  });

  // Einblenden beim Scrollen
  const reveal = new IntersectionObserver((entries) => {
    for (const en of entries) if (en.isIntersecting) { en.target.classList.add('in'); reveal.unobserve(en.target); }
  }, { threshold: 0.08 });
  document.querySelectorAll('.reveal').forEach((el) => reveal.observe(el));

  // Aktiven Menüpunkt markieren
  const links = [...document.querySelectorAll('#nav-links a')];
  const spy = new IntersectionObserver((entries) => {
    for (const en of entries) {
      if (!en.isIntersecting) continue;
      links.forEach((a) => a.classList.toggle('active', a.dataset.id === en.target.id));
    }
  }, { rootMargin: '-35% 0px -60% 0px' });
  document.querySelectorAll('.post').forEach((el) => spy.observe(el));
}

function showError(err) {
  $('#hero').innerHTML = '';
  $('#feed').innerHTML = `
    <div class="post glass error">
      <h2>Konfiguration konnte nicht geladen werden</h2>
      <p>Die Textdateien im Ordner <code>config</code> werden beim Öffnen der Seite nachgeladen.
         Das funktioniert nicht, wenn <code>index.html</code> per Doppelklick geöffnet wird (<code>file://</code>).</p>
      <p><strong>Lösung:</strong> Seite über einen Webserver öffnen – lokal mit <code>start.bat</code> (Windows)
         bzw. <code>start.sh</code> (Mac/Linux), oder die Dateien auf deinen Webspace hochladen.</p>
      <p class="muted-small">Technische Details: ${esc(err.message || String(err))}</p>
    </div>`;
}

/* ------------------------------------------------------------
   Start
------------------------------------------------------------ */
async function init() {
  let cfg;
  try {
    cfg = parseKeyValue(await loadText('server.txt', { required: true }));
  } catch (err) {
    showError(err);
    return;
  }

  document.title = [cfg.name, cfg.untertitel].filter(Boolean).join(' – ') || 'Server-Setup';
  $('#brand').textContent = cfg.name || 'Server';
  applyTheme(cfg);

  const tz = cfg.zeitzone || 'Europe/Berlin';
  const schedule = { tz, start: parseZoned(cfg.start, tz), end: parseZoned(cfg.ende, tz) };
  renderHero(cfg, schedule);
  startCountdown(schedule, cfg);
  if ((cfg.status_anzeigen || '').toLowerCase() === 'ja') loadStatus(cfg.ip);

  const order = (cfg.reihenfolge ? cfg.reihenfolge.split(',') : DEFAULT_ORDER)
    .map((s) => s.trim().toLowerCase())
    .filter((id) => SECTIONS[id]);

  const texts = await Promise.all(order.map((id) => loadText(SECTIONS[id].file)));

  const parts = [];
  order.forEach((id, i) => {
    if (texts[i] == null) return;
    const def = SECTIONS[id];
    const data = def.kind === 'posts' ? parsePosts(texts[i]) : parseSections(texts[i]);
    const body = RENDERERS[id](data, data.meta, def);
    if (!body) return;
    const m = data.meta;
    parts.push({
      id,
      nav: m.nav || def.nav,
      html: post({
        id,
        tag: m.tag ?? def.tag,
        title: m.titel || def.title,
        intro: m.intro || '',
        updated: m.aktualisiert || '',
        body,
      }),
    });
  });

  $('#feed').innerHTML = parts.map((p) => p.html).join('');
  $('#nav-links').innerHTML = parts.map((p) => `<a href="#${p.id}" data-id="${p.id}">${esc(p.nav)}</a>`).join('');
  $('#footer').innerHTML = cfg.footer ? `<p>${richText(cfg.footer)}</p>` : '';
  setupInteractions();
}

init();
