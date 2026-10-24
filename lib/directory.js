/*
 * Answers location questions straight from the building data transcribed off
 * the floor boards. Deterministic: the same question always gets the same
 * answer, which is what a navigator has to be. When a question is about
 * something the boards do not cover, this returns null and lets the knowledge
 * base or the answer service handle it, rather than answering a nearby word.
 */

const { FLOORS, rooms, SHARED_FACILITIES, BASEMENT_FACILITIES, DEPARTMENTS } = require('../data/building');
const f = require('./directory-format');

// Deliberately without the retrieval synonyms: those fold "computer science"
// into "computer", erasing the difference between Level 4 and Level 5.
function plain(text) {
  return String(text)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/['’`]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const FILLER = new Set(('where is the a an what which how do does i can could get to go reach find located ' +
  'location floor level room rooms on in at of please tell me about for there any us we you my our show way ' +
  'directions direction take navigate route want need looking am are it its this that lead guide ' +
  'hey hi hello pls plz kindly situated placed kept whats wheres dept department block building college campus')
  .split(' '));
const LANDMARK_WORDS = new Set(['near', 'nearest', 'closest', 'next', 'opposite', 'beside', 'around', 'behind']);

const LOCATION = /\b(where|wheres|which floor|what floor|which level|what level|floor is|located|location|find|reach|get to|go to|way to|direction|directions|how do i get|how to get|how to go|how can i get|how do i go|take me|navigate|route|situated|is there|are there|do you have|does the college have|any)\b/;
const TIMING = /\b(when|what time|timing|timings|hours|open|opens|opening|close|closes|closing|schedule|today|tomorrow|24)\b/;
const HOD = /\b(hod|hods|head of|head)\b/;
const GENERIC_HOD = /\b(hod|hods|head of department|heads of department|head of the department|head of each department)\b/;
const FLOOR_LIST = /\b(what|whats|which|list|all|show|tell me|rooms|labs|everything|anything)\b/;
const LANDMARK = /\b(near|nearest|closest|next to|opposite|beside|around|behind)\b/;
// Questions about who owns something, or about groups, are not location lookups.
const NOT_A_PLACE = /\b(club|clubs|society|societies|committee|chapter|fest|which department|what department|who (teaches|handles|manages|runs|takes|is in charge))\b/;
// Words that make a facility question about a property of it, not its location.
const ATTRIBUTE = /\b(menu|price|prices|cost|fee|fees|timings?|rules?|contact|number|email|phone|staff|service|complaint|problem|report|computers?|wifi|books?|borrow|renew|fine|fines|membership|seats?|capacity|air conditioning|ac|projector|booking|book)\b/;
// Words that can sit directly in front of a room number. Anything else there
// ("physics 101", "cs 101") is a course code, not a room.
const ROOM_LEADS = new Set(('room rm no number num is at to in from near reach find where the of and go get class ' +
  'classroom lab hall cabin for opposite beside next outside inside with et ya hai kaha').split(' '));
// Offices that do not appear on any board but are handled by the Administrative Office.
const ADMIN_TOPICS = /\b(admissions?|registrar|academic|student affairs|student section|scholarships?|financial aid|lost and found|accounts|bonafide|documents?|id cards?|leaving certificate|transcripts?|registration)\b/;

const escapeRegex = (t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const contains = (hay, key) => new RegExp(`(^| )${escapeRegex(key)}( |$)`).test(hay);

// Every phrase that names something, longest first, so "dbms lab" beats "lab".
const PHRASES = [];
const add = (phrase, target) => { const key = plain(phrase); if (key) PHRASES.push({ key, target }); };
for (const room of rooms) for (const a of room.aliases) add(a, { type: 'alias', alias: plain(a) });
for (const s of SHARED_FACILITIES) {
  add(s.name, { type: 'shared', name: s.name });
  for (const a of s.aliases) add(a, { type: 'shared', name: s.name });
}
for (const fac of BASEMENT_FACILITIES) for (const a of fac.aliases) add(a, { type: 'basement', facility: fac, alias: plain(a) });
PHRASES.sort((a, b) => b.key.length - a.key.length);

function findRoomCode(q) {
  const re = /\b(?:et\s*)?([0-6]\d{2})\s*([abc])?\b/g;
  let m;
  while ((m = re.exec(q)) !== null) {
    const before = q.slice(0, m.index).trim().split(' ').pop();
    if (before && /^[a-z]+$/.test(before) && !ROOM_LEADS.has(before)) continue;
    return m[1] + (m[2] ? m[2].toUpperCase() : '');
  }
  return null;
}

function findDepartment(q, raw) {
  // Lowercase "it" is an ordinary word, so only a capitalised IT counts, and
  // not when the whole question is shouted in capitals.
  if (raw !== raw.toUpperCase() && /\bIT\b/.test(raw)) {
    return { dept: DEPARTMENTS.find((d) => d.name === 'Information Technology'), key: 'it' };
  }
  let best = null;
  for (const dept of DEPARTMENTS) {
    for (const alias of dept.aliases) {
      const key = plain(alias);
      if (contains(q, key) && (!best || key.length > best.key.length)) best = { dept, key };
    }
  }
  return best;
}

function residual(q, key) {
  const rest = key ? q.replace(new RegExp(`(^| )${escapeRegex(key)}( |$)`), ' ') : q;
  return rest.split(' ').filter((w) => w && !FILLER.has(w));
}

function followFor(room) {
  const dept = FLOORS[room.level].department;
  return [`What else is on ${f.levelName(room.level)}?`,
    dept ? `Where is the Head of ${dept}?` : 'Where is the Examination Section?'];
}

// `map` tells the interface which level to draw and which rooms to highlight.
// It is null for answers that are not about a place on a board.
function result(answer, kind, followUps = [], level = null, codes = []) {
  const mapLevel = level !== null ? level : (codes.length ? f.byCode.get(codes[0]).level : null);
  return {
    answer,
    kind,
    followUps: followUps.slice(0, 2),
    level,
    map: mapLevel === null ? null : { level: mapLevel, rooms: codes }
  };
}

function byRoomNumber(code, timingOnly) {
  const room = f.byCode.get(code);
  if (room) return result(f.describeRoom(room, { timing: timingOnly }), 'room', followFor(room), room.level, [room.code]);

  const variants = rooms.filter((r) => r.code.length > 3 && r.code.slice(0, 3) === code.slice(0, 3));
  if (variants.length > 0) {
    const level = variants[0].level;
    return result(`Room ${code.slice(0, 3)} is split on ${f.levelName(level)}: ${f.joinList(variants.map(f.roomLabel))}. ${f.howToGetThere(level)}`,
      'room', [`What else is on ${f.levelName(level)}?`], level, variants.map((r) => r.code));
  }

  const level = Number(code[0]);
  const onFloor = f.byLevel.get(level) || [];
  const target = Number(code.slice(0, 3));
  const below = [...onFloor].reverse().find((r) => Number(r.code.slice(0, 3)) < target);
  const above = onFloor.find((r) => Number(r.code.slice(0, 3)) > target);
  const near = f.joinList([below, above].filter(Boolean).map(f.roomLabel));
  return result(`There is no Room ${code} on the ${f.boardName(level)} board; the rooms there run from ${onFloor[0].label} to ${onFloor[onFloor.length - 1].label}. The closest are ${near}. Worth double-checking the number on your timetable.`,
    'unknown-room', [`What is on ${f.levelName(level)}?`], level, [below, above].filter(Boolean).map((r) => r.code));
}

function byPhrase(t) {
  if (t.type === 'basement') {
    const others = BASEMENT_FACILITIES.filter((x) => x !== t.facility).map((x) => `the ${x.name.toLowerCase()}`);
    const note = /library/.test(t.alias)
      ? 'The Library on Level 3 has no café of its own; food in this building is at the canteen. ' : '';
    return result(`${note}The ${t.facility.name.toLowerCase()} is in the basement. Take the stairs down one level from the ground-floor lobby; ${f.joinList(others)} are down there too.`,
      'facility', ['What is on the ground floor?', 'Where is the Library?'], -1);
  }
  const list = t.type === 'shared'
    ? rooms.filter((r) => r.name === t.name)
    : rooms.filter((r) => r.aliases.some((a) => plain(a) === t.alias));
  if (list.length === 0) return null;
  if (list.length === 1) return result(f.describeRoom(list[0]), 'facility', followFor(list[0]), list[0].level, [list[0].code]);
  return result(f.describeMany(list[0].name, list), 'facility', [`What is on ${f.levelName(list[0].level)}?`], null, list.map((r) => r.code));
}

function nearestClassrooms(level, landmark) {
  const list = (f.byLevel.get(level) || []).filter((r) => r.kind === 'classroom');
  if (list.length === 0) return null;
  return result(`The classrooms closest to ${landmark} are on the same floor, ${f.levelName(level)}: ${f.joinList(list.map((r) => r.label))}. ${f.howToGetThere(level)}`,
    'facility', [`What else is on ${f.levelName(level)}?`], level, list.map((r) => r.code));
}

function resolveOne(raw) {
  const q = plain(raw);
  if (!q) return null;

  const wantsLocation = LOCATION.test(q);
  const wantsTiming = TIMING.test(q);
  const timingOnly = wantsTiming && !wantsLocation;
  const isLandmark = LANDMARK.test(q);

  // 1. A room number is the strongest signal there is, unless the room is only
  // a reference point for something else ("the nearest washroom to 402").
  const code = findRoomCode(q);
  if (code && !isLandmark) return byRoomNumber(code, timingOnly);
  if (!code && /\broom\s*[7-9]\d{2}\b/.test(q)) {
    return result('The building only goes up to Level 6, so there is no room in the 700s or above. Room numbers start with their floor: 402 is on Level 4, 612A on Level 6.',
      'unknown-room', ['What is on Level 6?']);
  }
  if (NOT_A_PLACE.test(q)) return null;

  // 2. Heads of department.
  const found = findDepartment(q, raw);
  if (HOD.test(q)) {
    if (found) {
      const { dept } = found;
      return result(f.describeDepartment(dept, { hod: true, who: /\bwho\b/.test(q) }), 'hod',
        [`Where is the ${dept.name} department?`, `What is on ${f.levelName(dept.level)}?`], dept.level, [dept.hod]);
    }
    if (GENERIC_HOD.test(q)) {
      return result(f.describeAllHods(), 'hod', ['Where is the Head of Computer Engineering?', 'Where is the Head of Information Technology?'],
        null, DEPARTMENTS.map((d) => d.hod));
    }
  }

  // 3. Named rooms and facilities.
  const phrase = PHRASES.find((p) => contains(q, p.key));
  if (phrase && !wantsTiming && !ATTRIBUTE.test(residual(q, phrase.key).join(' '))) {
    const rest = residual(q, phrase.key).filter((w) => !LANDMARK_WORDS.has(w));
    if (/\b(nearest|closest) classrooms?\b/.test(q)) {
      const target = byPhrase(phrase.target);
      if (target && target.level !== null && target.level >= 0) return nearestClassrooms(target.level, `the ${phrase.key}`);
    }
    // As a landmark the phrase only answers "what is next to X"; anything
    // else ("bicycle parking near the library") is a different question.
    const answerable = isLandmark ? rest.length === 0 : (wantsLocation || rest.length <= 1);
    if (answerable) {
      const answer = byPhrase(phrase.target);
      if (answer) return answer;
    }
  }
  if (code && isLandmark) return null;

  // 4. Offices the boards do not show, but the Administrative Office handles.
  if (wantsLocation && ADMIN_TOPICS.test(q) && /\b(office|section|desk|counter|cell|apply|get|collect)\b/.test(q)) {
    const topic = q.match(ADMIN_TOPICS)[0];
    return result(`There is no separate ${topic} office on the floor boards; that goes through the Administrative Office, Room 101 on Level 1. ${f.howToGetThere(1)} 101 is the first room on the board, just before 103 (Principal's Office).`,
      'facility', ['Where is the Examination Section?', 'What is on Level 1?'], 1);
  }

  // 5. Departments, only when the department itself is what is being asked about.
  if (found && residual(q, found.key).length <= 1 && (wantsLocation || residual(q, found.key).length === 0 || /\b(department|dept|branch)\b/.test(q))) {
    const { dept } = found;
    return result(f.describeDepartment(dept), 'department',
      [`Where is the Head of ${dept.name}?`, `What is on ${f.levelName(dept.level)}?`], dept.level, [dept.hod]);
  }
  if (/\bcomputer (department|dept|branch)\b/.test(q)) {
    return result('There are two computer departments. Computer Science & Engineering is on Level 4, with its Head in Room 403. Computer Engineering is on Level 5, with its Head in Room 503. Take the lift up; each level\'s directory board faces you as you step out.',
      'department', ['What is on Level 4?', 'What is on Level 5?']);
  }

  // 6. Whole floors.
  const fm = q.match(/\b(ground floor|ground|basement|level ([0-6])|([0-6])(?:st|nd|rd|th)? floor|floor ([0-6]))\b/);
  if (fm && (FLOOR_LIST.test(q) || residual(q, null).length <= 1)) {
    const level = /basement/.test(fm[0]) ? -1 : /ground/.test(fm[0]) ? 0 : Number(fm[2] ?? fm[3] ?? fm[4]);
    return result(f.describeFloor(level), 'floor',
      [level < 6 ? `What is on ${f.levelName(level + 1)}?` : 'Where is the Library?'], level);
  }

  return null;
}

function floorsBetween(from, to) {
  const n = Math.abs(to - from);
  if (n === 0) return `it is on the same floor, ${f.levelName(to)}`;
  const words = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven'];
  return `head ${to > from ? 'up' : 'down'} ${words[n]} floor${n > 1 ? 's' : ''} to ${f.levelName(to)}`;
}

// "From X to Y" and "to Y from X": answer for the destination, and when both
// ends are in the building, say how many floors apart they are.
function resolve(question) {
  const raw = String(question || '');
  const q = plain(raw);
  if (!q) return null;

  let origin = null;
  let destination = null;
  let m = q.match(/\bfrom (.+?) to (.+)$/);
  if (m) { origin = m[1]; destination = m[2]; }
  m = !m && q.match(/\bto (.+?) from (.+)$/);
  if (m) { destination = m[1]; origin = m[2]; }

  if (destination) {
    const dest = resolveOne(`where is ${destination}`);
    if (dest) {
      const orig = resolveOne(`where is ${origin}`);
      if (orig && orig.level !== null && dest.level !== null) {
        const name = origin.replace(/^room /, 'Room ').replace(/^et /, 'ET ').replace(/(\d{3})([abc])\b/, (_, n, l) => n + l.toUpperCase());
        const lead = `From ${name.replace(/(\d{3})([abc])(?![a-z])/, (_, n, l) => n + l.toUpperCase())} on ${f.levelName(orig.level)}, ${floorsBetween(orig.level, dest.level)}.`;
        return { ...dest, answer: `${lead[0].toUpperCase()}${lead.slice(1)} ${dest.answer}` };
      }
      return dest;
    }
    // The destination is something the boards do not cover. Answering the
    // origin instead would be answering the wrong question.
    return null;
  }
  return resolveOne(raw);
}

module.exports = { resolve, plain, directoryText: f.directoryText };
