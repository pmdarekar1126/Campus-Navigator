const test = require('node:test');
const assert = require('node:assert');
const { parseCSV } = require('../data/csv');

test('splits simple rows', () => {
  assert.deepStrictEqual(parseCSV('a,b\n1,2'), [['a', 'b'], ['1', '2']]);
});

test('keeps commas that sit inside quoted fields', () => {
  const rows = parseCSV('id,answer\n1,"Nerul, Navi Mumbai, 400706"');
  assert.strictEqual(rows[1][1], 'Nerul, Navi Mumbai, 400706');
  assert.strictEqual(rows[1].length, 2);
});

test('unescapes doubled quotes', () => {
  const rows = parseCSV('id,q\n1,"She said ""hello"" twice"');
  assert.strictEqual(rows[1][1], 'She said "hello" twice');
});

test('handles CRLF line endings', () => {
  assert.deepStrictEqual(parseCSV('a,b\r\n1,2'), [['a', 'b'], ['1', '2']]);
});

test('handles a newline inside a quoted field', () => {
  const rows = parseCSV('id,q\n1,"line one\nline two"');
  assert.strictEqual(rows.length, 2);
  assert.strictEqual(rows[1][1], 'line one\nline two');
});
