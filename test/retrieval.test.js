const test = require('node:test');
const assert = require('node:assert');
const entries = require('../data/knowledge-base.json');
const { createIndex, search, route, CURATED_THRESHOLD, GROUNDED_THRESHOLD } =
  require('../lib/retrieval');

const index = createIndex(entries);

test('every curated question retrieves its own row when asked verbatim', () => {
  const misses = [];
  for (const entry of entries) {
    const [top] = search(entry.question, index);
    if (!top || top.entry.id !== entry.id) misses.push(entry.question);
  }
  assert.deepStrictEqual(misses, [], `${misses.length} questions failed to self-retrieve`);
});

test('verbatim questions score at or above the curated threshold', () => {
  for (const entry of entries) {
    const { confidence } = route(entry.question, index);
    assert.ok(confidence >= CURATED_THRESHOLD, `${entry.question} scored ${confidence}`);
  }
});

const PARAPHRASES = [
  ['where can I find room 402', 'room 402'],
  ['room 402 location', 'room 402'],
  ['library timings', 'library'],
  ['when does the library open', 'library'],
  ['is there a canteen on campus', 'caf'],
  ['how do I connect to wi-fi', 'wi-fi'],
  ['hostel visitor timings', 'hostel'],
  ['how do I reach the computer department', 'computer'],
  ['sports facilities available', 'sports'],
  ['campus bus schedule', 'bus'],
  ['where is the sports complex', 'sports']
];

test('paraphrases retrieve a topically relevant row', () => {
  for (const [query, expectedSubstring] of PARAPHRASES) {
    const [top] = search(query, index);
    assert.ok(top, `no match at all for "${query}"`);
    const haystack = `${top.entry.question} ${top.entry.answer}`.toLowerCase();
    assert.ok(
      haystack.includes(expectedSubstring.toLowerCase()),
      `"${query}" returned "${top.entry.question}" which lacks "${expectedSubstring}"`
    );
  }
});

const OFF_TOPIC = [
  'who is the prime minister of india',
  'what is the capital of france',
  'write me a poem about the sea',
  'how do I cook pasta',
  'tell me a joke',
  'what is the weather today',
  'how do I invest in stocks',
  'explain quantum physics',
  'who won the cricket match',
  'recommend a good movie'
];

test('off-topic questions fall below the grounded threshold', () => {
  for (const query of OFF_TOPIC) {
    const { confidence } = route(query, index);
    assert.ok(
      confidence < GROUNDED_THRESHOLD,
      `"${query}" scored ${confidence.toFixed(3)}, above ${GROUNDED_THRESHOLD}`
    );
  }
});

test('stopwords-only query returns a finite zero score, never NaN', () => {
  const { confidence, mode } = route('where is the', index);
  assert.ok(Number.isFinite(confidence), `confidence was ${confidence}`);
  assert.strictEqual(confidence, 0);
  assert.strictEqual(mode, 'open');
});

test('non-Latin query degrades gracefully', () => {
  const { confidence, mode, matches } =
    route('रूम कुठे आहे', index);
  assert.ok(Number.isFinite(confidence));
  assert.strictEqual(mode, 'open');
  assert.deepStrictEqual(matches, []);
});

test('empty query returns zero confidence', () => {
  assert.strictEqual(route('', index).confidence, 0);
  assert.strictEqual(route('     ', index).confidence, 0);
});

test('scores are always finite numbers between 0 and 1', () => {
  for (const query of ['???', '402', 'a', 'x'.repeat(500)]) {
    const { confidence } = route(query, index);
    assert.ok(Number.isFinite(confidence) && confidence >= 0 && confidence <= 1,
      `"${query.slice(0, 20)}" produced ${confidence}`);
  }
});
