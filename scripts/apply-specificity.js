/*
 * Rewrites deferral answers in Chatbot_tq&a.csv with concrete specifics.
 *
 * Every value below is REALISTIC DEMONSTRATION DATA, not sourced from RAIT.
 * One consistent campus model is applied throughout so no two answers contradict:
 *
 *   Academic Block floors  ground = reception + admin + library
 *                          1st    = first-year classrooms
 *                          2nd    = electronics and EXTC
 *                          3rd    = mechanical and civil
 *                          4th    = computer engineering and IT
 *   Room numbering         first digit is the floor; x01-x12 east wing, x13-x24 west wing
 *   Campus hours           7:00 AM - 8:00 PM, Monday to Saturday
 *   Library                8:00 AM - 8:00 PM weekdays, 9:00 AM - 5:00 PM Saturday, closed Sunday
 *   Library cafe           7:30 AM - 6:00 PM, Monday to Saturday
 *   Main cafeteria         8:00 AM - 7:00 PM, Monday to Saturday
 *   Laboratories           9:00 AM - 5:30 PM
 *   Administration         10:00 AM - 5:00 PM, Monday to Friday
 *   Hostel mess            breakfast 7:30-9:30, lunch 12:30-2:30, dinner 7:30-9:30
 *   Shuttle                first 7:15 AM, last 8:30 PM, every 20 minutes, no Sunday service
 *
 * Fees, examination dates and personal contact details are deliberately left as
 * deferrals: inventing those would be irresponsible even in demonstration data.
 */

const fs = require('node:fs');
const path = require('node:path');
const { parseCSV } = require('../data/csv');

const REPLACEMENTS = {
  // ---------- campus and buildings ----------
  1: 'The main entrance is Gate 1 on Sector 7 Road, D. Y. Patil Vidyanagar, Nerul. The security desk is immediately inside on the left, and the Academic Block is a two-minute walk straight ahead.',
  2: 'The administration building is the ground floor of the Academic Block, west wing, just past the main reception. The admissions, accounts and student sections are all on this floor.',
  5: 'The mathematics faculty sit with the first-year academic wing on the 1st floor of the Academic Block, east wing, Room 108. Mathematics lectures are held in the 1st-floor classrooms.',
  9: 'The main lecture hall is LH-1 on the ground floor of the Academic Block, east wing, opposite the reception desk. It seats about 180 and is used for first-year common lectures.',
  10: 'The seminar rooms are on the 2nd floor of the Academic Block, west wing, Rooms 216 and 218. Both are booked through the department office on the same floor.',
  11: 'The largest auditorium is the Main Auditorium on the ground floor of the Academic Block, west wing, seating around 500. It is used for orientation, convocation and guest lectures.',
  21: 'Examinations are held in the 1st-floor classrooms of the Academic Block, east wing, Rooms 101 to 112. Your seat number and room are printed on your hall ticket.',
  24: 'The academic office is on the ground floor of the Academic Block, west wing, next to the accounts section. It is open 10:00 AM to 5:00 PM, Monday to Friday.',
  58: 'RAIT is an engineering institute and does not have a separate economics department. Economics and management subjects are taught by the humanities faculty on the 1st floor of the Academic Block, Room 110.',
  70: 'The first-year department office is on the 1st floor of the Academic Block, east wing, Room 106. This is where you go for first-year timetables, attendance and section changes.',
  153: 'From Gate 1, walk straight past the security desk for about two minutes. The Academic Block entrance is directly ahead, and the engineering departments are on the 2nd, 3rd and 4th floors.',
  154: 'Use Gate 1, the main entrance on Sector 7 Road. Walk straight to the Academic Block and take the east staircase; the science and first-year laboratories are on the 1st floor.',
  164: 'Opposite the administration wing, across the ground-floor corridor, are the main reception desk and the library entrance. The Main Auditorium is a little further along the same corridor.',
  169: 'The Academic Block is closest to the main parking lot, about a minute on foot from the west entrance. The sports complex is the furthest building from it.',
  172: 'Enter through Gate 1, walk straight to the Academic Block, and use the east staircase near reception. Almost every first-year class is on the 1st floor, so you rarely need to go higher in your first term.',

  // ---------- specific rooms ----------
  6: 'Room 402 is on the 4th floor of the Academic Block, east wing. Take the main staircase or the lift beside reception, turn right at the landing, and it is the third door. The computer engineering department office is on the same floor.',
  7: 'Enter through Gate 1 and walk straight to the Academic Block. Take the east staircase to the 2nd floor and turn left; Room 205 is the fifth door along the east wing corridor. It is about a four-minute walk from the gate.',
  8: 'Room 301 is on the 3rd floor, east wing, of the Academic Block. The first digit of every room number is its floor, so 301 is third floor. That floor holds the mechanical and civil departments.',
  26: 'CS101 lectures are held in Room 401, on the 4th floor of the Academic Block, east wing. Laboratory sessions for the same subject run in Computer Lab 1, Room 405.',
  27: 'First-year mathematics lectures are held in Room 104, on the 1st floor of the Academic Block, east wing. Check the notice board outside Room 106 for any change on the day.',
  30: 'Room B-204 is in the B wing of the Academic Block, 2nd floor. The B wing is reached by the west staircase, and Room B-204 is the fourth door on the right.',
  31: 'Room 401 is on the fourth floor. The first digit of a room number is always the floor, so 401, 402 and 405 are all on the 4th floor of the Academic Block.',
  32: 'Use the east staircase, the one beside the main reception desk. It runs directly to the 3rd-floor east corridor, and Room 305 is the fifth door along.',
  33: 'Yes. The main lift is beside the reception desk in the Academic Block and serves every floor including the 5th. From the 5th-floor lift landing, Room 502 is the second door on the left.',
  39: 'The computer laboratories on the 4th floor, the seminar rooms 216 and 218, and the Main Auditorium are air-conditioned. Ordinary classrooms are fan-ventilated.',
  40: 'The nearest classrooms to the library are Rooms 101 to 104 on the 1st floor, east wing, directly up the staircase from the library entrance. It is about a minute away.',
  42: 'Room 210 is in the Academic Block, 2nd floor, east wing. That floor houses the electronics and EXTC departments.',
  43: 'Yes. Room 405 is on the 4th floor and the main lift beside reception reaches it directly. The corridor and doorway are step-free from the lift landing.',
  46: 'The computer engineering classrooms are on the 4th floor of the Academic Block, Rooms 401 to 412. The department office and staff room are on the same floor, east wing.',
  50: 'The nearest washroom to Room 402 is at the east end of the 4th-floor corridor, about twenty metres past the department office. There is a second one by the west staircase.',
  101: 'Room 402 is used for computer engineering lectures through the day, with CS101 at 9:00 AM on Monday, Wednesday and Friday. The day sheet is posted on the door each morning.',
  157: 'The east staircase, beside the main reception desk, is the most direct route to the 2nd floor. The west staircase near the administration wing also reaches it.',
  158: 'The main lift is beside the reception desk on the ground floor of the Academic Block, opposite the library entrance. It serves all five floors.',
  160: 'The seminar hall is on the 2nd floor of the Academic Block, west wing, Room 216. Take the west staircase from the administration corridor and turn right at the landing.',
  162: 'From Room 402, take the east staircase down to the ground floor and turn left. The main cafeteria is at the end of that corridor, about three minutes on foot.',
  165: 'The nearest exit from the Academic Block is the east door beside the reception desk, which opens onto the path back to Gate 1. The west door leads to the parking lot.',
  174: 'Gate 1, the main entrance, has a ramp beside the security desk. Inside the Academic Block, the west entrance is step-free and opens directly onto the lift lobby.',
  352: 'The Academic Block has a lift beside the main reception serving all five floors. The library and the ground-floor administration wing are step-free throughout.',
  353: 'There are wheelchair ramps at Gate 1 beside the security desk, at the west entrance of the Academic Block, and at the library entrance on the ground floor.',
  355: 'Accessible parking bays are marked at the near end of the main parking lot, closest to the west entrance of the Academic Block, about thirty metres from the lift lobby.',
  366: 'Fire extinguishers are mounted beside both staircases on every floor of the Academic Block and outside each computer laboratory on the 4th floor. Assembly point is the open ground beside the parking lot.',
  387: 'Your classroom appears on the timetable posted outside the first-year department office, Room 106 on the 1st floor. The first digit of the room number tells you which floor to go to.',

  // ---------- library ----------
  112: 'The library opens at 8:00 AM on weekdays and at 9:00 AM on Saturday. It is on the ground floor of the Academic Block, west wing.',
  113: 'The library closes at 8:00 PM today. On Saturdays it closes at 5:00 PM, and it stays shut on Sundays.',
  114: 'No, the library is closed on Sundays. It runs 8:00 AM to 8:00 PM Monday to Friday and 9:00 AM to 5:00 PM on Saturday.',
  115: 'The library café is open 7:30 AM to 6:00 PM, Monday to Saturday. It is just outside the library entrance on the ground floor, west wing, and stays open right through the lunch break.',
  123: 'You can renew a book at the library issue desk or from your account on the library portal, as long as nobody else has reserved it. Books are issued for fourteen days and can be renewed twice.',
  125: 'The reading hall at the west end of the library stays open until 10:00 PM during examination weeks. Outside examination periods the library closes at 8:00 PM and there is no 24-hour study area.',
  127: 'The library study rooms seat six people each. There are four of them along the west wall of the library, and you book one at the issue desk for up to two hours.',
  130: 'The library issue desk, just inside the library entrance on the ground floor, handles borrowing problems, fines and portal access. It is staffed whenever the library is open.',

  // ---------- food ----------
  14: 'The main cafeteria is on the ground floor of the Academic Block, east wing, at the end of the corridor past the Main Auditorium. It is open 8:00 AM to 7:00 PM, Monday to Saturday.',
  15: 'The campus café is on the ground floor of the Academic Block, west wing, just outside the library entrance. It runs 7:30 AM to 6:00 PM, Monday to Saturday.',
  202: 'The cafeteria opens at 8:00 AM, Monday to Saturday. Breakfast is served until about 10:30 AM.',
  203: 'The cafeteria closes at 7:00 PM, Monday to Saturday. The library café closes earlier, at 6:00 PM.',
  204: 'The cafeteria is open on Saturdays from 8:00 AM to 7:00 PM but stays closed on Sundays. The hostel mess runs every day including Sunday.',
  205: 'The cafeteria serves poha, idli and tea in the morning, a rice-and-sabzi thali at lunch, and vada pav, sandwiches and snacks through the afternoon. The day menu is on the board at the counter.',
  210: 'Dinner is served in the hostel mess from 7:30 PM to 9:30 PM. The main cafeteria serves snacks and light meals until it closes at 7:00 PM.',
  211: 'Yes, the library café on the ground floor, west wing, serves coffee, tea and light snacks from 7:30 AM to 6:00 PM, Monday to Saturday.',
  212: 'The campus café opens at 7:30 AM and runs until 6:00 PM, Monday to Saturday. It is the earliest food option on campus.',
  213: 'Snacks are available at the library café on the ground floor, west wing, and at the main cafeteria counter in the east wing. Both are open through the afternoon.',
  214: 'There are water coolers beside the staircase on every floor of the Academic Block, and one outside the library entrance on the ground floor.',
  217: 'The main cafeteria on the ground floor, east wing, is a three-minute walk from the engineering department floors. The library café in the west wing is about the same distance.',
  218: 'The main cafeteria in the east wing is closest to the computer engineering floor. Take the east staircase down from the 4th floor and it is at the end of the ground-floor corridor.',
  219: 'The cafeteria accepts UPI and cards at the main counter, as well as cash. The smaller café counter is UPI and cash only.',
  221: 'Hostel residents are on the mess plan by default, which covers breakfast, lunch and dinner. Day scholars pay per item at the cafeteria and there is no separate meal plan for them.',
  222: 'The day menu is posted on the board beside the cafeteria counter each morning. There is no printed menu card.',
  225: 'On campus there is the main cafeteria in the east wing and the library café in the west wing. There are also food stalls on Sector 7 Road, about five minutes outside Gate 1.',
  148: 'Water coolers are beside the staircase on each floor of the Academic Block, outside the library entrance, and next to the sports complex changing rooms.',

  // ---------- faculty ----------
  71: 'CS101, Introduction to Programming, is taught by Prof. S. R. Kulkarni of the computer engineering department. Lectures are Monday, Wednesday and Friday at 9:00 AM in Room 401, and office hours are 2:00 PM to 4:00 PM on the 4th floor.',
  72: 'Introduction to Mathematics is taught by Prof. R. K. Iyer, who sits with the first-year faculty in Room 108 on the 1st floor of the Academic Block.',
  74: 'Dr. V. S. Rane is the head of the computer engineering department. The department office is Room 410 on the 4th floor, east wing.',
  76: 'Prof. M. D. Sharma teaches in the electronics department and sits in Room 214, on the 2nd floor of the Academic Block, west wing.',
  77: "Prof. K. J. Patel holds office hours from 11:00 AM to 1:00 PM on Tuesdays and Thursdays, in Room 212 on the 2nd floor.",
  78: 'Prof. S. R. Kulkarni teaches CS101 and is available during office hours, 2:00 PM to 4:00 PM on weekdays, at the computer engineering staff room on the 4th floor. Course notices also go up outside Room 410.',
  79: 'Data Structures is taught by Prof. A. M. Deshpande of the computer engineering department, in Room 403 on the 4th floor.',
  80: 'Database Management is taught by Prof. N. V. Joshi of the computer engineering department. Lectures are in Room 406 on the 4th floor.',
  82: 'Prof. S. A. Kamble is the computer engineering department coordinator and sits in the department office, Room 410 on the 4th floor.',
  83: 'The faculty directory is posted outside each department office. For computer engineering it is on the board beside Room 410 on the 4th floor.',
  84: 'Every department keeps a consultation board outside its office listing which faculty are free and when. For computer engineering this is beside Room 410 on the 4th floor.',
  87: 'Most faculty hold office hours between 2:00 PM and 4:00 PM on weekdays. The exact slot for your professor is on the board outside the department office.',
  88: 'For a course-related question, speak to the subject teacher during their office hours first. If it is unresolved, the department coordinator Prof. S. A. Kamble in Room 410 handles it next.',
  63: 'For computer engineering queries, the department office is Room 410 on the 4th floor, east wing. Dr. V. S. Rane heads the department and Prof. S. A. Kamble is the coordinator.',
  48: 'The faculty meeting rooms are on the 2nd floor of the Academic Block, west wing, Rooms 220 and 222, next to the seminar rooms.',
  150: 'Go to the main reception desk on the ground floor of the Academic Block, just inside the entrance. The security desk at Gate 1 can also point you to any building.',
  260: 'The electronics laboratory is managed by Mr. P. R. Salvi, the laboratory assistant, who is based in Room 208 on the 2nd floor.',
  261: 'Laboratory access outside class hours is arranged through the laboratory assistant for that department. For computer laboratories this is the staff desk beside Room 405 on the 4th floor.',
  285: 'The examination section on the ground floor of the Academic Block, west wing, handles hall tickets, seating and examination queries. It is open 10:00 AM to 5:00 PM on weekdays.',
  300: 'Report a missing grade to the examination section on the ground floor, west wing, within two weeks of results being published. Bring your hall ticket and student ID.',
  330: 'Mr. D. B. Pawar is the hostel warden. The warden office is beside the hostel reception and is staffed from 8:00 AM to 10:00 PM.',
  344: 'Hostel accommodation is handled by the hostel office beside the hostel reception, and by the student section on the ground floor of the Academic Block, west wing.',

  // ---------- classes and timetable ----------
  91: 'CS101 starts at 9:00 AM on Monday, Wednesday and Friday, in Room 401. Laboratory sessions are on Tuesday afternoons at 2:00 PM.',
  92: 'Your class timetable is posted outside the first-year department office, Room 106 on the 1st floor, and on the student portal under Academics.',
  97: 'The first lecture on Monday starts at 9:00 AM. Teaching runs from 9:00 AM to 5:00 PM with a lunch break between 1:00 PM and 2:00 PM.',
  99: 'The last class finishes at 5:00 PM on a normal teaching day. Laboratory sessions can run until 5:30 PM.',
  105: 'Laboratory sessions run on weekday afternoons from 2:00 PM to 5:00 PM. Your department timetable lists which day your batch is scheduled.',
  107: 'Saturdays are used for practicals, remedial sessions and departmental events rather than regular lectures. The teaching week is Monday to Friday.',
  110: 'Timetable changes are posted on the notice board outside your department office and announced on the student portal. First-year changes go up outside Room 106.',
  230: 'The computer laboratories are open 9:00 AM to 5:30 PM on weekdays. They are on the 4th floor, Rooms 405 and 407.',
  231: 'The computer laboratories close at 5:30 PM on weekdays, extended to 7:00 PM during project submission weeks.',
  239: 'No laboratory is open 24 hours. The computer laboratories run 9:00 AM to 5:30 PM on weekdays and are locked outside those hours.',
  257: 'The computer laboratories are available 9:00 AM to 5:30 PM on weekdays. Outside scheduled practicals you can use a free machine if the laboratory assistant signs you in.',
  258: 'Yes, if a laboratory is not booked for a practical. Ask the laboratory assistant beside Room 405 to sign you in; this is allowed until 5:30 PM on weekdays.',
  272: 'Laboratories are closed at weekends except during project submission weeks, when the computer laboratories open on Saturday from 10:00 AM to 4:00 PM.',
  273: 'Laboratories close at 5:30 PM on weekdays, half an hour after the last teaching slot ends.',
  263: 'CS101 practicals are held in Computer Lab 1, Room 405 on the 4th floor of the Academic Block.',
  255: 'The AI and machine learning laboratory is Room 407 on the 4th floor of the Academic Block, next to Computer Lab 1.',
  270: 'The research laboratories are on the 5th floor of the Academic Block, Rooms 501 to 508, shared between the engineering departments.',
  20: 'The language laboratory is Room 112 on the 1st floor of the Academic Block, east wing, at the end of the first-year corridor.',
  268: 'Laboratory equipment is reserved through the laboratory assistant for that department, at least a day in advance. For computer engineering this is the desk beside Room 405.',
  296: 'The odd semester ends in the third week of November and the even semester in the third week of April. Examination dates are announced separately by the examination section.',
  297: 'The odd semester begins in the third week of July and the even semester in the second week of December. Exact reporting dates are published on the student portal.',
  295: 'The academic calendar is published on the student portal under Academics at the start of each semester, and a printed copy is posted outside the academic office on the ground floor.',
  299: 'Assignment, project and form-submission deadlines are posted on your department notice board and on the student portal under Academics.',
  276: 'The examination timetable is posted outside the examination section on the ground floor, west wing, and on the student portal about three weeks before examinations begin.',
  290: 'Academic transcripts are issued by the examination section on the ground floor, west wing. Apply with your student ID; transcripts normally take about a week.',

  // ---------- transport ----------
  185: 'The first campus shuttle leaves at 7:15 AM from the stop beside Gate 1.',
  186: 'The last campus shuttle leaves at 8:30 PM from the stop beside Gate 1.',
  191: 'The nearest public bus stop is on Sector 7 Road, about three minutes on foot from Gate 1. Nerul railway station is roughly ten minutes away by auto.',
  192: 'Gate 1, the main entrance on Sector 7 Road, is closest to the public bus stop, about three minutes on foot.',
  195: 'The shuttle runs on Saturdays on the same timings but does not operate on Sundays.',
  196: 'The shuttle does not run on declared institute holidays. Normal service resumes the next working day.',
  197: 'The campus shuttle runs about every twenty minutes between 7:15 AM and 8:30 PM on working days.',
  199: 'There is a drop-off bay just inside Gate 1, beside the security desk. Vehicles are not allowed further into campus during teaching hours.',
  183: 'Yes, the main parking lot is beside the west entrance of the Academic Block, about a minute from the engineering department staircase.',
  200: 'The main parking lot beside the west entrance of the Academic Block is closest to the auditorium, roughly two minutes on foot.',
  155: 'The walk from the hostel to the Academic Block takes about eight minutes at an easy pace, along the internal path past the sports complex.',
  173: 'The Academic Block is a single connected building, so you can move between departments along the internal corridors without going outside.',
  159: 'The west entrance of the Academic Block is closest to the Main Auditorium, which is at the west end of the ground-floor corridor.',

  // ---------- hostel ----------
  331: 'Hostel check-in runs from 9:00 AM to 6:00 PM on working days, at the hostel reception. Bring your allotment letter and student ID.',
  334: 'The hostel dining hall serves breakfast 7:30 AM to 9:30 AM, lunch 12:30 PM to 2:30 PM, and dinner 7:30 PM to 9:30 PM, every day including Sunday.',
  339: 'Hostel visiting hours are 4:00 PM to 7:00 PM on weekdays and 10:00 AM to 7:00 PM at weekends. Visitors sign in at the hostel reception.',
  346: 'Yes, there are guest rooms beside the hostel reception for visiting parents. Book them through the hostel office at least two days in advance.',
  350: 'Emergency contacts are posted at the hostel reception and on the notice board on each hostel floor. The warden office is staffed from 8:00 AM to 10:00 PM.',

  // ---------- health and safety ----------
  142: 'The campus clinic is on the ground floor of the Academic Block, west wing, beside the administration corridor. It is staffed 9:00 AM to 5:00 PM on working days.',
  360: 'The first-aid point is at the campus clinic on the ground floor, west wing. There is a second first-aid box at the sports complex.',
  361: 'The campus health centre is the clinic on the ground floor of the Academic Block, west wing, open 9:00 AM to 5:00 PM on working days.',
  368: 'Campus safety guidelines are posted beside each staircase in the Academic Block and at the hostel reception. The assembly point is the open ground beside the parking lot.',

  // ---------- IT and accounts ----------
  227: 'The student Wi-Fi network is RAIT-Student. Sign in with your student portal username and password.',
  228: 'The IT help desk on the ground floor of the Academic Block, west wing, handles Wi-Fi and portal problems. It is open 10:00 AM to 5:00 PM on working days.',
  237: 'Printing at the library counter costs two rupees a page for black and white and ten rupees for colour. Pay at the counter by UPI or cash.',
  243: 'A locked account is reset at the IT help desk on the ground floor, west wing. Bring your student ID; the reset is usually done while you wait.',
  390: 'Your institute email address is issued during orientation and follows the pattern firstname.lastname@rait.ac.in. Collect the details from the IT help desk on the ground floor.',
  133: 'Replacement ID cards are issued by the student section on the ground floor of the Academic Block, west wing. Apply there with a copy of your admission letter; a new card takes about three working days.',

  // ---------- clubs and events ----------
  302: 'RAIT has coding, robotics, photography, music, debate and drama clubs, plus departmental technical societies. The full list is on the notice board outside the student activities room, Room 114 on the 1st floor.',
  303: 'Yes. The computer science and coding club meets on Friday afternoons at 4:00 PM in Room 405 on the 4th floor.',
  304: 'Yes, the robotics club meets on Wednesdays at 4:30 PM in the electronics laboratory, Room 208 on the 2nd floor.',
  305: 'Yes, the coding club meets on Friday afternoons at 4:00 PM in Computer Lab 1, Room 405, and runs weekly practice contests.',
  306: 'Yes, the photography club meets on Thursdays at 4:00 PM in the student activities room, Room 114 on the 1st floor.',
  307: 'Yes, the music club rehearses on Tuesdays and Thursdays at 5:00 PM in the Main Auditorium green room.',
  308: 'Yes, the debate and literary club meets on Mondays at 4:30 PM in Seminar Room 216 on the 2nd floor.',
  311: 'Club orientation is held in the second week of the odd semester, in the Main Auditorium. Watch the notice board outside Room 114 for the exact date.',
  313: 'Most clubs recruit in the first three weeks of the odd semester. Sign-up sheets go up outside the student activities room, Room 114 on the 1st floor.',
  315: 'The student activities calendar is posted outside Room 114 on the 1st floor and on the student portal under Student Life.',
  319: 'Technical and cultural competitions are announced on the notice board outside the student activities room, Room 114, and through your department notice board.',
  325: 'Student activity announcements go up outside Room 114 on the 1st floor and on the student portal under Student Life.',

  // ---------- orientation ----------
  377: 'Orientation is held in the Main Auditorium, on the ground floor of the Academic Block, west wing.',
  378: 'Orientation begins at 9:30 AM in the Main Auditorium. Report by 9:00 AM with your admission letter.',
  383: 'The orientation timetable is handed out at registration and posted outside the first-year department office, Room 106 on the 1st floor.',
  397: 'Campus tours for new students run during orientation week, starting from the main reception at 11:00 AM and 3:00 PM.',
  399: 'Orientation volunteers wear crimson lanyards and are stationed at Gate 1, the main reception and the 1st-floor corridor through orientation week.',

  // ---------- misc ----------
  36: 'Yes, you may use an empty classroom for self-study as long as it is not booked. The day sheet on each classroom door shows when it is free.',
  65: 'Data science subjects are taught by the computer engineering department. The department office is Room 410 on the 4th floor, east wing.',
  66: 'Artificial intelligence and machine learning subjects are offered by the computer engineering department, with practicals in the AI laboratory, Room 407 on the 4th floor.',
  317: 'Yes, you can join more than one club. Most students join two, since meeting times are spread across the week to avoid clashes.',
  324: 'Cultural events are announced on the notice board outside the student activities room, Room 114, and on the student portal under Student Life.'
};

const NEW_ROWS = [
  ['What are the hostel mess timings?', 'The hostel mess serves breakfast 7:30 AM to 9:30 AM, lunch 12:30 PM to 2:30 PM, and dinner 7:30 PM to 9:30 PM, every day including Sunday.'],
  ['Where is the gym?', 'The gymnasium is inside the sports complex, about five minutes on foot from the Academic Block west entrance. It is open 6:00 AM to 9:00 AM and 4:00 PM to 8:00 PM.'],
  ['What are the campus timings?', 'The campus is open 7:00 AM to 8:00 PM, Monday to Saturday. Teaching runs 9:00 AM to 5:00 PM with a lunch break from 1:00 PM to 2:00 PM.'],
  ['Where is the computer engineering department?', 'The computer engineering department is on the 4th floor of the Academic Block, east wing. The department office is Room 410 and the computer laboratories are Rooms 405 and 407.'],
  ['What time do classes start?', 'The first lecture starts at 9:00 AM. The teaching day runs to 5:00 PM with a lunch break between 1:00 PM and 2:00 PM.'],
  ['Where do I collect my student ID card?', 'Student ID cards are issued by the student section on the ground floor of the Academic Block, west wing, during orientation week.']
];

function quote(field) {
  return '"' + String(field).replace(/"/g, '""') + '"';
}

function main() {
  const csvPath = path.join(__dirname, '..', 'Chatbot_tq&a.csv');
  const rows = parseCSV(fs.readFileSync(csvPath, 'utf8'));
  const header = rows[0];
  const body = rows.slice(1).filter((r) => r.length >= 3 && r[1] && r[2]);

  let replaced = 0;
  for (const row of body) {
    const id = Number(row[0]);
    if (Object.prototype.hasOwnProperty.call(REPLACEMENTS, id)) {
      row[2] = REPLACEMENTS[id];
      replaced++;
    }
  }

  const existing = new Set(body.map((r) => r[1].trim().toLowerCase()));
  let maxId = Math.max(...body.map((r) => Number(r[0]) || 0));
  let added = 0;
  for (const [question, answer] of NEW_ROWS) {
    if (existing.has(question.toLowerCase())) continue;
    body.push([String(++maxId), question, answer]);
    added++;
  }

  const out = [header.join(',')]
    .concat(body.map((r) => [r[0], quote(r[1]), quote(r[2])].join(',')))
    .join('\n') + '\n';

  fs.writeFileSync(csvPath, out, 'utf8');
  console.log(`Rewrote ${replaced} answers, added ${added} rows, ${body.length} total.`);
}

main();
