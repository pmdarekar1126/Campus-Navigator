// Renders an answer: room numbers and levels become tappable tags, and a new
// answer is revealed word by word. Built from text nodes and buttons only; the
// answer text is never parsed as HTML.

const TOKEN = /\b(Room\s)?(ET\s)?([0-6]\d{2}[A-C]?)\b|\bLevel ([0-6])\b|\b(ground floor|basement)\b/g;

function sentenceAround(text, index) {
  const start = Math.max(text.lastIndexOf('.', index), text.lastIndexOf('!', index), text.lastIndexOf('?', index)) + 1;
  const endMatch = text.slice(index).search(/[.!?](\s|$)/);
  return text.slice(start, endMatch < 0 ? text.length : index + endMatch);
}

// A three-digit number is only a room when the words around it say so;
// "call 112" names the emergency line, not the lab in Room 112.
function looksLikeRoom(text, match, index) {
  if (match[1] || match[2]) return true;
  const before = text.slice(Math.max(0, index - 6), index);
  if (/(call|dial)\s$/i.test(before)) return false;
  const after = text.slice(index + match[0].length, index + match[0].length + 16);
  if (/^\s?\(/.test(after) || /^\s+on\s+(Level|the ground|the basement)/.test(after)) return true;
  return /rooms?\b/i.test(sentenceAround(text, index));
}

export function segment(text, data) {
  const parts = [];
  let last = 0;
  TOKEN.lastIndex = 0;
  let m;
  while ((m = TOKEN.exec(text)) !== null) {
    let tag = null;
    if (m[3]) {
      const room = data && data.byCode.get(m[3]);
      if (room && looksLikeRoom(text, m, m.index)) {
        tag = { label: m[0], question: `Where is Room ${room.label}?`, code: room.code, level: room.level };
      }
    } else if (m[4] !== undefined) {
      tag = { label: m[0], question: `What is on Level ${m[4]}?`, level: Number(m[4]) };
    } else if (m[5]) {
      const basement = /basement/i.test(m[5]);
      tag = { label: m[0], question: basement ? 'What is in the basement?' : 'What is on the ground floor?', level: basement ? -1 : 0 };
    }
    if (!tag) continue;
    if (m.index > last) parts.push({ type: 'text', text: text.slice(last, m.index) });
    parts.push({ type: 'tag', ...tag });
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push({ type: 'text', text: text.slice(last) });
  return parts;
}

// Works out what to draw from the answer text itself, for answers saved before
// the server sent map data and for knowledge-base answers that name rooms.
export function inferMap(text, data) {
  if (!data) return null;
  const parts = segment(text, data).filter((p) => p.type === 'tag');
  const codes = [...new Set(parts.filter((p) => p.code).map((p) => p.code))];
  if (codes.length) return { level: data.byCode.get(codes[0]).level, rooms: codes };
  const withLevel = parts.find((p) => p.level !== undefined);
  return withLevel ? { level: withLevel.level, rooms: [] } : null;
}

function unitsFrom(parts, onTag) {
  const units = [];
  for (const part of parts) {
    if (part.type === 'tag') {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'room-tag';
      button.textContent = part.label;
      button.title = part.question;
      button.addEventListener('click', () => onTag(part.question));
      units.push(button);
    } else {
      for (const word of part.text.split(/(\s+)/)) if (word) units.push(document.createTextNode(word));
    }
  }
  return units;
}

const reducedMotion = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Returns a controller whose finish() completes the reveal instantly, so the
// stop button can end it without leaving half an answer on screen.
export function renderAnswer(element, text, { data, onTag, animate = false, onDone, onTick } = {}) {
  const units = unitsFrom(segment(text, data), onTag);
  element.replaceChildren();

  if (!animate || reducedMotion() || units.length < 8) {
    element.append(...units);
    if (onDone) onDone();
    return { finish() {}, running: false };
  }

  // Whole answer in well under a second, whatever its length.
  const perTick = Math.max(1, Math.ceil(units.length / 45));
  let i = 0;
  let timer = null;
  const controller = { running: true, finish };

  function step() {
    element.append(...units.slice(i, i + perTick));
    i += perTick;
    if (onTick) onTick();
    if (i >= units.length) { done(); return; }
    timer = setTimeout(step, 18);
  }

  function done() {
    clearTimeout(timer);
    if (i < units.length) element.append(...units.slice(i));
    i = units.length;
    if (controller.running) {
      controller.running = false;
      if (onDone) onDone();
    }
  }

  function finish() { done(); }

  step();
  return controller;
}
