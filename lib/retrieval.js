const { tokenize, normalize } = require('../data/build-knowledge-base');

const CURATED_THRESHOLD = 0.72;
// Tuned against measured data, not guessed: off-topic questions top out around
// 0.26, while genuine campus questions whose phrasing differs from the stored
// wording land in the low 0.3s. Sitting at 0.30 sends those the matching
// entries as context while leaving off-topic questions ungrounded.
const GROUNDED_THRESHOLD = 0.30;
const OVERLAP_WEIGHT = 0.8;
const MAX_BONUS = 0.15;
const ROOM_NUMBER = /\b\d{3}\b/g;

// Everything an entry contributes to scoring is derived once here rather than
// recomputed on every query. Normalising 400 questions per keystroke-length
// query dominated the cost of a search before this was precomputed.
function createIndex(entries) {
  const df = new Map();
  for (const entry of entries) {
    for (const term of new Set(entry.keywords)) {
      df.set(term, (df.get(term) || 0) + 1);
    }
  }

  const total = entries.length;
  const idf = new Map();
  for (const [term, count] of df) idf.set(term, Math.log(1 + total / count));
  const defaultIdf = Math.log(1 + total);
  const weightOf = (term) => idf.get(term) ?? defaultIdf;

  const prepared = entries.map((entry) => {
    const terms = new Set(entry.keywords);
    let weight = 0;
    for (const term of terms) weight += weightOf(term);
    return {
      entry: entry,
      terms: terms,
      weight: weight,
      normalizedQuestion: normalize(entry.question),
      numbers: normalize(`${entry.question} ${entry.answer}`).match(ROOM_NUMBER) || []
    };
  });

  return { entries, prepared, idf, defaultIdf, weightOf };
}

function scorePrepared(queryTokens, queryNormalized, queryNumbers, record, index) {
  if (record.normalizedQuestion === queryNormalized) return 1;
  if (queryTokens.size === 0) return 0;

  let matchedWeight = 0;
  let queryWeight = 0;
  for (const term of queryTokens) {
    const weight = index.weightOf(term);
    queryWeight += weight;
    if (record.terms.has(term)) matchedWeight += weight;
  }
  if (queryWeight === 0) return 0;

  const unionWeight = queryWeight + record.weight - matchedWeight;
  if (unionWeight === 0) return 0;

  let bonus = 0;
  if (queryNumbers.length > 0 && queryNumbers.some((n) => record.numbers.includes(n))) {
    bonus = MAX_BONUS;
  }

  return Math.min(1, OVERLAP_WEIGHT * (matchedWeight / unionWeight) + bonus);
}

function search(query, index, limit = 3) {
  const queryNormalized = normalize(query);
  const queryTokens = new Set(tokenize(query));
  const queryNumbers = queryNormalized.match(ROOM_NUMBER) || [];

  const scored = [];
  for (const record of index.prepared) {
    const score = scorePrepared(queryTokens, queryNormalized, queryNumbers, record, index);
    if (score > 0) scored.push({ entry: record.entry, score: score });
  }

  return scored.sort((a, b) => b.score - a.score).slice(0, limit);
}

function route(query, index) {
  const matches = search(query, index);
  const confidence = matches.length > 0 ? matches[0].score : 0;
  let mode = 'open';
  if (confidence >= CURATED_THRESHOLD) mode = 'curated';
  else if (confidence >= GROUNDED_THRESHOLD) mode = 'grounded';
  return { mode, matches, confidence };
}

module.exports = {
  createIndex, search, route,
  CURATED_THRESHOLD, GROUNDED_THRESHOLD
};
