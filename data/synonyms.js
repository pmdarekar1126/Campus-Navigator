const PHRASES = [
  [/\bwi\s*[-\s]?\s*fi\b/gi, 'wifi'],
  [/\bclass\s+room\b/gi, 'classroom'],
  [/\brest\s+room\b/gi, 'washroom'],
  [/\bwash\s+room\b/gi, 'washroom'],
  [/\bhead\s+of\s+(the\s+)?(\w+\s+)?department\b/gi, 'hod'],
  [/\bdepartment\s+head\b/gi, 'hod'],
  [/\bcomputer\s+science\b/gi, 'computer'],
  [/\bfirst\s+year\b/gi, 'firstyear']
];

const TOKENS = new Map(Object.entries({
  canteen: 'cafeteria',
  cafe: 'cafeteria',
  eat: 'cafeteria',
  eating: 'cafeteria',
  hungry: 'cafeteria',
  dine: 'cafeteria',
  dining: 'cafeteria',
  food: 'cafeteria',
  cafes: 'cafeteria',
  cafeterias: 'cafeteria',
  mess: 'mess',
  toilet: 'washroom',
  restroom: 'washroom',
  washrooms: 'washroom',
  lift: 'elevator',
  lifts: 'elevator',
  timings: 'timing',
  timing: 'timing',
  hours: 'timing',
  hrs: 'timing',
  schedule: 'timing',
  schedules: 'timing',
  timetable: 'timing',
  timetables: 'timing',
  teacher: 'faculty',
  teachers: 'faculty',
  teaches: 'faculty',
  teach: 'faculty',
  professor: 'faculty',
  professors: 'faculty',
  prof: 'faculty',
  lecturer: 'faculty',
  hod: 'hod',
  xerox: 'photocopy',
  photocopier: 'photocopy',
  laboratory: 'lab',
  laboratories: 'lab',
  labs: 'lab',
  dept: 'department',
  departments: 'department',
  admin: 'administration',
  rooms: 'room',
  buildings: 'building',
  blocks: 'block',
  floors: 'floor',
  books: 'book',
  buses: 'bus',
  exams: 'exam',
  fees: 'fee',
  hostels: 'hostel',
  clubs: 'club',
  facilities: 'facility',
  sport: 'sports'
}));

function expandPhrases(text) {
  let out = text;
  for (const [pattern, replacement] of PHRASES) out = out.replace(pattern, replacement);
  return out;
}

// Crude singularisation, applied before the synonym map. It does not need to be
// linguistically correct — only consistent, since the same transform runs over
// both the stored questions and the incoming query. "scholarships" and
// "scholarship" must land on one token or they will never match each other.
function stem(token) {
  if (token.length > 3 && token.endsWith('s') && !token.endsWith('ss')) {
    return token.slice(0, -1);
  }
  return token;
}

function canonicalize(token) {
  const stemmed = stem(token);
  return TOKENS.get(stemmed) || TOKENS.get(token) || stemmed;
}

module.exports = { expandPhrases, canonicalize, stem };
