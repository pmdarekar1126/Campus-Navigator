const test = require('node:test');
const assert = require('node:assert');
const entries = require('../data/knowledge-base.json');
const { createIndex, route } = require('../lib/retrieval');

const index = createIndex(entries);

const HEADLINE = [
  'Where is Room 402?',
  'When is the library café open?',
  'Who teaches CS101?'
];

test('the three questions from the problem statement return concrete answers', () => {
  for (const question of HEADLINE) {
    const { matches, mode } = route(question, index);
    assert.strictEqual(mode, 'curated', `"${question}" did not match a curated row`);
    assert.strictEqual(matches[0].entry.specificity, 'concrete',
      `"${question}" answers with a deferral: ${matches[0].entry.answer}`);
  }
});

test('the headline answers contain an actual specific', () => {
  const [room, cafe, teacher] = HEADLINE.map((q) => route(q, index).matches[0].entry.answer);
  assert.match(room, /Level 4/, 'room answer names no floor');
  assert.match(cafe, /\d{1,2}:\d{2}\s?(AM|PM)/i, 'cafe answer names no time');
  assert.match(teacher, /Room \d{3}/, 'faculty answer points to no real room');
});

test('at least 60 percent of entries are concrete', () => {
  const concrete = entries.filter((e) => e.specificity === 'concrete').length;
  const ratio = concrete / entries.length;
  assert.ok(ratio >= 0.6, `only ${(ratio * 100).toFixed(1)}% concrete`);
});

test('no answer is empty or thinner than 40 characters', () => {
  for (const entry of entries) {
    assert.ok(entry.answer.trim().length >= 40,
      `entry ${entry.id} is too thin: ${entry.answer}`);
  }
});

test('every canteen closing time agrees with the 6:00 PM model', () => {
  const clause = /canteen[^.]*?(\d{1,2}:\d{2}\s?PM)/i;
  let checked = 0;
  for (const entry of entries) {
    const match = entry.answer.match(clause);
    if (!match) continue;
    checked++;
    assert.strictEqual(match[1].toUpperCase().replace(/\s/g, ''), '6:00PM',
      `a canteen clause contradicts the 6:00 PM closing time: ${entry.answer}`);
  }
  assert.ok(checked > 0, 'no canteen clause was checked at all');
});

test('no answer describes the old invented layout', () => {
  const stale = /Academic Block|east wing|west wing|Main Auditorium|LH-1|IT help desk|student section/i;
  const offenders = entries.filter((e) => stale.test(e.answer)).map((e) => `${e.id}: ${e.answer}`);
  assert.deepStrictEqual(offenders, []);
});

test('no answer names a person the floor boards do not name', () => {
  const offenders = entries.filter((e) => /\b(Prof|Dr|Mr|Mrs|Ms)\.\s/.test(e.answer)).map((e) => `${e.id}: ${e.answer}`);
  assert.deepStrictEqual(offenders, []);
});

test('the library is always placed in Room 312 on Level 3', () => {
  for (const entry of entries) {
    const a = entry.answer;
    if (!/\bLibrary\b/.test(a)) continue;
    if (/Library[^.]*?(ground floor|Level [0-24-6]\b|Room (?!312)\d{3})/.test(a)) {
      assert.fail(`entry ${entry.id} misplaces the library: ${a}`);
    }
  }
});

test('every room answer agrees that the first digit is the floor', () => {
  const pattern = /\bRoom (\d)(\d\d)\b[^.]*?(\d)(?:st|nd|rd|th) floor/i;
  for (const entry of entries) {
    const match = entry.answer.match(pattern);
    if (!match) continue;
    assert.strictEqual(match[1], match[3],
      `entry ${entry.id} puts Room ${match[1]}${match[2]} on the ${match[3]} floor: ${entry.answer}`);
  }
});

test('no answer sends a student to an office that is not on any board', () => {
  const phantom = /academic office|student services|IT\/student|help desk|department office|student section/i;
  const offenders = entries
    .filter((e) => phantom.test(e.answer) && !/no separate|do not|does not|not list|not on/i.test(e.answer))
    .map((e) => `${e.id}: ${e.answer}`);
  assert.deepStrictEqual(offenders, []);
});
