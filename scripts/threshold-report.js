const entries = require('../data/knowledge-base.json');
const { createIndex, route } = require('../lib/retrieval');

const index = createIndex(entries);
const OFF_TOPIC = [
  'who is the prime minister of india',
  'how do I cook pasta',
  'tell me a joke',
  'what is the capital of france',
  'explain quantum physics'
];

const verbatim = entries.map((e) => route(e.question, index).confidence);
const offTopic = OFF_TOPIC.map((q) => route(q, index).confidence);

const min = (a) => Math.min(...a);
const max = (a) => Math.max(...a);

console.log(`verbatim   min=${min(verbatim).toFixed(3)}  max=${max(verbatim).toFixed(3)}  n=${verbatim.length}`);
console.log(`off-topic  min=${min(offTopic).toFixed(3)}  max=${max(offTopic).toFixed(3)}  n=${offTopic.length}`);
console.log(`gap between highest off-topic and lowest verbatim: ${(min(verbatim) - max(offTopic)).toFixed(3)}`);
