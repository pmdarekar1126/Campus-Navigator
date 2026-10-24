/*
 * Conversational replies for everything that is not a campus lookup. Each pool
 * rotates without repeating back to back, and the out-of-scope pools combine an
 * opener with a pointer, so the same kind of question reads differently each
 * time while every variant still ends somewhere useful and true.
 *
 * Every pointer names a real room from the floor boards.
 */

const POOLS = {
  greeting: [
    'Hi! I\'m the RAIT campus navigator. Ask me where any room, lab or office is.',
    'Hello! Looking for a room? Give me a number like 402 or a name like the Library.',
    'Hey there. I know every floor of this building, from the basement canteen up to Level 6. Where to?',
    'Namaste! Tell me what you\'re looking for and I\'ll tell you which floor it\'s on.',
    'Hi! New here? Ask me about any room, department or office.'
  ],
  thanks: [
    'Happy to help. Anything else you\'re looking for?',
    'Anytime. Good luck finding it!',
    'You\'re welcome. Ask again whenever you\'re stuck.',
    'Glad that helped.',
    'No problem at all.'
  ],
  bye: [
    'Bye! Good luck with classes.',
    'See you around campus.',
    'Take care, and keep your ID card on you; it\'s compulsory on campus.',
    'Goodbye! Come back whenever you need directions.'
  ],
  ack: [
    'Got it. Anything else you need to find?',
    'Sure. I\'m here if you need directions.',
    'Alright! Ask whenever.',
    'Okay. Tell me a room or office and I\'ll point the way.'
  ],
  wellbeing: [
    'Doing well, thanks for asking. Where are you headed?',
    'All good here, just memorising room numbers. How can I help?',
    'Great, thanks! Need to find something?'
  ],
  identity: [
    'I\'m the RAIT campus navigator. I know every room on every floor, from the basement to Level 6: ask me for directions, a department, an office or what\'s on a floor.',
    'I\'m a guide for this building. Give me a room number, a lab, a department or an office, and I\'ll tell you the floor and what\'s next to it.',
    'Think of me as the directory board that talks back. Ask where something is and I\'ll walk you there.'
  ],
  creator: [
    'I\'m the RAIT campus navigator, built to help students find their way around this building.',
    'I\'m this campus\'s navigator, a guide made for RAIT students. What are you trying to find?',
    'Just the campus navigator. What matters more is where you need to go, so ask away.'
  ],
  joke: [
    'Why did the student bring a ladder to class? It was on Level 6. The lift is quicker, promise.',
    'I tried to find Room 407 once. It still hasn\'t been built.',
    'The Server Room and I have a lot in common: we keep things running and nobody ever visits.',
    'Why do engineers love the canteen? It\'s the only place in the building with no prerequisites.'
  ],
  compliment: [
    'Thank you! That made my day.',
    'That\'s kind of you. Anything else you need to find?',
    'Appreciated! I try to know my floors.'
  ],
  lost: [
    'No stress. Every level has a directory board facing the lifts. Tell me the room you need and I\'ll tell you where to go.',
    'Let\'s sort that out. What room or office are you trying to reach? If you can see a room number near you, its first digit is your floor.',
    'Happens to everyone in week one. Tell me where you need to be, and I\'ll give you the floor and what it\'s next to.'
  ],
  feelings: [
    'That sounds hard, and it\'s completely normal in the first few weeks. Anyone in your department\'s faculty room is there to help; ask me which floor yours is on.',
    'You\'re not the only one feeling that way. Talk to a faculty member you trust, and if you need something urgently, security at the main gate can help.',
    'Take a breath. If there\'s somewhere you need to be, tell me and I\'ll make that part easy.'
  ],
  emergency: [
    'If anyone is in danger, call 112 now. In a fire, use the stairs, not the lifts; the signs on every floor say the same. Security at the main gate can get help to you fast.',
    'Call 112 straight away if someone is hurt or in danger. Use the stairs rather than the lifts, and alert security at the main gate.'
  ],
  abuse: [
    'Let\'s keep it friendly. I\'m still happy to help you find your way.',
    'I\'ll let that one pass. Need directions to anything?',
    'Fair enough if you\'re frustrated. Tell me what you\'re trying to find and I\'ll try again.'
  ],
  gibberish: [
    'I didn\'t quite catch that. Try a room number like 402 or a place like the Library.',
    'Hmm, that one lost me. What are you looking for?',
    'Looks like a typo. Want to try again?',
    'Not sure what that means. Ask me where any room, lab or office is.'
  ]
};

// Two-part replies: an opener that fits the question, then a true pointer.
const COMPOSED = {
  syllabus: {
    openers: [
      'That\'s a study question, and I\'m a campus guide rather than a tutor.',
      'I only know my way around this building, not the syllabus.',
      'Explaining coursework is outside what I do; I stick to rooms, floors and offices.',
      'I\'d probably get that wrong. Coursework isn\'t my thing; the building is.',
      'That one\'s for your faculty, not for a navigator.'
    ],
    pointers: [
      'The Library & Information Centre in Room 312 on Level 3 has the textbooks and reference copies.',
      'Your department\'s faculty room can help: 402 for Computer Science, 502 for Computer Engineering, 602 for IT.',
      'Exam notices and past papers go through the Examination Section, Rooms 104 and 105 on Level 1.',
      'Your Head of Department\'s office is on your department\'s floor. Ask me for yours.'
    ]
  },
  general: {
    openers: [
      'That\'s outside my patch: I only know this campus.',
      'I\'m not the right one for that. I\'m built for finding your way around RAIT.',
      'I\'ll have to pass on that one. Rooms, floors and offices are what I\'m good at.',
      'No idea, honestly. Ask me about anything inside this building and I\'m on it.',
      'That one\'s beyond me. I stick to the building, from the basement to Level 6.'
    ],
    pointers: [
      'Try asking where a room, lab or office is.',
      'Something like "Where is the Training & Placement Cell?" is right up my street.',
      'I can tell you what\'s on any floor, from the basement canteen up to the Level 6 auditoriums.',
      'Give me a room number and I\'ll tell you which floor it\'s on and what\'s next to it.'
    ]
  },
  unknown: {
    openers: [
      'I don\'t have that one on record.',
      'That isn\'t on any of the floor boards I know.',
      'I\'m not sure about that, and I\'d rather not guess.',
      'I can\'t answer that reliably from what I know about the building.'
    ],
    pointers: [
      'The Administrative Office in Room 101 on Level 1 can usually point you the right way.',
      'Security at the main gate will know, and they\'re the first people you meet on the way in.',
      'Your department\'s faculty room is a good bet; ask me which floor yours is on.',
      'Tell me the room or office you\'re after and I\'ll give you the floor and directions.'
    ]
  }
};

// Real questions the navigator answers well, offered as follow-up chips.
const SUGGESTIONS = [
  'Where is the Library?',
  'Where is Room 402?',
  'Which floor is the IT department on?',
  'Where is the Training & Placement Cell?',
  'Where is the canteen?',
  'What is on Level 5?',
  'Where is the Examination Section?',
  'Where is the Robotics Lab?',
  'Who is the HOD of Computer Engineering?',
  'Where is the auditorium?'
];

module.exports = { POOLS, COMPOSED, SUGGESTIONS };
