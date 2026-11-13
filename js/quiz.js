/* =============================================================
   quiz.js
   IT 3203 Web Development Project, Milestone 2
   Logic for quiz.html: start, 10-minute timer, grading,
   results, and reset.
   ============================================================= */


/* ---------- Settings ---------- */

const TIME_LIMIT = 10 * 60;   // quiz length in seconds
const PASS_PERCENT = 70;      // percent needed to pass


/* ---------- Answer key ----------
   type "single": radio buttons. answer is the value of the correct button.
   type "text":   fill in the blank. answer lists every accepted spelling, in lowercase.
   type "multi":  checkboxes. answer lists the values of every correct box.
   The wording of each choice lives in quiz.html, so the key stores values only. */

const QUESTIONS = [
  {
    id: 'q1', type: 'single', answer: 'b',
    explanation: 'The service worker sits between the page and the network and decides whether each request is answered from the cache or the network.'
  },
  {
    id: 'q2', type: 'single', answer: 'a',
    explanation: 'The manifest is a JSON file that gives the browser the app name, icons, colors, and start page.'
  },
  {
    id: 'q3', type: 'single', answer: 'c',
    explanation: 'Cache first checks the cache and goes to the network only if the file is not stored.'
  },
  {
    id: 'q4', type: 'single', answer: 'd',
    explanation: 'The install event is where the worker saves the app shell. Activate removes old caches, and fetch handles each request.'
  },
  {
    id: 'q5', type: 'text', answer: ['https'],
    explanation: 'Service workers run only on secure origins. Localhost is the one exception, so developers can test.'
  },
  {
    id: 'q6', type: 'text', answer: ['fetch'],
    explanation: 'The fetch event fires every time the page requests a file. The worker can answer it from the cache or the network.'
  },
  {
    id: 'q7', type: 'text', answer: ['shell', 'app shell'],
    explanation: 'The app shell is the minimum HTML, CSS, and JavaScript needed to show the interface.'
  },
  {
    id: 'q8', type: 'multi', answer: ['a', 'c'],
    explanation: 'A service worker can answer requests from a cache and receive push messages with permission. It cannot change the page directly and it has no access to the hard drive.'
  },
  {
    id: 'q9', type: 'multi', answer: ['a', 'b', 'd'],
    explanation: 'name, start_url, and theme_color are manifest members. A cache name is set in the service worker code, not in the manifest.'
  },
  {
    id: 'q10', type: 'single', answer: 't',
    explanation: 'Stale while revalidate shows the saved copy at once, then refreshes the cache from the network.'
  }
];


/* ---------- Page elements ---------- */

const form = document.getElementById('quiz-form');
const intro = document.getElementById('quiz-intro');
const results = document.getElementById('results');
const timerBar = document.getElementById('timer-bar');
const timeLeft = document.getElementById('time-left');
const startBtn = document.getElementById('start-btn');


/* ---------- State ---------- */

let startTime = 0;       // when the quiz started, in milliseconds
let timerId = null;      // id of the repeating timer, kept so it can be stopped
let submitted = false;   // true once the quiz has been graded


/* ---------- Timer ---------- */

// Turns a number of seconds into text like 04:32
function formatTime(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return String(minutes).padStart(2, '0') + ':' + String(seconds).padStart(2, '0');
}

// Seconds used so far. Capped at the time limit.
// Comparing clock times (not counting ticks) keeps the timer accurate.
function elapsedSeconds() {
  const used = Math.floor((Date.now() - startTime) / 1000);
  return Math.min(TIME_LIMIT, used);
}

// Runs several times a second: updates the display and ends the quiz at zero
function tick() {
  const remaining = TIME_LIMIT - elapsedSeconds();
  timeLeft.textContent = formatTime(remaining);
  timerBar.classList.toggle('low', remaining <= 60);   // turns red in the last minute
  if (remaining <= 0) {
    submitQuiz(true);
  }
}


/* ---------- Starting the quiz ---------- */

function startQuiz() {
  submitted = false;
  intro.hidden = true;
  results.hidden = true;
  form.hidden = false;
  timerBar.hidden = false;
  startTime = Date.now();
  tick();
  timerId = setInterval(tick, 250);
  form.querySelector('input').focus();
}


/* ---------- Reading and checking answers ---------- */

// Returns what the user entered: a string for "single" and "text", an array for "multi"
function getAnswer(q) {
  if (q.type === 'text') {
    // Not form.elements[q.id]: the fieldset has the same id, so that would match two elements
    return form.querySelector('input[name="' + q.id + '"]').value.trim();
  }
  if (q.type === 'single') {
    const checked = form.querySelector('input[name="' + q.id + '"]:checked');
    return checked ? checked.value : '';
  }
  const boxes = form.querySelectorAll('input[name="' + q.id + '"]:checked');
  return Array.from(boxes).map(box => box.value);
}

function isBlank(answer) {
  return answer === '' || answer.length === 0;
}

// Lowercase, collapse spaces, and drop punctuation at the end, so "HTTPS." matches "https"
function normalize(text) {
  return text.toLowerCase().replace(/\s+/g, ' ').replace(/[.!?,;:]+$/, '').trim();
}

function isCorrect(q, answer) {
  if (q.type === 'single') {
    return answer === q.answer;
  }
  if (q.type === 'text') {
    return q.answer.includes(normalize(answer));
  }
  // "multi" needs exactly the right boxes: no missing ones and no extra ones
  return answer.length === q.answer.length && q.answer.every(value => answer.includes(value));
}


/* ---------- Turning answers into readable text ---------- */

// Finds the wording of a radio button or checkbox by reading its label in the HTML
function optionText(q, value) {
  const input = form.querySelector('input[name="' + q.id + '"][value="' + value + '"]');
  return input.closest('label').textContent.trim();
}

function describe(q, answer) {
  if (isBlank(answer)) {
    return 'No answer';
  }
  if (q.type === 'text') {
    return answer;
  }
  if (q.type === 'single') {
    return optionText(q, answer);
  }
  return answer.map(value => optionText(q, value)).join('; ');
}

function describeCorrect(q) {
  if (q.type === 'text') {
    return q.answer[0];
  }
  return describe(q, q.answer);
}

// The question wording from the page, with each text box shown as a blank line
function questionText(q) {
  const legend = document.querySelector('#' + q.id + ' legend').cloneNode(true);
  legend.querySelectorAll('.q-number').forEach(node => node.remove());
  legend.querySelectorAll('input').forEach(node => node.replaceWith('_____'));
  return legend.textContent.replace(/\s+/g, ' ').trim();
}


/* ---------- Building the results panel ---------- */

// Small helper: creates an element with a class and text.
// textContent (not innerHTML) keeps anything the user typed from being run as code.
function make(tag, className, text) {
  const node = document.createElement(tag);
  if (className) {
    node.className = className;
  }
  if (text !== undefined) {
    node.textContent = text;
  }
  return node;
}

function makeStat(label, value, tone) {
  const item = make('li', 'stat');
  item.append(make('span', 'stat-label', label));
  item.append(make('span', 'stat-value ' + (tone || ''), value));
  return item;
}

function showResults(graded, score, secondsUsed, timedOut) {
  const total = QUESTIONS.length;
  const percent = Math.round((score / total) * 100);
  const passed = percent >= PASS_PERCENT;

  results.replaceChildren();
  results.append(make('h2', '', 'Your results'));

  // Pass or fail banner (green or red) with the total score
  const banner = make('div', 'result-banner ' + (passed ? 'pass' : 'fail'));
  banner.append(make('p', 'result-status', 'Overall result: ' + (passed ? 'PASS' : 'FAIL')));
  banner.append(make('p', 'result-score', 'Total score: ' + score + ' / ' + total + ' (' + percent + '%)'));
  banner.append(make('p', '', 'A score of ' + PASS_PERCENT + '% or higher passes.'));
  results.append(banner);

  if (timedOut) {
    results.append(make('p', 'time-note', 'Time ran out, so the quiz was submitted automatically.'));
  }

  // Summary tiles: correct count, incorrect count, time spent, time limit
  const stats = make('ul', 'result-stats');
  stats.append(makeStat('Correct', String(score), 'good'));
  stats.append(makeStat('Incorrect', String(total - score), total - score > 0 ? 'bad' : ''));
  stats.append(makeStat('Time spent', formatTime(secondsUsed)));
  stats.append(makeStat('Time limit', formatTime(TIME_LIMIT)));
  results.append(stats);

  // Review of every question: result, points, the user's answer, the right answer
  results.append(make('h3', '', 'Question review'));
  const list = make('ol', 'review-list');
  graded.forEach((item, index) => {
    const row = make('li', 'review-item ' + (item.correct ? 'correct' : 'incorrect'));

    const head = make('div', 'review-head');
    head.append(make('span', 'badge', item.correct ? 'Correct' : 'Incorrect'));
    head.append(make('strong', '', 'Question ' + (index + 1)));
    head.append(make('span', 'points', (item.correct ? 1 : 0) + ' / 1 point'));
    row.append(head);

    row.append(make('p', 'review-question', questionText(item.q)));

    const yours = make('p');
    yours.append(make('strong', '', 'Your answer: '));
    yours.append(document.createTextNode(describe(item.q, item.answer)));
    row.append(yours);

    const right = make('p');
    right.append(make('strong', '', 'Correct answer: '));
    right.append(document.createTextNode(describeCorrect(item.q)));
    row.append(right);

    row.append(make('p', 'explanation', item.q.explanation));
    list.append(row);
  });
  results.append(list);

  // Retake button. form.reset() fires the "reset" event, which runs resetQuiz below
  const retake = make('button', 'btn', 'Retake quiz');
  retake.type = 'button';
  retake.addEventListener('click', () => form.reset());
  results.append(retake);

  results.hidden = false;
  results.scrollIntoView({ behavior: 'smooth', block: 'start' });
  results.focus({ preventScroll: true });
}


/* ---------- Submitting ---------- */

function submitQuiz(timedOut) {
  if (submitted) {
    return;   // ignore a second submit, for example when the timer ends as the user clicks
  }
  submitted = true;
  clearInterval(timerId);
  const secondsUsed = elapsedSeconds();

  // Grade every question
  const graded = QUESTIONS.map(q => {
    const answer = getAnswer(q);
    return { q: q, answer: answer, correct: isCorrect(q, answer) };
  });
  const score = graded.filter(item => item.correct).length;

  // Color each question box and lock the inputs so answers cannot change
  graded.forEach(item => {
    document.getElementById(item.q.id).classList.add(item.correct ? 'correct' : 'incorrect');
  });
  form.querySelectorAll('input').forEach(input => { input.disabled = true; });
  form.querySelector('button[type="submit"]').disabled = true;
  timerBar.hidden = true;

  showResults(graded, score, secondsUsed, timedOut);
}


/* ---------- Reset ---------- */

// Runs when the Reset button or the Retake button resets the form.
// The browser clears the inputs itself. This function clears everything else.
function resetQuiz() {
  clearInterval(timerId);
  submitted = false;

  results.hidden = true;
  results.replaceChildren();

  QUESTIONS.forEach(q => {
    document.getElementById(q.id).classList.remove('correct', 'incorrect');
  });
  form.querySelectorAll('input').forEach(input => { input.disabled = false; });
  form.querySelector('button[type="submit"]').disabled = false;

  timerBar.classList.remove('low');
  timeLeft.textContent = formatTime(TIME_LIMIT);
  timerBar.hidden = true;
  form.hidden = true;
  intro.hidden = false;
  intro.scrollIntoView({ behavior: 'smooth', block: 'start' });
}


/* ---------- Event listeners ---------- */

startBtn.addEventListener('click', startQuiz);

form.addEventListener('submit', event => {
  event.preventDefault();   // stay on the page instead of reloading it
  const blanks = QUESTIONS.filter(q => isBlank(getAnswer(q))).length;
  if (blanks > 0) {
    const ok = window.confirm('You left ' + blanks + ' question(s) blank. Submit anyway?');
    if (!ok) {
      return;
    }
  }
  submitQuiz(false);
});

form.addEventListener('reset', resetQuiz);

// Pressing Enter inside a blank should not submit the whole quiz by accident
form.addEventListener('keydown', event => {
  if (event.key === 'Enter' && event.target.type === 'text') {
    event.preventDefault();
  }
});