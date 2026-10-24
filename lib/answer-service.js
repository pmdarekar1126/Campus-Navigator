const { buildPrompt } = require('./prompt');

const DEFAULT_TIMEOUT_MS = 9000;
const DEFAULT_RETRIES = 1;
const DEFAULT_RETRY_DELAY_MS = 800;
// A hard ceiling on everything generate() does. Without it a hung endpoint
// costs a full timeout, then a delay, then another full timeout, and the
// browser sits on a thinking indicator for nearly half a minute.
const DEFAULT_TOTAL_BUDGET_MS = 15000;
const RETRYABLE = new Set([408, 429, 500, 502, 503, 504]);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Diagnostics go to the server console only. Credentials are never logged:
// the key lives in the query string, so the URL is never printed either.
function warn(summary, detail) {
  // Node's test runner sets NODE_TEST_CONTEXT, so the tests that deliberately
  // drive failures stay quiet without needing a platform-specific env var in
  // the npm script.
  if (process.env.NODE_ENV === 'test' || process.env.NODE_TEST_CONTEXT) return;
  const trimmed = (detail || '').toString().replace(/\s+/g, ' ').slice(0, 240);
  console.warn(`  [answer service] ${summary}${trimmed ? ' :: ' + trimmed : ''}`);
}

function isConfigured() {
  return Boolean(process.env.ASSISTANT_API_KEY && process.env.ASSISTANT_ENDPOINT);
}

async function requestOnce({ prompt, apiKey, endpoint, fetchImpl, timeoutMs }) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(`${endpoint}?key=${encodeURIComponent(apiKey)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        // The budget has to cover the model's internal reasoning as well as the
        // reply, so a tight cap truncates answers mid-sentence. Keep it roomy
        // and let the prompt's "two to four sentences" rule control length.
        generationConfig: { temperature: 0.4, maxOutputTokens: 2048 }
      }),
      signal: controller.signal
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      warn(`answer service returned ${response.status}`, detail);
      return { ok: false, text: '', status: response.status };
    }
    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (!text) warn('answer service returned no usable text', JSON.stringify(data).slice(0, 300));
    return text ? { ok: true, text } : { ok: false, text: '' };
  } catch (error) {
    warn('answer service request failed', error && error.message);
    return { ok: false, text: '' };
  } finally {
    clearTimeout(timer);
  }
}

async function generate({
  question, matches, mode,
  apiKey = process.env.ASSISTANT_API_KEY,
  endpoint = process.env.ASSISTANT_ENDPOINT,
  fetchImpl = globalThis.fetch,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  retries = DEFAULT_RETRIES,
  retryDelayMs = DEFAULT_RETRY_DELAY_MS,
  totalBudgetMs = DEFAULT_TOTAL_BUDGET_MS
}) {
  if (!apiKey || !endpoint) return { ok: false, text: '' };
  const prompt = buildPrompt({ question, matches, mode });
  const startedAt = Date.now();

  for (let attempt = 0; attempt <= retries; attempt++) {
    const result = await requestOnce({ prompt, apiKey, endpoint, fetchImpl, timeoutMs });
    if (result.ok) return result;
    if (attempt >= retries) break;

    // A bad key, a wrong model or a malformed request will fail identically no
    // matter how often it is repeated. Only wait and retry for the transient
    // ones: rate limiting and upstream overload.
    if (result.status !== undefined && !RETRYABLE.has(result.status)) break;

    // Retry only if another full attempt still fits the budget. This retries a
    // fast failure such as a 429, and declines to retry one that already burned
    // a whole timeout.
    const elapsed = Date.now() - startedAt;
    if (elapsed + retryDelayMs + timeoutMs > totalBudgetMs) break;
    await sleep(retryDelayMs);
  }
  return { ok: false, text: '' };
}

module.exports = { generate, isConfigured };
