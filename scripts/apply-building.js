/*
 * Rewrites knowledge-base answers so they agree with the floor boards
 * (data/building.js). Safe to re-run: it replaces by id and only appends a new
 * row if that exact question is not already present.
 */

const fs = require('node:fs');
const path = require('node:path');
const { parseCSV } = require('../data/csv');
const partA = require('./building-answers-a');
const { REPLACEMENTS: partB, NEW_ROWS } = require('./building-answers-b');

const REPLACEMENTS = { ...partA, ...partB };
const quote = (field) => '"' + String(field).replace(/"/g, '""') + '"';

function main() {
  const csvPath = path.join(__dirname, '..', 'Chatbot_tq&a.csv');
  const rows = parseCSV(fs.readFileSync(csvPath, 'utf8'));
  const header = rows[0];
  const body = rows.slice(1).filter((r) => r.length >= 3 && r[1] && r[2]);

  let replaced = 0;
  for (const row of body) {
    const answer = REPLACEMENTS[Number(row[0])];
    if (answer) { row[2] = answer; replaced++; }
  }

  const existing = new Set(body.map((r) => r[1].trim().toLowerCase()));
  let nextId = Math.max(...body.map((r) => Number(r[0]) || 0));
  let added = 0;
  for (const [question, answer] of NEW_ROWS) {
    if (existing.has(question.toLowerCase())) continue;
    body.push([String(++nextId), question, answer]);
    added++;
  }

  const out = [header.join(',')]
    .concat(body.map((r) => [r[0], quote(r[1]), quote(r[2])].join(',')))
    .join('\n') + '\n';
  fs.writeFileSync(csvPath, out, 'utf8');
  console.log(`Rewrote ${replaced} answers to match the floor boards, added ${added} rows, ${body.length} total.`);
}

main();
