const test = require('node:test');
const assert = require('node:assert');
const { resolve, directoryText } = require('../lib/directory');
const { rooms, DEPARTMENTS } = require('../data/building');

const answer = (q) => (resolve(q) || {}).answer || '';

test('every room on every board resolves to its own level and name', () => {
  for (const room of rooms) {
    const text = answer(`where is room ${room.code}`);
    assert.match(text, new RegExp(`\\b${room.label}\\b`), `room ${room.code} not named`);
    const level = room.level === 0 ? 'ground floor' : `Level ${room.level}`;
    assert.ok(text.includes(level), `room ${room.code} not placed on ${level}: ${text}`);
  }
});

test('the three headline questions resolve correctly', () => {
  assert.match(answer('Where is Room 402?'), /Faculty Room on Level 4/);
  assert.match(answer('Where is the library café?'), /no café of its own[\s\S]*basement/);
  assert.match(answer('where is the library'), /Room 312[\s\S]*Level 3/);
});

test('every department resolves to its floor and head of department office', () => {
  for (const dept of DEPARTMENTS) {
    const text = answer(`where is the ${dept.aliases[0]} department`);
    assert.ok(text.includes(`Level ${dept.level}`) || (dept.level === 0 && text.includes('ground floor')),
      `${dept.name} not placed on its level: ${text}`);
  }
  assert.match(answer('who is the HOD of IT'), /603/);
  assert.match(answer('head of computer engineering'), /503/);
});

test('the two computer departments are never confused', () => {
  assert.match(answer('where is the computer science department'), /Level 4/);
  assert.match(answer('where is the computer engineering department'), /Level 5/);
  assert.match(answer('where is the computer department'), /Level 4[\s\S]*Level 5/);
});

test('rooms that share a name list every instance', () => {
  assert.match(answer('where is the computer lab'), /117[\s\S]*213A[\s\S]*524[\s\S]*617/);
  assert.match(answer('where is the auditorium'), /611[\s\S]*615/);
  assert.match(answer('dbms lab'), /522[\s\S]*616A/);
});

test('lettered and prefixed room numbers resolve', () => {
  assert.match(answer('room 213a'), /213A is the Computer Lab/);
  assert.match(answer('ET 308-A'), /ET 308A is the Advanced Communication Lab/);
  assert.match(answer('where is room 213'), /split[\s\S]*213A[\s\S]*213B/);
});

test('rooms that do not exist are named as missing, with the nearest real ones', () => {
  assert.match(answer('room 407'), /no Room 407[\s\S]*406[\s\S]*408/);
  assert.match(answer('room 702'), /only goes up to Level 6/);
});

test('a course code is never mistaken for a room', () => {
  assert.strictEqual(resolve('Who teaches Physics 101?'), null);
  assert.strictEqual(resolve('what is cs101 about'), null);
});

test('journeys between two places count the floors', () => {
  assert.match(answer('How do I get to the cafeteria from Room 402?'), /^From Room 402 on Level 4, head down five floors to the basement/);
  assert.match(answer('How do I get from the library to the CS department?'), /^From the library on Level 3, head up one floor to Level 4/);
});

test('an unknown destination hands off instead of answering the origin', () => {
  assert.strictEqual(resolve('how do I get from the library to the bus stop'), null);
});

test('questions about a property of a place are not answered with its location', () => {
  for (const q of [
    'Where can I find the cafeteria menu?',
    'Is there a bicycle parking area near the library?',
    'Is there a robotics club?',
    'When does the library open?',
    'Is there a computer lab open 24 hours?',
    'Where is the nearest restroom to Room 402?'
  ]) {
    assert.strictEqual(resolve(q), null, `"${q}" should fall through`);
  }
});

test('offices missing from the boards route to the Administrative Office', () => {
  assert.match(answer('Where is the scholarship office?'), /no separate scholarship office[\s\S]*Room 101/);
  assert.match(answer('where do i get a bonafide certificate'), /Room 101/);
});

test('whole-floor questions list the floor', () => {
  assert.match(answer('what is on the 5th floor'), /Training & Placement Cell[\s\S]*Classrooms/);
  assert.match(answer('basement'), /canteen/);
});

test('all-caps questions do not trigger the IT department', () => {
  assert.strictEqual(resolve('IS IT OPEN'), null);
  assert.match(answer('WHERE IS THE LIBRARY'), /312/);
});

test('the prompt directory covers every level', () => {
  const text = directoryText();
  for (const level of ['basement', 'ground floor', 'Level 1', 'Level 2', 'Level 3', 'Level 4', 'Level 5', 'Level 6']) {
    assert.ok(text.includes(level), `directory text is missing ${level}`);
  }
});

test('named heads of department are given by name, and found by name', () => {
  assert.match(answer('who is the HOD of computer engineering'), /Amarsinh Vidhate Sir[\s\S]*503/);
  assert.match(answer('hod ce'), /Amarsinh Vidhate Sir/);
  assert.match(answer('who is the HOD of IT'), /Sharad Jadhav Sir[\s\S]*603/);
  assert.match(answer('where is vidhate sir'), /503[\s\S]*Level 5/);
  assert.match(answer('Where is Sharad Jadhav sir cabin?'), /603[\s\S]*Level 6/);
  assert.match(answer('who is the hod'), /Computer Engineering, Amarsinh Vidhate Sir: Room 503/);
});

test('departments without a known head still do not invent one', () => {
  assert.match(answer('who is the HOD of CSE'), /does not name the Head of Computer Science/);
});
