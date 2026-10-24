/*
 * Recognises conversation that is not a campus lookup and answers it locally:
 * instantly, with no network, and without spending answer-service quota.
 * Replies rotate so the same kind of message never gets the same text twice
 * in a row.
 */

const { POOLS, COMPOSED, SUGGESTIONS } = require('../data/responses');

const GREETING = /^(hi+|hey+|hello+|helo|hiya|hola|namaste|namaskar|yo|sup|wassup|whats up|good (morning|afternoon|evening|day)|greetings)\b[\s,!.?]*/i;

// Checked before any campus lookup: messages that are never about a place.
// Emergency comes first so it can never be shadowed.
const BEFORE = [
  ['emergency', /\b(there is a fire|theres a fire|on fire|fire in the|smoke in|emergency|ambulance|injured|bleeding|accident|fainted|unconscious|heart attack|someone is hurt|earthquake|call the police)\b/],
  ['creator', /\b(who (made|built|created|developed|designed|programmed) you|who is your (creator|developer|maker)|which (model|ai|llm|api)|what (model|ai|llm|api) (are you|is this|do you use)|are you (chatgpt|gpt|gemini|bard|claude|copilot|llama)|powered by|chatgpt|openai|gemini|gpt)\b/],
  ['identity', /\b(who are you|what are you|what can you do|what do you do|your name|what is your name|are you (a )?(bot|robot|human|ai|real)|how does this work|how do i use (you|this))\b|^help$/],
  ['wellbeing', /\b(how are you|how r u|how is it going|hows it going|how do you do)\b/],
  ['time', /^(what time is it|what is the time|whats the time|current time|time now)( now| right now| please)?$/],
  ['date', /^(whats the date|what is the date|todays date|what day is it|what day is today|which day is today)( today| please)?$/]
];

// Checked only after the building and the knowledge base found nothing, so a
// real question wrapped in feelings or frustration still gets its directions.
const AFTER = [
  ['joke', /\b(joke|jokes|make me laugh|something funny)\b/],
  ['compliment', /\b(you are (great|awesome|amazing|good|helpful|smart|cool)|youre (great|awesome|amazing|helpful)|good bot|nice bot|love you|you rock|well done|great job)\b/],
  ['abuse', /\b(fuck|fucking|shit|bitch|bastard|asshole|idiot|stupid|dumb|useless|moron|chutiya|bsdk|shut up|you suck)\b/],
  ['lost', /\b(i am lost|im lost|i got lost|lost my way|where am i|dont know where i am|cant find my way)\b/],
  ['feelings', /\b(stressed|anxious|anxiety|depressed|lonely|scared|nervous|overwhelmed|homesick|panicking)\b/],
  ['syllabus', /\b(syllabus|explain|define|definition|derive|derivation|solve|formula|theorem|algorithm|equation|homework|question paper|pyq|previous year papers?|viva|mcq|write a (program|code)|code for|program (for|to)|difference between|cgpa|sgpa|recursion|compiler|transistor|thermodynamics|integration|differentiation|matrix|what is (an? )?(array|stack|queue|tree|graph|dbms|sql|oop|kernel|thread|diode|voltage|resistance|capacitor))\b/],
  ['general', /\b(prime minister|president|capital of|weather|cricket|football|ipl|movie|movies|song|songs|recipe|cook|cooking|bitcoin|crypto|stock market|share market|politics|election|celebrity|actor|actress|pubg|bgmi|valorant|instagram|youtube|netflix|girlfriend|boyfriend|horoscope|zodiac|poem|essay|translate|planet|universe|history of)\b/]
];

// Replies about the student rather than the campus. They carry no location
// facts, so they are safe even when the question partly matched a stored one.
const PERSONAL = new Set(['joke', 'compliment', 'abuse', 'lost', 'feelings']);

const ACK = /^(ok|okay|k|kk|cool|nice|great|alright|fine|hmm+|got it|sure|oh+|i see|understood|done)$/;
const THANKS = /\b(thanks|thank you|thank u|thankyou|thx|tysm|dhanyavad|shukriya)\b/;
const BYE = /^(bye+|goodbye|good bye|see you|see ya|cya|good night|gn|ttyl|take care)\b/;
const MASH = /(asdf|qwer|zxcv|hjkl|jkjk|sdfg|dfgh|fghj|lkjh)/;

function plain(text) {
  return String(text).toLowerCase().replace(/['’]/g, '').replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

function isGibberish(q) {
  if (!q) return true;
  if (MASH.test(q) || /(.)\1{3,}/.test(q)) return true;
  const words = q.split(' ').filter((w) => /[a-z]/.test(w));
  if (words.length === 0) return !/\d/.test(q);
  return words.every((w) => w.length >= 4 && !/[aeiouy]/.test(w));
}

// ---------- rotation ----------

function makePicker(rng = Math.random) {
  const decks = new Map();
  const last = new Map();

  function shuffle(items) {
    const copy = items.slice();
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  return function pick(key, items) {
    if (items.length === 1) return items[0];
    let deck = decks.get(key);
    if (!deck || deck.length === 0) {
      deck = shuffle(items);
      // Never let a fresh deck open with the item that closed the previous one.
      if (deck[deck.length - 1] === last.get(key)) deck.unshift(deck.pop());
      decks.set(key, deck);
    }
    const item = deck.pop();
    last.set(key, item);
    return item;
  };
}

let pick = makePicker();

function suggestions(count = 2) {
  const out = [];
  let guard = 0;
  while (out.length < count && guard++ < 20) {
    const s = pick(`suggest-${out.length}`, SUGGESTIONS);
    if (!out.includes(s)) out.push(s);
  }
  return out;
}

function clock(now, options) {
  return new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', ...options }).format(now);
}

// ---------- public ----------

function stripGreeting(text) {
  return String(text).replace(GREETING, '').trim();
}

function isOnlyGreeting(text) {
  return GREETING.test(String(text).trim()) && stripGreeting(text).length === 0;
}

function classify(text) {
  const q = plain(text);
  if (isOnlyGreeting(text)) return 'greeting';
  for (const [name, pattern] of BEFORE) if (pattern.test(q)) return name;
  if (ACK.test(q)) return 'ack';
  if (BYE.test(q)) return 'bye';
  // "Thanks, where is the library" is still a question.
  if (THANKS.test(q) && q.split(' ').length <= 6 && !/\b(where|which|how|when|what|who)\b/.test(q)) return 'thanks';
  if (isGibberish(q)) return 'gibberish';
  return null;
}

function classifyOutOfScope(text) {
  const q = plain(text);
  for (const [name, pattern] of AFTER) if (pattern.test(q)) return name;
  return null;
}

function respond(category, { now = new Date() } = {}) {
  if (category === 'time') {
    return { answer: `It's ${clock(now, { hour: 'numeric', minute: '2-digit', hour12: true })} in Navi Mumbai.`, followUps: suggestions() };
  }
  if (category === 'date') {
    return { answer: `It's ${clock(now, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}.`, followUps: suggestions() };
  }
  if (COMPOSED[category]) {
    const { openers, pointers } = COMPOSED[category];
    return { answer: `${pick(`${category}-o`, openers)} ${pick(`${category}-p`, pointers)}`, followUps: suggestions() };
  }
  const pool = POOLS[category];
  if (!pool) return null;
  return { answer: pick(category, pool), followUps: category === 'emergency' ? [] : suggestions() };
}

// Tests swap in a seeded random source so rotation is reproducible.
function resetRotation(rng) {
  pick = makePicker(rng);
}

module.exports = { classify, classifyOutOfScope, respond, stripGreeting, isOnlyGreeting, makePicker, resetRotation, PERSONAL };
