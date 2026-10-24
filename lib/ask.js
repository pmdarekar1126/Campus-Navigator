const { route } = require('./retrieval');
const { generate } = require('./answer-service');
const directory = require('./directory');
const smalltalk = require('./smalltalk');

const MAX_QUESTION_LENGTH = 500;
const CONFIDENT_FALLBACK = 0.5;
const EMPTY_PROMPT = 'Type a question about the campus to get started.';

function pickFollowUps(matches, answeredQuestion) {
  return matches
    .map((m) => m.entry.question)
    .filter((q) => q !== answeredQuestion)
    .slice(0, 2);
}

function conversation(category, now) {
  const reply = smalltalk.respond(category, { now });
  return { answer: reply.answer, source: 'conversation', confidence: 1, followUps: reply.followUps };
}

/*
 * Routing, cheapest and most reliable first:
 *   1. conversation that is never about a place (greetings, identity, time)
 *   2. the building directory, transcribed from the floor boards
 *   3. the curated knowledge base
 *   4. out-of-scope questions, answered locally and varied
 *   5. the answer service, grounded in the directory and the closest entries
 *   6. a varied fallback when the service is unreachable
 */
async function ask({ question, index, generateImpl = generate, now = new Date() }) {
  if (typeof question !== 'string' || !question.trim()) {
    return { answer: EMPTY_PROMPT, source: 'invalid', confidence: 0, followUps: [] };
  }
  const trimmed = question.trim();
  if (trimmed.length > MAX_QUESTION_LENGTH) {
    return { answer: `Keep your question under ${MAX_QUESTION_LENGTH} characters.`, source: 'invalid', confidence: 0, followUps: [] };
  }

  const early = smalltalk.classify(trimmed);
  if (early) return conversation(early, now);

  // "Hi, where is room 402" is a location question with manners.
  const query = smalltalk.stripGreeting(trimmed) || trimmed;

  const found = directory.resolve(query);
  if (found) {
    return { answer: found.answer, source: 'directory', confidence: 1, followUps: found.followUps, map: found.map };
  }

  const { mode, matches, confidence } = route(query, index);

  if (mode === 'curated') {
    const top = matches[0].entry;
    return { answer: top.answer, source: 'curated', confidence, followUps: pickFollowUps(matches, top.question) };
  }

  // Study and general-knowledge replies are only safe when nothing on campus
  // matched at all; replies about how the student feels are safe either way.
  const category = smalltalk.classifyOutOfScope(query);
  if (category && (mode === 'open' || smalltalk.PERSONAL.has(category))) {
    return conversation(category, now);
  }

  const generated = await generateImpl({ question: query, matches, mode });
  if (generated.ok) {
    return { answer: generated.text, source: 'generated', confidence, followUps: pickFollowUps(matches, query) };
  }

  // A strong local match is worth giving as-is; the interface already marks it
  // as the closest match rather than an exact one. Otherwise say so honestly,
  // in words that change from one reply to the next.
  const best = matches[0];
  if (best && confidence >= CONFIDENT_FALLBACK) {
    return { answer: best.entry.answer, source: 'fallback', confidence, followUps: pickFollowUps(matches, query) };
  }
  const reply = smalltalk.respond('unknown', { now });
  const followUps = matches.length > 0 ? pickFollowUps(matches, query) : reply.followUps;
  return { answer: reply.answer, source: 'fallback', confidence, followUps };
}

module.exports = { ask, MAX_QUESTION_LENGTH };
