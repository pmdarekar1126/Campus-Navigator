const fs = require('node:fs');
const path = require('node:path');
const { parseCSV } = require('./csv');
const { STOPWORDS } = require('./stopwords');
const { expandPhrases, canonicalize } = require('./synonyms');

function normalize(text) {
  return expandPhrases(String(text))
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenize(text) {
  const normalized = normalize(text);
  if (!normalized) return [];
  const seen = new Set();
  const tokens = [];
  for (const raw of normalized.split(' ')) {
    if (!raw || STOPWORDS.has(raw)) continue;
    const token = canonicalize(raw);
    if (STOPWORDS.has(token) || seen.has(token)) continue;
    seen.add(token);
    tokens.push(token);
  }
  return tokens;
}

const CATEGORY_SIGNALS = [
  ['timing', /\b(when|time|timing|timings|hours|open|opens|close|closes|closing|schedule|shift)\b/i],
  ['faculty', /\b(who|teaches|teacher|professor|faculty|hod|head of department|staff)\b/i],
  ['location', /\b(where|located|location|room|block|floor|building|reach|direction|directions)\b/i],
  ['hostel', /\b(hostel|mess|warden|accommodation)\b/i],
  ['transport', /\b(bus|shuttle|parking|train|station|transport)\b/i],
  ['admission', /\b(admission|fee|fees|scholarship|document|enroll)\b/i],
  ['facility', /\b(library|lab|laboratory|canteen|cafe|gym|sports|medical|wifi|atm)\b/i],
  ['academic', /\b(exam|result|syllabus|credit|attendance|semester|subject|course)\b/i]
];

function categorize(question, answer) {
  const text = `${question} ${answer}`;
  for (const [name, pattern] of CATEGORY_SIGNALS) {
    if (pattern.test(text)) return name;
  }
  return 'general';
}

const DEFERRAL = /\b(ask (the )?(reception|security|office|department|staff|nearest)|check (the |with )?(the )?(latest|current|official)|confirm with|confirm the|varies|depends on|contact the|do not assume)\b/i;

function classifySpecificity(answer) {
  return DEFERRAL.test(answer) ? 'deferral' : 'concrete';
}

function buildEntries(csvText) {
  const rows = parseCSV(csvText);
  const seen = new Set();
  return rows
    .slice(1)
    .filter((r) => r.length >= 3 && r[1] && r[2])
    .filter((r) => {
      const key = normalize(r[1]);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map((r, position) => {
      const question = r[1].trim();
      const answer = r[2].trim();
      // A non-numeric id would become NaN here and serialise to null, leaving
      // two rows indistinguishable. Fall back to position so ids stay unique.
      const parsedId = Number(r[0]);
      const id = Number.isFinite(parsedId) ? parsedId : position + 1;
      return {
        id,
        question,
        answer,
        category: categorize(question, answer),
        keywords: tokenize(question),
        specificity: classifySpecificity(answer)
      };
    });
}

// The floor boards are the source of truth for where things are. Any stored
// question the building directory can answer takes its answer from there, so
// the knowledge base can never contradict the photos.
function reconcileWithBuilding(entries) {
  const { resolve } = require('../lib/directory');
  let replaced = 0;
  for (const entry of entries) {
    const found = resolve(entry.question);
    if (found) {
      entry.answer = found.answer;
      entry.specificity = 'concrete';
      entry.from = 'building';
      replaced++;
    }
  }
  return replaced;
}

function main() {
  const csvPath = path.join(__dirname, '..', 'Chatbot_tq&a.csv');
  const outPath = path.join(__dirname, 'knowledge-base.json');
  const entries = buildEntries(fs.readFileSync(csvPath, 'utf8'));
  const fromBuilding = reconcileWithBuilding(entries);
  fs.writeFileSync(outPath, JSON.stringify(entries, null, 2));

  const concrete = entries.filter((e) => e.specificity === 'concrete').length;
  console.log(`Built ${entries.length} entries -> ${outPath}`);
  console.log(`  answered from the floor boards: ${fromBuilding}`);
  console.log(`  concrete: ${concrete}   deferral: ${entries.length - concrete}`);
  const byCategory = {};
  entries.forEach((e) => { byCategory[e.category] = (byCategory[e.category] || 0) + 1; });
  console.log('  categories:', byCategory);
}

if (require.main === module) main();

module.exports = { normalize, tokenize, categorize, classifySpecificity, buildEntries, reconcileWithBuilding };
