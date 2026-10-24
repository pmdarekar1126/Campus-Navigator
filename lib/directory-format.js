// Turns building records into sentences. No matching logic lives here.

const { FLOORS, rooms, DEPARTMENTS, RULES } = require('../data/building');

const byCode = new Map(rooms.map((r) => [r.code, r]));
const byLevel = new Map();
for (const room of rooms) {
  if (!byLevel.has(room.level)) byLevel.set(room.level, []);
  byLevel.get(room.level).push(room);
}

function levelName(level) {
  return FLOORS[level].name;
}

function roomLabel(room) {
  return `${room.label} (${room.name})`;
}

function joinList(parts) {
  if (parts.length <= 1) return parts[0] || '';
  return `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`;
}

function floorClause(level) {
  const floor = FLOORS[level];
  if (floor.department) return `the ${floor.department} floor`;
  if (level === 1) return 'the administration floor';
  return floor.short;
}

function neighbours(room) {
  const list = byLevel.get(room.level);
  const i = list.indexOf(room);
  const before = list[i - 1];
  const after = list[i + 1];
  if (before && after) return `between ${roomLabel(before)} and ${roomLabel(after)}`;
  if (after) return `first on the board, just before ${roomLabel(after)}`;
  if (before) return `last on the board, just after ${roomLabel(before)}`;
  return '';
}

function howToGetThere(level) {
  if (level === 0) return 'No stairs needed: it is on the ground floor, so follow the room numbers from the directory board by the lift lobby.';
  if (level <= 2) return `Level ${level} is close, so the main stairs are quickest; the lift works too. The directory board faces the lifts on the landing.`;
  return `Take the lift up to Level ${level}; the stairs work if the lift is busy. The directory board faces you as you step out.`;
}

function withNeighbours(room) {
  const where = neighbours(room);
  return where ? ` ${room.label} sits ${where}.` : '';
}

function describeRoom(room, { timing = false } = {}) {
  let lead;
  if (room.kind === 'hod' && room.person) {
    lead = `${room.person}, the ${room.name}, sits in Room ${room.label} on ${levelName(room.level)}, ${floorClause(room.level)}.`;
  } else if (room.kind === 'hod') {
    lead = `The ${room.name}'s office is Room ${room.label} on ${levelName(room.level)}, ${floorClause(room.level)}.`;
  } else {
    lead = `Room ${room.label} is ${room.kind === 'classroom' ? 'a classroom' : `the ${room.name}`} on ${levelName(room.level)}, ${floorClause(room.level)}.`;
  }
  const extra = timing
    ? ' The floor board does not list class timings; your department timetable, posted near the faculty room on that floor, will have them.'
    : '';
  return `${lead} ${howToGetThere(room.level)}${withNeighbours(room)}${extra}`;
}

const COUNT_WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six'];

function describeMany(name, list) {
  if (list.length === 1) return describeRoom(list[0]);
  const lower = name.toLowerCase();
  const plural = /section$/.test(lower) ? `${lower} rooms` : `${lower}s`;
  const parts = list.map((r) => `${r.label} on ${levelName(r.level)}`);
  const count = COUNT_WORDS[list.length] || String(list.length);
  return `There are ${count} ${plural} in the building: ${joinList(parts)}. Each level's directory board, facing the lifts, points you to the right door.`;
}

function compressCodes(codes) {
  const nums = codes.map(Number).sort((a, b) => a - b);
  const pad = (n) => String(n).padStart(3, '0');
  const out = [];
  let start = nums[0];
  let prev = nums[0];
  for (let i = 1; i <= nums.length; i++) {
    if (nums[i] === prev + 1) { prev = nums[i]; continue; }
    if (start === prev) out.push(pad(start));
    else if (prev === start + 1) out.push(pad(start), pad(prev));
    else out.push(`${pad(start)} to ${pad(prev)}`);
    start = prev = nums[i];
  }
  return out;
}

function describeFloor(level) {
  const floor = FLOORS[level];
  if (level === -1) {
    return `The basement has ${floor.summary}. Take the stairs down one level from the ground-floor lobby.`;
  }
  const list = byLevel.get(level) || [];
  const offices = list.filter((r) => r.kind === 'hod' || r.kind === 'facility');
  const labs = list.filter((r) => r.kind === 'lab');
  const classrooms = list.filter((r) => r.kind === 'classroom');
  const name = levelName(level);
  const parts = [`${name[0].toUpperCase()}${name.slice(1)} holds ${floor.summary}.`];
  if (offices.length) parts.push(`Offices and halls: ${offices.map(roomLabel).join(', ')}.`);
  if (labs.length) parts.push(`Labs: ${labs.map(roomLabel).join(', ')}.`);
  if (classrooms.length) {
    const numeric = classrooms.filter((r) => /^\d{3}$/.test(r.code)).map((r) => r.code);
    const lettered = classrooms.filter((r) => !/^\d{3}$/.test(r.code)).map((r) => r.label);
    const all = [...(numeric.length ? compressCodes(numeric) : []), ...lettered];
    parts.push(`Classrooms: ${joinList(all)}.`);
  }
  return parts.join(' ');
}

function describeDepartment(dept, { hod = false, who = false } = {}) {
  const hodRoom = byCode.get(dept.hod);
  const faculty = (byLevel.get(dept.level) || []).find((r) => r.name === 'Faculty Room');
  if (hod) {
    let lead;
    if (dept.hodName) lead = `The Head of ${dept.name} is ${dept.hodName}, in Room ${hodRoom.label} on ${levelName(dept.level)}.`;
    else if (who) lead = `The floor board does not name the Head of ${dept.name}, but their office is Room ${hodRoom.label} on ${levelName(dept.level)}.`;
    else lead = `The Head of ${dept.name} sits in Room ${hodRoom.label} on ${levelName(dept.level)}.`;
    return `${lead} ${howToGetThere(dept.level)}${withNeighbours(hodRoom)}`;
  }
  const facultyText = faculty ? `, and the faculty room is ${faculty.label}` : '';
  const headText = dept.hodName
    ? `The Head of Department, ${dept.hodName}, sits in Room ${hodRoom.label}`
    : `The Head of Department's office is Room ${hodRoom.label}`;
  return `The ${dept.name} department is on ${levelName(dept.level)}. ${headText}${facultyText}. ${howToGetThere(dept.level)}`;
}

function describeAllHods() {
  const list = DEPARTMENTS.map((d) => `${d.name}${d.hodName ? `, ${d.hodName}` : ''}: Room ${byCode.get(d.hod).label} on Level ${d.level}`);
  return `Each Head of Department sits on their own department's floor. ${list.join('; ')}. Tell me the branch and I will walk you there.`;
}

// The whole building in a compact form, handed to the answer service so a
// generated reply knows where everything is instead of guessing.
function directoryText() {
  const lines = [];
  for (const level of [-1, 0, 1, 2, 3, 4, 5, 6]) {
    const floor = FLOORS[level];
    const head = `${floor.name}${floor.department ? ` (${floor.department} department)` : ''}`;
    const body = level === -1
      ? floor.summary
      : (byLevel.get(level) || []).map((r) => `${r.label} ${r.name}${r.person ? ` (${r.person})` : ''}`).join('; ');
    lines.push(`${head}: ${body}.`);
  }
  lines.push('Every level has its directory board facing the lift lobby. Room numbers start with their level: 402 is on Level 4.');
  lines.push(`Rules: ${RULES.join(' ')}`);
  return lines.join('\n');
}

function boardName(level) {
  return level === 0 ? 'ground floor' : level === -1 ? 'basement' : `Level ${level}`;
}

module.exports = {
  boardName, byCode, byLevel, levelName, roomLabel, joinList, howToGetThere,
  describeRoom, describeMany, describeFloor, describeDepartment, describeAllHods, directoryText
};
