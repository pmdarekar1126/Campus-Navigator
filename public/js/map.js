// A schematic of one level, drawn from its directory board. Rooms keep their
// board order and alternate left and right of a single corridor, so a room's
// neighbours on the board are its neighbours on the drawing. It is a reading
// aid, not an architectural plan, and says so under the drawing.

import { LEVELS, building, levelTitle, levelShort } from './building.js';

const SVG = 'http://www.w3.org/2000/svg';
const W = 340;
const COL = 136;
const CORRIDOR = W - COL * 2;
const ROW = 40;
const GAP = 6;
const TOP = 58;

function el(name, attrs = {}, text) {
  const node = document.createElementNS(SVG, name);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  if (text !== undefined) node.textContent = text;
  return node;
}

function shorten(name, max = 21) {
  return name.length > max ? `${name.slice(0, max - 1).trimEnd()}…` : name;
}

function neighboursOf(list, targets) {
  const near = new Set();
  list.forEach((room, i) => {
    if (!targets.has(room.code)) return;
    if (list[i - 1]) near.add(list[i - 1].code);
    if (list[i + 1]) near.add(list[i + 1].code);
  });
  for (const code of targets) near.delete(code);
  return near;
}

function roomBox(x, y, width, height, code, name, state, onAsk) {
  const g = el('g', {
    class: `map-room${state ? ` is-${state}` : ''}`,
    tabindex: '0',
    role: 'button',
    'aria-label': `${code}, ${name}${state === 'target' ? ', highlighted' : ''}. Ask for directions.`
  });
  g.append(el('title', {}, `${code} · ${name}`));
  g.append(el('rect', { x, y, width, height, rx: 7 }));
  g.append(el('text', { x: x + 9, y: y + 16, class: 'map-code' }, code));
  g.append(el('text', { x: x + 9, y: y + 30, class: 'map-name' }, shorten(name)));
  const ask = () => onAsk(`Where is Room ${code}?`);
  g.addEventListener('click', ask);
  g.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); ask(); } });
  return g;
}

function drawLevel(level, targets, onAsk) {
  const data = building();
  const list = (data.byLevel.get(level) || []);
  const svg = el('svg', { class: 'map-svg', role: 'group', 'aria-label': `Schematic of ${levelTitle(level)}` });

  // Arrival point: every photo shows the board facing the lift lobby.
  svg.append(el('rect', { x: 0, y: 0, width: W, height: 42, rx: 8, class: 'map-lobby' }));
  svg.append(el('text', { x: W / 2, y: 18, class: 'map-lobby-title', 'text-anchor': 'middle' }, 'Lifts, stairs and directory board'));
  svg.append(el('text', { x: W / 2, y: 33, class: 'map-lobby-sub', 'text-anchor': 'middle' }, 'You arrive here'));

  if (level === -1) {
    const places = [...data.basement.map((b) => b.name), 'Classroom and lab'];
    places.forEach((name, i) => {
      const y = TOP + i * (ROW + GAP);
      svg.append(el('rect', { x: CORRIDOR, y, width: W - CORRIDOR * 2, height: ROW, rx: 7, class: 'map-room-static' }));
      svg.append(el('text', { x: W / 2, y: y + 25, class: 'map-code', 'text-anchor': 'middle' }, name));
    });
    const h = TOP + places.length * (ROW + GAP);
    svg.setAttribute('viewBox', `0 0 ${W} ${h}`);
    return svg;
  }

  const rows = Math.ceil(list.length / 2);
  const height = TOP + rows * (ROW + GAP);
  svg.append(el('rect', { x: COL + 6, y: 42, width: CORRIDOR - 12, height: height - 42, class: 'map-corridor' }));

  const near = neighboursOf(list, targets);
  list.forEach((room, i) => {
    const row = Math.floor(i / 2);
    const left = i % 2 === 0;
    const x = left ? 0 : COL + CORRIDOR;
    const y = TOP + row * (ROW + GAP);
    const state = targets.has(room.code) ? 'target' : near.has(room.code) ? 'near' : '';
    svg.append(roomBox(x, y, COL, ROW, room.label, room.name, state, onAsk));
  });

  svg.setAttribute('viewBox', `0 0 ${W} ${height}`);
  return svg;
}

export function createMap({ panel, onAsk }) {
  const title = panel.querySelector('.map-title');
  const levels = panel.querySelector('.map-levels');
  const canvas = panel.querySelector('.map-canvas');
  const note = panel.querySelector('.map-note');
  const closeButton = panel.querySelector('.map-close');
  let targets = new Set();
  let current = 0;
  let returnTo = null;

  function levelsWithTargets() {
    const data = building();
    const set = new Set();
    for (const code of targets) { const r = data.byCode.get(code); if (r) set.add(r.level); }
    return set;
  }

  function show(level) {
    current = level;
    title.textContent = `${levelTitle(level)} map`;
    const marked = levelsWithTargets();
    levels.replaceChildren(...LEVELS.map((l) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'map-level';
      b.textContent = levelShort(l);
      b.setAttribute('aria-label', `${levelTitle(l)}${marked.has(l) ? ', has a highlighted room' : ''}`);
      b.setAttribute('aria-pressed', String(l === level));
      if (marked.has(l)) b.classList.add('has-target');
      b.addEventListener('click', () => show(l));
      return b;
    }));
    canvas.replaceChildren(drawLevel(level, targets, (q) => { close(); onAsk(q); }));
    note.textContent = level === -1
      ? 'Drawn from the building-wide board on Level 3. Not to scale.'
      : `Schematic drawn from the ${levelTitle(level)} directory board: rooms in board order, not an architectural plan.`;
  }

  function open(map, trigger) {
    if (!building() || !map) return;
    targets = new Set(map.rooms || []);
    returnTo = trigger || null;
    panel.hidden = false;
    requestAnimationFrame(() => panel.classList.add('is-open'));
    show(map.level);
    closeButton.focus();
  }

  function close() {
    if (panel.hidden) return;
    panel.classList.remove('is-open');
    panel.hidden = true;
    if (returnTo && returnTo.isConnected) returnTo.focus();
  }

  closeButton.addEventListener('click', close);

  return { open, close, isOpen: () => !panel.hidden, current: () => current };
}
