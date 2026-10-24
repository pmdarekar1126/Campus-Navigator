# Campus Navigator

A chat website that answers hyper-specific campus questions for new students at
Ramrao Adik Institute of Technology, where a room is, when the library café
opens, who teaches a given subject.

Ask it anything about the campus. Questions it has been taught are answered
instantly from a local directory of 411 entries. Anything it has not seen is
passed to an answer service that replies in context.

## Demonstration data

The campus specifics in this project — room locations, opening times, faculty
names — are realistic sample data, not an official record of the college. They
exist to show how the navigator behaves. Confirm anything that matters with the
department office. The interface says so on every screen.

## Requirements

Node 20.6 or newer and Git.

## Get the code

```bash
git clone https://github.com/pmdarekar1126/Campus-Navigator.git
cd Campus-Navigator
```

## Setup

```bash
npm install
```

Copy the example configuration and add your key:

```bash
cp .env.example .env
```

Open `.env` and paste your key after `ASSISTANT_API_KEY=`. The file is
gitignored and is only ever read on the server; it is never sent to the browser.

The app runs without a key. In that state it answers everything in the local
directory and falls back to the closest match for anything else.

## Build the knowledge base

```bash
npm run build
```

Reads `Chatbot_tq&a.csv` and writes `data/knowledge-base.json`. Run this after
any edit to the CSV, which is the editable source of truth.

## Run

```bash
npm start
```

Then open http://localhost:3000.

## Test

```bash
npm test
```

87 tests covering CSV parsing, tokenisation, retrieval scoring, the answer
service, request handling and data quality.

To inspect how well the scoring separates known questions from off-topic ones:

```bash
node scripts/threshold-report.js
```

## How it works

Every question is scored locally against the knowledge base before anything
else happens.

| Confidence | What happens |
| --- | --- |
| 0.72 and above | The curated answer is returned directly — instant, no network |
| 0.30 to 0.72 | The answer service is called, grounded in the closest entries |
| below 0.30 | The answer service is called with campus context only |
| service unreachable | The closest local match, or an honest no-answer |

This ordering matters: the questions a visitor is most likely to ask are in the
knowledge base, so they resolve in milliseconds and keep working even with no
internet connection.

## Project layout

```
Chatbot_tq&a.csv           source of truth for campus answers
server.js                  Express server and API
lib/retrieval.js           scoring, a pure function
lib/answer-service.js      external call, isolated and timeout-guarded
lib/prompt.js              campus profile and answering rules
lib/ask.js                 routing between curated and generated answers
data/build-knowledge-base.js   CSV to JSON
data/synonyms.js           student vocabulary (canteen, wi-fi, timings)
public/                    the website: index.html, styles.css, app.js
test/                      the test suite
scripts/                   threshold report and the data specificity pass
```

## Design

Colours and typography follow the institution's own identity: crimson `#9F1C33`
on warm paper `#FBF3F3`, with Fraunces for display type and Public Sans for the
interface. The layout adapts to phone width, supports full keyboard navigation,
and respects `prefers-reduced-motion` and dark mode.
