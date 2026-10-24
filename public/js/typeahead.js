// Suggests rooms, labs, offices and departments while the student types, so
// they can recognise a name instead of having to recall it. Implemented as an
// ARIA combobox: arrow keys move, Enter picks, Escape closes.

import { building, levelTitle } from './building.js';

const MAX = 6;

function norm(text) {
  return String(text).normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
}

function scoreText(query, text) {
  const t = norm(text);
  if (!t) return 0;
  if (t === query) return 100;
  if (t.startsWith(query)) return 90;
  if (t.split(' ').some((w) => w.startsWith(query))) return 80;
  if (t.includes(query)) return 60;
  return 0;
}

function candidates(raw) {
  const data = building();
  if (!data) return [];
  const query = norm(raw).replace(/^(where is|where are|wheres|where|the|room|rm)\s+/, '').replace(/^the\s+/, '');
  if (query.length < 2) return [];
  const compact = query.replace(/\s/g, '');
  const looksLikeCode = /^(et)?\d/.test(compact);
  const out = [];

  for (const room of data.rooms) {
    let score = 0;
    const code = room.code.toLowerCase();
    if (looksLikeCode) {
      const digits = compact.replace(/^et/, '');
      if (code.startsWith(digits)) score = 100 - (code.length - digits.length);
    } else if (room.kind !== 'classroom') {
      score = Math.max(scoreText(query, room.name), ...room.aliases.map((a) => scoreText(query, a) - 10));
    }
    if (score > 0) {
      out.push({
        score,
        name: room.name,
        meta: `Room ${room.label} · ${levelTitle(room.level)}`,
        question: `Where is Room ${room.label}?`
      });
    }
  }

  if (!looksLikeCode) {
    for (const dept of data.departments) {
      const score = Math.max(scoreText(query, dept.name), ...dept.aliases.map((a) => scoreText(query, a) - 10));
      if (score > 0) out.push({ score: score - 2, name: `${dept.name} department`, meta: levelTitle(dept.level), question: `Where is the ${dept.name} department?` });
    }
    for (const place of data.basement) {
      const score = Math.max(scoreText(query, place.name), ...place.aliases.map((a) => scoreText(query, a) - 10));
      if (score > 0) out.push({ score: score - 3, name: place.name, meta: 'Basement', question: `Where is the ${place.name.toLowerCase()}?` });
    }
  }

  const seen = new Set();
  return out
    .sort((a, b) => b.score - a.score || a.meta.localeCompare(b.meta))
    .filter((c) => { const key = `${c.name}|${c.meta}`; if (seen.has(key)) return false; seen.add(key); return true; })
    .slice(0, MAX)
    .map((c) => ({ ...c, query }));
}

function highlighted(name, query) {
  const frag = document.createDocumentFragment();
  const plainName = norm(name);
  const at = plainName.indexOf(query);
  // Only mark the match when the normalised name lines up with the original,
  // so an accent or ampersand never shifts the highlight onto the wrong letters.
  if (at < 0 || plainName.length !== name.length) {
    frag.append(name);
    return frag;
  }
  const mark = document.createElement('mark');
  mark.textContent = name.slice(at, at + query.length);
  frag.append(name.slice(0, at), mark, name.slice(at + query.length));
  return frag;
}

export function attachTypeahead({ input, listbox, onPick }) {
  let items = [];
  let active = -1;

  input.setAttribute('role', 'combobox');
  input.setAttribute('aria-autocomplete', 'list');
  input.setAttribute('aria-expanded', 'false');
  input.setAttribute('aria-controls', listbox.id);

  function close() {
    items = [];
    active = -1;
    listbox.hidden = true;
    listbox.replaceChildren();
    input.setAttribute('aria-expanded', 'false');
    input.removeAttribute('aria-activedescendant');
  }

  function setActive(index) {
    active = index;
    listbox.querySelectorAll('[role="option"]').forEach((el, i) => el.setAttribute('aria-selected', String(i === index)));
    if (index >= 0) input.setAttribute('aria-activedescendant', `suggest-${index}`);
    else input.removeAttribute('aria-activedescendant');
  }

  function pick(index) {
    const item = items[index];
    if (!item) return;
    close();
    onPick(item.question);
  }

  function render() {
    items = candidates(input.value);
    if (items.length === 0) { close(); return; }
    listbox.replaceChildren(...items.map((item, i) => {
      const li = document.createElement('li');
      li.id = `suggest-${i}`;
      li.className = 'suggestion';
      li.setAttribute('role', 'option');
      li.setAttribute('aria-selected', 'false');
      const name = document.createElement('span');
      name.className = 'suggestion-name';
      name.append(highlighted(item.name, item.query));
      const meta = document.createElement('span');
      meta.className = 'suggestion-meta';
      meta.textContent = item.meta;
      li.append(name, meta);
      // pointerdown, not click, so the input never loses focus first.
      li.addEventListener('pointerdown', (event) => { event.preventDefault(); pick(i); });
      li.addEventListener('pointerenter', () => setActive(i));
      return li;
    }));
    listbox.hidden = false;
    input.setAttribute('aria-expanded', 'true');
    setActive(-1);
  }

  input.addEventListener('input', render);
  input.addEventListener('blur', () => setTimeout(close, 120));

  // Returns true when the key was handled here, so the composer does not also
  // act on it (Enter must pick the suggestion, not send the half-typed text).
  function handleKey(event) {
    if (listbox.hidden || items.length === 0) return false;
    if (event.key === 'ArrowDown') { event.preventDefault(); setActive((active + 1) % items.length); return true; }
    if (event.key === 'ArrowUp') { event.preventDefault(); setActive(active <= 0 ? items.length - 1 : active - 1); return true; }
    if (event.key === 'Escape') { event.preventDefault(); close(); return true; }
    if (event.key === 'Enter' && !event.shiftKey && active >= 0) { event.preventDefault(); pick(active); return true; }
    return false;
  }

  return { handleKey, close, refresh: render };
}
