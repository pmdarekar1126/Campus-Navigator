const fs = require('node:fs');
const path = require('node:path');

// Load .env if it is present. Absent is a valid state: the navigator then
// serves curated answers only, which is how it should behave on a first run.
(function loadEnv() {
  const envPath = path.join(__dirname, '.env');
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq < 1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
    if (value && !process.env[key]) process.env[key] = value;
  }
})();

const express = require('express');
const entries = require('./data/knowledge-base.json');
const { createIndex } = require('./lib/retrieval');
const { isConfigured } = require('./lib/answer-service');
const { ask } = require('./lib/ask');

const app = express();
const index = createIndex(entries);
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '16kb' }));
// Revalidate on every load, so a browser never runs an outdated script
// against a newer page after the app is updated.
app.use(express.static(path.join(__dirname, 'public'), {
  setHeaders: (res) => res.setHeader('Cache-Control', 'no-cache')
}));

app.get('/api/health', (req, res) => {
  res.json({ ok: true, entries: entries.length, assisted: isConfigured() });
});

// The building data, for the type-ahead, the room tags and the floor map.
const building = require('./data/building');
const directoryPayload = {
  floors: building.FLOORS,
  rooms: building.rooms.map(({ code, label, name, level, kind, aliases }) => ({ code, label, name, level, kind, aliases })),
  basement: building.BASEMENT_FACILITIES.map((b) => ({ name: b.name, aliases: b.aliases })),
  departments: building.DEPARTMENTS.map(({ name, level, hod, aliases }) => ({ name, level, hod, aliases }))
};

app.get('/api/directory', (req, res) => {
  res.set('Cache-Control', 'public, max-age=300');
  res.json(directoryPayload);
});

app.post('/api/ask', async (req, res) => {
  try {
    res.json(await ask({ question: req.body?.question, index }));
  } catch {
    res.status(500).json({
      answer: 'Something went wrong on my side. Try asking again.',
      source: 'fallback', confidence: 0, followUps: []
    });
  }
});

app.listen(PORT, () => {
  console.log(`Campus navigator running at http://localhost:${PORT}`);
  // The address a phone on the same Wi-Fi can open. It changes from network
  // to network, so it is printed fresh on every start.
  for (const addresses of Object.values(require('node:os').networkInterfaces())) {
    for (const a of addresses || []) {
      if (a.family === 'IPv4' && !a.internal) console.log(`  On your phone (same Wi-Fi): http://${a.address}:${PORT}`);
    }
  }
  console.log(`  ${entries.length} campus entries loaded`);
  if (!isConfigured()) {
    console.log('  Running without an assistant key: curated answers only.');
  }
});
