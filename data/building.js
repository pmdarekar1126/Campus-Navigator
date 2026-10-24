/*
 * The main building, transcribed from the floor directory boards photographed
 * beside the lifts on each level (0 floor.jpeg ... 6th floor.jpeg), plus the
 * building-wide board on Level 3 for the basement.
 *
 * Room numbers and names below are what the boards say. Two caveats:
 *   - On the ground floor, a plant hides the numbers from 006 to 012. The names
 *     are legible; the numbers marked `inferred` are the most likely reading.
 *   - Stacked ranges such as "504 / 506 Classroom" are read as 504 to 506.
 *
 * Walking directions are not on any board. directory.js builds them from the
 * one thing every photo does show: each level's board faces the lift lobby, so
 * a room is described by its level and its neighbours on that board.
 */

const FLOORS = {
  '-1': {
    name: 'the basement',
    short: 'the basement',
    department: null,
    summary: 'the store, the workshop, the canteen, a classroom and a lab'
  },
  0: {
    name: 'the ground floor (Level 0)',
    short: 'the ground floor',
    department: 'Engineering Sciences',
    summary: 'the Engineering Sciences department, which runs first-year teaching'
  },
  1: {
    name: 'Level 1',
    short: 'Level 1',
    department: null,
    summary: 'the Administrative Office, the Principal\'s Office, the Examination Section, classrooms and labs'
  },
  2: {
    name: 'Level 2',
    short: 'Level 2',
    department: 'Electrical & Instrumentation Engineering',
    summary: 'the Electrical & Instrumentation Engineering department, the Seminar Hall and the Computer Center'
  },
  3: {
    name: 'Level 3',
    short: 'Level 3',
    department: 'Electronics & Telecommunication Engineering',
    summary: 'the Electronics & Telecommunication department and the Library & Information Centre'
  },
  4: {
    name: 'Level 4',
    short: 'Level 4',
    department: 'Computer Science & Engineering',
    summary: 'the Computer Science & Engineering department'
  },
  5: {
    name: 'Level 5',
    short: 'Level 5',
    department: 'Computer Engineering',
    summary: 'the Computer Engineering department and the Training & Placement Cell'
  },
  6: {
    name: 'Level 6',
    short: 'Level 6',
    department: 'Information Technology',
    summary: 'the Information Technology department, both auditoriums and the Girls\' Common Room'
  }
};

// [code, name, aliases, options]
const ROOMS = [
  // Ground floor (Level 0)
  ['001', 'Head of Engineering Sciences', ['hod engineering sciences', 'engineering sciences hod', 'first year hod', 'hod first year']],
  ['002', 'Chemistry Lab', ['chemistry lab', 'chemistry', 'chem lab']],
  ['003', 'Conference Room', []],
  ['004', 'Classroom', []],
  ['005', 'Classroom', []],
  ['006', 'Classroom', [], { inferred: true }],
  ['008', 'Electrical Engineering Lab', ['electrical engineering lab', 'electrical lab', 'bee lab', 'basic electrical lab'], { inferred: true }],
  ['010', 'Process Automation Lab', ['process automation lab', 'process automation', 'automation lab'], { inferred: true }],
  ['011', 'Drawing Hall', ['drawing hall', 'engineering drawing', 'drawing room', 'ed hall'], { inferred: true }],
  ['013', 'Engineering Mechanics Lab', ['mechanics lab', 'engineering mechanics', 'mechanical lab'], { inferred: true }],
  ['014', 'Classroom', []],
  ['015', 'Classroom', []],

  // Level 1
  ['101', 'Administrative Office', ['administrative office', 'admin office', 'administration office', 'administration', 'accounts office', 'fees office', 'fee payment', 'pay fees']],
  ['103', 'Principal\'s Office', ['principal', 'principals office', 'principal office', 'principal cabin']],
  ['104', 'Examination Section', ['examination section', 'exam section', 'exam cell', 'exam office', 'examination office', 'examination cell', 'hall ticket', 'exam department', 'exam branch']],
  ['105', 'Examination Section', ['examination section', 'exam section', 'exam cell', 'exam office', 'examination office', 'examination cell', 'hall ticket', 'exam department', 'exam branch']],
  ['106', 'Conference Room', []],
  ['108', 'IoT Lab', ['iot lab', 'iot', 'internet of things']],
  ['111', 'Cyber Physical Systems Lab', ['cyber physical systems lab', 'cyber physical', 'cps lab']],
  ['112', 'Computational & Embedded Systems Lab', ['computational and embedded systems lab', 'computational lab', 'embedded systems lab']],
  ['113', 'Physics Lab', ['physics lab', 'physics']],
  ['114', 'Classroom', []],
  ['115', 'Classroom', []],
  ['117', 'Computer Lab', []],
  ['119', 'Classroom', []],

  // Level 2
  ['201', '5G Lab', ['5g lab', '5g']],
  ['202', 'Machine Intelligence Lab', ['machine intelligence lab', 'machine intelligence', 'mi lab']],
  ['203', 'Head of Electrical & Instrumentation Engineering', ['hod electrical', 'hod instrumentation', 'electrical hod', 'instrumentation hod']],
  ['204', 'Microprocessor & Signal Processing Lab', ['microprocessor lab', 'signal processing lab', 'microprocessor', 'signal processing', 'dsp lab']],
  ['205', 'VLSI & Embedded Systems Lab', ['vlsi lab', 'vlsi', 'vlsi and embedded systems lab']],
  ['206', 'Seminar Hall', []],
  ['208', 'Machines & Drives Lab', ['machines and drives lab', 'machines lab', 'drives lab', 'electrical machines lab']],
  ['211', 'Smart Grid Lab', ['smart grid lab', 'smart grid']],
  ['212', 'Computer Center', ['computer center', 'computer centre']],
  ['213A', 'Computer Lab', []],
  ['213B', 'Classroom', []],
  ['214', 'Classroom', []],
  ['215', 'Classroom', []],

  // Level 3 — department rooms carry an ET prefix on the board
  ['301', 'Seminar Hall', []],
  ['302', 'Seminar Hall', []],
  ['303', 'Head of Electronics & Telecommunication Engineering', ['hod extc', 'hod entc', 'hod electronics', 'extc hod', 'entc hod', 'electronics hod', 'hod telecommunication'], { prefix: 'ET' }],
  ['304', 'Classroom', [], { prefix: 'ET' }],
  ['305', 'Classroom', [], { prefix: 'ET' }],
  ['306', 'Classroom', [], { prefix: 'ET' }],
  ['308A', 'Advanced Communication Lab', ['advanced communication lab', 'advanced communication'], { prefix: 'ET' }],
  ['308B', 'TV, Video & Antenna Lab', ['antenna lab', 'tv video lab', 'video and antenna lab', 'antenna'], { prefix: 'ET' }],
  ['311A', 'Digital Communication Lab', ['digital communication lab', 'digital communication'], { prefix: 'ET' }],
  ['311B', 'Communication Lab', ['communication lab'], { prefix: 'ET' }],
  ['312', 'Library & Information Centre', ['library', 'central library', 'library and information centre', 'library and information center', 'reading room', 'reading hall', 'borrow books', 'issue books']],
  ['313', 'Stack Room', ['stack room', 'book stacks', 'stacks']],
  ['314', 'Classroom', [], { prefix: 'ET' }],
  ['315', 'Classroom', [], { prefix: 'ET' }],

  // Level 4
  ['401', 'Apple in Education Lab', ['apple lab', 'apple in education lab', 'apple in education', 'mac lab', 'ios lab']],
  ['402', 'Faculty Room', []],
  ['403', 'Head of Computer Science & Engineering', ['hod cse', 'cse hod', 'hod computer science', 'computer science hod']],
  ['404', 'Classroom', []],
  ['405', 'Classroom', []],
  ['406', 'Classroom', []],
  ['408', 'Intel Unnati Lab', ['intel unnati lab', 'intel lab', 'intel unnati', 'unnati lab']],
  ['411', 'Robotics Lab', ['robotics lab', 'robotics', 'robot lab']],
  ['412A', 'Classroom', []],
  ['412B', 'Classroom', []],
  ['412C', 'Faculty Room', []],
  ['413', 'Cloud Computing Lab', ['cloud computing lab', 'cloud computing', 'cloud lab']],
  ['414', 'Classroom', []],
  ['415', 'Classroom', []],

  // Level 5
  ['501', 'Quantum Studio', ['quantum studio', 'quantum lab', 'quantum']],
  ['502', 'Faculty Room', []],
  ['503', 'Head of Computer Engineering', ['hod computer engineering', 'computer engineering hod', 'hod comps', 'comps hod', 'hod ce',
    'amarsinh vidhate', 'amarsinh vidhate sir', 'vidhate sir', 'vidhate', 'vidhate sir cabin', 'vidhate sir office']],
  ['504', 'Classroom', []],
  ['505', 'Classroom', [], { inferred: true }],
  ['506', 'Classroom', []],
  ['508', 'Big Data Analytics Lab', ['big data analytics lab', 'big data lab', 'big data', 'bda lab']],
  ['511', 'Classroom', []],
  ['512', 'Training & Placement Cell', ['training and placement cell', 'training and placement', 'placement cell', 'placement office', 'placements', 'placement', 'tpo', 't and p', 'tnp', 'internship', 'internships', 'recruitment']],
  ['513', 'Data Science Lab', ['data science lab', 'data science', 'ds lab']],
  ['514', 'Classroom', []],
  ['515', 'Classroom', []],
  ['518', 'Network Computing Lab', ['network computing lab', 'network computing', 'networking lab', 'computer networks lab', 'cn lab']],
  ['519', 'Software Engineering Lab', ['software engineering lab', 'software engineering', 'se lab']],
  ['520', 'Data Structures & Algorithms Lab', ['data structures lab', 'data structure lab', 'dsa lab', 'algorithms lab', 'data structures and algorithms lab', 'ds and algo lab']],
  ['521', 'Operating Systems Lab', ['operating systems lab', 'operating system lab', 'os lab']],
  ['522', 'Database Management Systems Lab', ['dbms lab', 'database lab', 'database management systems lab', 'database management system lab'], { sharedName: true }],
  ['523', 'Computer Programming Lab', ['computer programming lab', 'programming lab', 'cp lab']],
  ['524', 'Computer Lab', []],
  ['525', 'Server Room', []],

  // Level 6
  ['601', 'Blockchain Nexus', ['blockchain nexus', 'blockchain lab', 'blockchain']],
  ['602', 'Faculty Room', []],
  ['603', 'Head of Information Technology', ['hod it', 'it hod', 'hod information technology', 'information technology hod',
    'sharad jadhav', 'sharad jadhav sir', 'jadhav sir', 'jadhav sir cabin', 'jadhav sir office']],
  ['604', 'Classroom', []],
  ['605', 'Classroom', [], { inferred: true }],
  ['606', 'Classroom', []],
  ['608', 'Girls\' Common Room', ['girls common room', 'girls room', 'ladies common room', 'common room for girls', 'girls rest room']],
  ['611', 'Auditorium', []],
  ['612A', 'Classroom', []],
  ['612B', 'Classroom', []],
  ['613', 'Cyber Security & Digital Forensics Lab', ['cyber security lab', 'cybersecurity lab', 'cyber security', 'cybersecurity', 'digital forensics', 'forensics lab']],
  ['615', 'Auditorium', []],
  ['616A', 'Database Management Systems Lab', ['dbms lab', 'database lab', 'database management systems lab', 'database management system lab'], { sharedName: true }],
  ['616B', 'Data Mining & Business Intelligence Lab', ['data mining lab', 'data mining', 'business intelligence lab', 'business intelligence', 'dmbi lab']],
  ['617', 'Computer Lab', []],
  ['618', 'Software Testing & Quality Assurance Lab', ['software testing lab', 'software testing', 'quality assurance lab', 'stqa lab', 'testing lab']],
  ['619', 'Computing Lab', ['computing lab']],
  ['620', 'Computer Graphics & VR Lab', ['computer graphics lab', 'graphics lab', 'vr lab', 'virtual reality lab', 'computer graphics', 'virtual reality']],
  ['621', 'Server Room', []],
  ['622', 'Electric Room', ['electric room', 'electrical room']],
  ['623', 'Classroom', []],
  ['624', 'Classroom', [], { inferred: true }],
  ['625', 'Classroom', [], { inferred: true }],
  ['626', 'Classroom', [], { inferred: true }],
  ['627', 'Classroom', [], { inferred: true }],
  ['628', 'Classroom', []]
];

// Names that appear in several rooms. Asking for one lists every instance.
const SHARED_FACILITIES = [
  { name: 'Computer Lab', aliases: ['computer lab', 'computer labs', 'pc lab'] },
  { name: 'Faculty Room', aliases: ['faculty room', 'staff room', 'faculty rooms', 'staffroom', 'teachers room', 'faculty office', 'professors room', 'professor office'] },
  { name: 'Seminar Hall', aliases: ['seminar hall', 'seminar halls', 'seminar room', 'seminar rooms'] },
  { name: 'Auditorium', aliases: ['auditorium', 'auditoriums', 'audi'] },
  { name: 'Conference Room', aliases: ['conference room', 'conference rooms', 'meeting room'] },
  { name: 'Server Room', aliases: ['server room', 'server rooms'] },
  { name: 'Examination Section', aliases: [] },
  { name: 'Database Management Systems Lab', aliases: [] }
];

// Facilities without a room number, from the building-wide board on Level 3.
const BASEMENT_FACILITIES = [
  { name: 'Canteen', aliases: ['library cafe', 'campus cafe', 'coffee', 'tea', 'canteen', 'cafeteria', 'cafe', 'food court', 'where can i eat', 'somewhere to eat', 'place to eat', 'snacks', 'lunch'] },
  { name: 'Workshop', aliases: ['workshop', 'mechanical workshop', 'workshop lab', 'fabrication'] },
  { name: 'Store', aliases: ['store', 'stationery store', 'college store', 'stores'] }
];

const DEPARTMENTS = [
  { name: 'Engineering Sciences', level: 0, hod: '001', aliases: ['engineering sciences', 'engineering science', 'first year', 'fe department', 'applied sciences', 'basic sciences', 'humanities'] },
  { name: 'Electrical & Instrumentation Engineering', level: 2, hod: '203', aliases: ['electrical', 'instrumentation', 'electrical engineering', 'instrumentation engineering', 'electrical and instrumentation'] },
  { name: 'Electronics & Telecommunication Engineering', level: 3, hod: '303', aliases: ['extc', 'entc', 'e and tc', 'etc department', 'electronics and telecommunication', 'electronics and telecom', 'telecommunication', 'telecom', 'electronics'] },
  { name: 'Computer Science & Engineering', level: 4, hod: '403', aliases: ['computer science', 'cse', 'cs', 'computer science and engineering', 'comp sci'] },
  { name: 'Computer Engineering', level: 5, hod: '503', hodName: 'Amarsinh Vidhate Sir', aliases: ['computer engineering', 'ce', 'ce department', 'ce dept', 'comps', 'comp engineering', 'computer engg'] },
  { name: 'Information Technology', level: 6, hod: '603', hodName: 'Sharad Jadhav Sir', aliases: ['information technology', 'it department', 'it dept', 'it branch', 'dept of it', 'department of it'] }
];

// Rules posted on the lobby screens and signage in the photos.
const RULES = [
  'The use of headphones and earphones is prohibited within the college premises; devices seen in use are confiscated.',
  'Students must wear their ID card at all times on campus.',
  'In case of fire, use the stairs. Do not use the lifts.',
  'The campus is a green campus and single-use plastic is discouraged.'
];

function floorOf(code) {
  return Number(code[0]);
}

// Names of Heads of Department, where known, attached to their office.
const PEOPLE = new Map(DEPARTMENTS.filter((d) => d.hodName).map((d) => [d.hod, d.hodName]));

const rooms = ROOMS.map(([code, name, aliases, options = {}]) => ({
  code,
  name,
  aliases,
  person: PEOPLE.get(code) || null,
  level: floorOf(code),
  label: options.prefix ? `${options.prefix} ${code}` : code,
  inferred: Boolean(options.inferred),
  kind: /^head of/i.test(name) ? 'hod'
    : /classroom/i.test(name) ? 'classroom'
      : /lab|studio|nexus|center|centre/i.test(name) ? 'lab'
        : 'facility'
}));

module.exports = { FLOORS, rooms, SHARED_FACILITIES, BASEMENT_FACILITIES, DEPARTMENTS, RULES };
