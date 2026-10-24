const test = require('node:test');
const assert = require('node:assert');
const { buildPrompt, CAMPUS_PROFILE } = require('../lib/prompt');
const { generate } = require('../lib/answer-service');

const MATCHES = [{
  entry: { question: 'Where is the library?', answer: 'Ground floor, Academic Block.' },
  score: 0.5
}];

test('prompt includes the campus profile and the question', () => {
  const prompt = buildPrompt({ question: 'Where do I print?', matches: [], mode: 'open' });
  assert.ok(prompt.includes(CAMPUS_PROFILE));
  assert.ok(prompt.includes('Where do I print?'));
});

test('grounded prompt includes the matched reference answers', () => {
  const prompt = buildPrompt({ question: 'library location', matches: MATCHES, mode: 'grounded' });
  assert.ok(prompt.includes('Ground floor, Academic Block.'));
});

test('open mode does not leak reference answers', () => {
  const prompt = buildPrompt({ question: 'anything', matches: MATCHES, mode: 'open' });
  assert.ok(!prompt.includes('Ground floor, Academic Block.'));
});

test('prompt never names a model or vendor', () => {
  const prompt = buildPrompt({ question: 'hi', matches: MATCHES, mode: 'grounded' }).toLowerCase();
  for (const word of ['gemini', 'google', 'openai', 'gpt', 'claude', 'anthropic', 'llm']) {
    assert.ok(!prompt.includes(word), `prompt leaked the word "${word}"`);
  }
});

test('generate returns ok:false when no key is configured', async () => {
  const result = await generate({ question: 'x', matches: [], mode: 'open', apiKey: '', endpoint: '' });
  assert.strictEqual(result.ok, false);
});

test('generate returns ok:false on a non-200 response instead of throwing', async () => {
  const fetchImpl = async () => ({ ok: false, status: 500, text: async () => 'boom' });
  const result = await generate({
    question: 'x', matches: [], mode: 'open',
    apiKey: 'k', endpoint: 'https://e', fetchImpl, retries: 0
  });
  assert.strictEqual(result.ok, false);
});

test('generate returns ok:false when the request times out', async () => {
  const fetchImpl = (url, opts) => new Promise((_, reject) => {
    opts.signal.addEventListener('abort', () => reject(new Error('aborted')));
  });
  const result = await generate({
    question: 'x', matches: [], mode: 'open', apiKey: 'k',
    endpoint: 'https://e', fetchImpl, timeoutMs: 20, retries: 0
  });
  assert.strictEqual(result.ok, false);
});

test('generate returns the text on a successful response', async () => {
  const fetchImpl = async () => ({
    ok: true,
    json: async () => ({ candidates: [{ content: { parts: [{ text: '  The library is open.  ' }] } }] })
  });
  const result = await generate({
    question: 'x', matches: [], mode: 'open',
    apiKey: 'k', endpoint: 'https://e', fetchImpl
  });
  assert.strictEqual(result.ok, true);
  assert.strictEqual(result.text, 'The library is open.');
});

test('generate does not put the key in the request body', async () => {
  let capturedBody = '';
  const fetchImpl = async (url, opts) => {
    capturedBody = opts.body;
    return { ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text: 'ok' }] } }] }) };
  };
  await generate({
    question: 'x', matches: [], mode: 'open',
    apiKey: 'super-secret-key', endpoint: 'https://e', fetchImpl
  });
  assert.ok(!capturedBody.includes('super-secret-key'));
});

test('a rate-limited response is retried after a delay', async () => {
  let calls = 0;
  const fetchImpl = async () => {
    calls++;
    if (calls === 1) return { ok: false, status: 429, text: async () => 'rate limited' };
    return { ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text: 'Second try worked.' }] } }] }) };
  };
  const result = await generate({
    question: 'x', matches: [], mode: 'open',
    apiKey: 'k', endpoint: 'https://e', fetchImpl, retries: 1, retryDelayMs: 5
  });
  assert.strictEqual(calls, 2);
  assert.strictEqual(result.ok, true);
  assert.strictEqual(result.text, 'Second try worked.');
});

test('a non-retryable status is not retried', async () => {
  let calls = 0;
  const fetchImpl = async () => {
    calls++;
    return { ok: false, status: 404, text: async () => 'model not found' };
  };
  const result = await generate({
    question: 'x', matches: [], mode: 'open',
    apiKey: 'k', endpoint: 'https://e', fetchImpl, retries: 3, retryDelayMs: 5
  });
  assert.strictEqual(calls, 1, 'a 404 must not be retried');
  assert.strictEqual(result.ok, false);
});

test('a slow failure is not retried, so total time stays bounded', async () => {
  let calls = 0;
  // Each attempt consumes its whole timeout, so a second one would blow the budget.
  const fetchImpl = (url, opts) => new Promise((_, reject) => {
    calls++;
    opts.signal.addEventListener('abort', () => reject(new Error('aborted')));
  });
  const startedAt = Date.now();
  const result = await generate({
    question: 'x', matches: [], mode: 'open', apiKey: 'k', endpoint: 'https://e',
    fetchImpl, timeoutMs: 60, retries: 1, retryDelayMs: 10, totalBudgetMs: 80
  });
  assert.strictEqual(result.ok, false);
  assert.strictEqual(calls, 1, 'a timed-out attempt must not be retried within the budget');
  assert.ok(Date.now() - startedAt < 200, 'generate exceeded its total budget');
});

test('a fast failure still gets its retry inside the budget', async () => {
  let calls = 0;
  const fetchImpl = async () => {
    calls++;
    return { ok: false, status: 503, text: async () => 'overloaded' };
  };
  await generate({
    question: 'x', matches: [], mode: 'open', apiKey: 'k', endpoint: 'https://e',
    fetchImpl, timeoutMs: 60, retries: 1, retryDelayMs: 5, totalBudgetMs: 500
  });
  assert.strictEqual(calls, 2, 'a fast 503 should still be retried');
});
