const test = require('node:test');
const assert = require('node:assert');
const smalltalk = require('../lib/smalltalk');

test('every conversational category is recognised', () => {
  const cases = {
    greeting: ['hi', 'Hello!', 'good morning', 'namaste'],
    thanks: ['thanks', 'thank you so much'],
    bye: ['bye', 'see you'],
    ack: ['ok', 'cool'],
    wellbeing: ['how are you'],
    identity: ['who are you', 'what can you do', 'help'],
    creator: ['who made you', 'are you chatgpt', 'which model are you', 'what api do you use'],
    time: ['what time is it'],
    date: ['what is the date'],
    emergency: ['there is a fire', 'someone is hurt', 'emergency'],
    gibberish: ['asdfgh', 'xkcdqwrt', '???']
  };
  for (const [expected, inputs] of Object.entries(cases)) {
    for (const input of inputs) {
      assert.strictEqual(smalltalk.classify(input), expected, `"${input}" should be ${expected}`);
    }
  }
});

test('out-of-scope categories are recognised', () => {
  const cases = {
    syllabus: ['explain dijkstra algorithm', 'what is the syllabus for dbms', 'write a program to reverse a string', 'what is a stack'],
    general: ['who is the prime minister of india', 'what is the weather today', 'recommend a movie'],
    joke: ['tell me a joke'],
    abuse: ['you are stupid'],
    lost: ['i am lost'],
    feelings: ['i feel so stressed'],
    compliment: ['good bot']
  };
  for (const [expected, inputs] of Object.entries(cases)) {
    for (const input of inputs) {
      assert.strictEqual(smalltalk.classifyOutOfScope(input), expected, `"${input}" should be ${expected}`);
    }
  }
});

test('real campus questions are not swallowed as conversation', () => {
  for (const q of ['where is room 402', 'thanks, where is the library', 'hi where is the canteen', 'where are the fire extinguishers']) {
    assert.strictEqual(smalltalk.classify(q), null, `"${q}" was treated as conversation`);
  }
});

test('a greeting in front of a question is stripped, not answered', () => {
  assert.strictEqual(smalltalk.stripGreeting('Hi, where is room 402?'), 'where is room 402?');
});

test('the same category never repeats back to back', () => {
  let seed = 7;
  smalltalk.resetRotation(() => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; });
  for (const category of ['greeting', 'syllabus', 'general', 'unknown', 'gibberish']) {
    let previous = null;
    const seen = new Set();
    for (let i = 0; i < 25; i++) {
      const { answer } = smalltalk.respond(category);
      assert.notStrictEqual(answer, previous, `${category} repeated: ${answer}`);
      previous = answer;
      seen.add(answer);
    }
    assert.ok(seen.size >= 3, `${category} produced only ${seen.size} distinct replies`);
  }
});

test('out-of-scope replies always end with a real pointer', () => {
  for (let i = 0; i < 20; i++) {
    const { answer, followUps } = smalltalk.respond('syllabus');
    assert.match(answer, /\b(\d{3}|Level \d|department)\b/, `no pointer in: ${answer}`);
    assert.ok(followUps.length === 2 && followUps[0] !== followUps[1]);
  }
});

test('emergency replies always give 112 and the stairs', () => {
  for (let i = 0; i < 6; i++) {
    const { answer } = smalltalk.respond('emergency');
    assert.match(answer, /112/);
    assert.match(answer, /stairs/);
  }
});

test('time and date answer from the clock', () => {
  const now = new Date('2026-09-29T09:05:00Z');
  assert.match(smalltalk.respond('time', { now }).answer, /2:35\s?pm/i);
  assert.match(smalltalk.respond('date', { now }).answer, /Tuesday.*29 September,? 2026/);
});

test('no reply ever names a model or vendor', () => {
  for (const category of ['creator', 'identity', 'greeting']) {
    for (let i = 0; i < 10; i++) {
      const { answer } = smalltalk.respond(category);
      assert.ok(!/gemini|google|openai|gpt|claude|anthropic|llm|language model/i.test(answer), answer);
    }
  }
});
