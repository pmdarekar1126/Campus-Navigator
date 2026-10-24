const test = require('node:test');
const assert = require('node:assert');
const { normalize, tokenize, categorize, classifySpecificity, buildEntries } =
  require('../data/build-knowledge-base');

test('normalize strips punctuation and case', () => {
  assert.strictEqual(normalize('Where is Room 402?'), 'where is room 402');
});

test('normalize folds accents so cafe and cafe-with-accent are one token', () => {
  assert.strictEqual(normalize('library café'), 'library cafe');
  assert.strictEqual(normalize('library café'), normalize('library cafe'));
});

test('tokenize drops stopwords', () => {
  assert.deepStrictEqual(tokenize('Where is Room 402?'), ['room', '402']);
});

test('tokenize returns empty array for stopwords-only input', () => {
  assert.deepStrictEqual(tokenize('where is the'), []);
});

test('tokenize returns empty array for non-Latin input', () => {
  assert.deepStrictEqual(tokenize('रूम कुठे आहे'), []);
});

test('categorize picks timing for opening-hours questions', () => {
  assert.strictEqual(categorize('When does the library open?', ''), 'timing');
});

test('categorize picks location for room questions', () => {
  assert.strictEqual(categorize('Room 402 location', 'It is on the 4th floor.'), 'location');
});

test('classifySpecificity flags deferrals', () => {
  assert.strictEqual(classifySpecificity('Ask reception for the location.'), 'deferral');
  assert.strictEqual(classifySpecificity('Room 402 is on the 4th floor, east wing.'), 'concrete');
});

test('buildEntries skips the header row and assigns numeric ids', () => {
  const csv = 'id,question,answer\n1,"Where is Room 402?","4th floor, east wing."';
  const entries = buildEntries(csv);
  assert.strictEqual(entries.length, 1);
  assert.strictEqual(entries[0].id, 1);
  assert.deepStrictEqual(entries[0].keywords, ['room', '402']);
  assert.strictEqual(entries[0].specificity, 'concrete');
});
