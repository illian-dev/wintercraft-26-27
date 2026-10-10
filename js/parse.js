// parse.js – reine Hilfsfunktionen (kein DOM nötig, daher einfach testbar)

const clean = (t) => String(t).replace(/^﻿/, '').replace(/\r\n?/g, '\n');

/* ---------- Text & Sicherheit ---------- */

export function escapeHtml(s = '') {
  return String(s).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

// Erlaubt http(s), mailto und relative Pfade. Alles andere (z. B. javascript:) wird verworfen.
export function safeUrl(u = '') {
  const url = String(u).trim();
  if (!url) return '';
  if (/^[a-z][a-z0-9+.-]*:/i.test(url)) return /^(https?|mailto):/i.test(url) ? url : '';
  return url;
}

// Kleines Inline-Markup: **fett**, `code`, [Text](https://link)
export function richText(s = '') {
  let out = escapeHtml(s);
  out = out.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
    (_, t, u) => `<a href="${u}" target="_blank" rel="noopener noreferrer">${t}</a>`);
  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  out = out.replace(/`([^`]+)`/g, '<code>$1</code>');
  return out;
}

/* ---------- Config-Formate ---------- */

// schluessel = wert
export function parseKeyValue(text) {
  const out = {};
  for (const raw of clean(text).split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const i = line.indexOf('=');
    if (i < 1) continue;
    out[line.slice(0, i).trim().toLowerCase()] = line.slice(i + 1).trim();
  }
  return out;
}

function readMeta(line, meta) {
  const i = line.indexOf('=');
  if (i > 1) meta[line.slice(1, i).trim().toLowerCase()] = line.slice(i + 1).trim();
}

// @meta = wert  /  [Gruppe] Text  /  Spalte | Spalte | Spalte
export function parseSections(text) {
  const meta = {};
  const sections = [];
  let cur = null;
  for (const raw of clean(text).split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    if (line.startsWith('@')) { readMeta(line, meta); continue; }
    const m = line.match(/^\[([^\]]+)\](?!\()\s*(.*)$/);
    if (m) {
      cur = { name: m[1].trim(), desc: m[2].trim(), rows: [] };
      sections.push(cur);
      continue;
    }
    if (!cur) { cur = { name: '', desc: '', rows: [] }; sections.push(cur); }
    cur.rows.push(line.split('|').map((c) => c.trim()));
  }
  return { meta, sections };
}

// ## Titel | Datum | Label  + Absätze (Leerzeile trennt)
export function parsePosts(text) {
  const meta = {};
  const posts = [];
  let cur = null;
  let buf = [];
  const flush = () => {
    if (cur && buf.length) cur.paragraphs.push(buf.join('\n'));
    buf = [];
  };
  for (const raw of clean(text).split('\n')) {
    const t = raw.trim();
    if (t.startsWith('## ')) {
      flush();
      const [title = '', date = '', tag = ''] = t.slice(3).split('|').map((s) => s.trim());
      cur = { title, date, tag, paragraphs: [] };
      posts.push(cur);
      continue;
    }
    if (!cur && t.startsWith('@')) { readMeta(t, meta); continue; }
    if (t.startsWith('#')) continue; // Kommentar
    if (!cur) continue;
    if (!t) flush(); else buf.push(t);
  }
  flush();
  return { meta, posts };
}

/* ---------- Datum & Zeit ---------- */

function tzOffset(ts, tz) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz, hourCycle: 'h23',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(new Date(ts));
  const g = (type) => Number(parts.find((p) => p.type === type).value);
  return Date.UTC(g('year'), g('month') - 1, g('day'), g('hour'), g('minute'), g('second')) - ts;
}

// "2026-12-31 23:59" in einer Zeitzone -> Date (korrekt inkl. Sommer-/Winterzeit)
export function parseZoned(str, tz = 'Europe/Berlin') {
  const m = String(str || '').trim().match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{1,2}):(\d{2}))?$/);
  if (!m) return null;
  const [y, mo, d, h, mi] = m.slice(1).map((v) => (v === undefined ? 0 : Number(v)));
  try {
    const guess = Date.UTC(y, mo - 1, d, h, mi);
    const off1 = tzOffset(guess, tz);
    let t = guess - off1;
    const off2 = tzOffset(t, tz);
    if (off2 !== off1) t = guess - off2;
    return new Date(t);
  } catch {
    return new Date(y, mo - 1, d, h, mi); // ungültige Zeitzone -> lokale Zeit
  }
}

export function formatDate(str) {
  const m = String(str || '').trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return '';
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  return new Intl.DateTimeFormat('de-DE', {
    day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
  }).format(d);
}

export function formatDateTime(date, tz) {
  const opts = { dateStyle: 'full', timeStyle: 'short' };
  try {
    return new Intl.DateTimeFormat('de-DE', { ...opts, timeZone: tz }).format(date) + ' Uhr';
  } catch {
    return new Intl.DateTimeFormat('de-DE', opts).format(date) + ' Uhr';
  }
}

export function splitDuration(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return {
    d: Math.floor(s / 86400),
    h: Math.floor((s % 86400) / 3600),
    m: Math.floor((s % 3600) / 60),
    s: s % 60,
  };
}
