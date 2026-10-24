// The building directory, fetched once and shared by the type-ahead, the room
// tags and the floor map. Every feature that uses it degrades gracefully if the
// fetch fails: the chat itself never depends on it.

let cache = null;
let pending = null;

export const LEVELS = [-1, 0, 1, 2, 3, 4, 5, 6];

export function loadBuilding() {
  if (cache) return Promise.resolve(cache);
  if (!pending) {
    pending = fetch('/api/directory')
      .then((r) => { if (!r.ok) throw new Error('directory unavailable'); return r.json(); })
      .then((data) => {
        const byCode = new Map(data.rooms.map((r) => [r.code, r]));
        const byLevel = new Map();
        for (const room of data.rooms) {
          if (!byLevel.has(room.level)) byLevel.set(room.level, []);
          byLevel.get(room.level).push(room);
        }
        cache = { ...data, byCode, byLevel };
        return cache;
      })
      .catch((error) => { pending = null; throw error; });
  }
  return pending;
}

export function building() {
  return cache;
}

export function levelTitle(level) {
  if (level === -1) return 'Basement';
  if (level === 0) return 'Ground floor';
  return `Level ${level}`;
}

export function levelShort(level) {
  if (level === -1) return 'B';
  if (level === 0) return 'G';
  return String(level);
}
