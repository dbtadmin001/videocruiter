/* Mock VidCruiter — a local, one-take video interview trainer.
   No network, no build step. Recordings live in IndexedDB on this machine. */

/* ============================ storage ============================ */

const LS = {
  sets: 'vc.sets',
  sessions: 'vc.sessions',
  scores: 'vc.scores',
  prefs: 'vc.prefs',
  seed: 'vc.seed',
};

const read = (key, fallback) => {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; }
  catch { return fallback; }
};
const write = (key, value) => localStorage.setItem(key, JSON.stringify(value));
const uid = () => (crypto.randomUUID ? crypto.randomUUID()
  : 'id-' + Date.now() + '-' + Math.random().toString(16).slice(2));

/* --- IndexedDB: the video blobs are far too large for localStorage --- */
const DB_NAME = 'vc-recordings';
let dbPromise = null;

function db() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const store = req.result.createObjectStore('clips', { keyPath: 'id' });
      store.createIndex('sessionId', 'sessionId', { unique: false });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

async function idbPut(clip) {
  const conn = await db();
  return new Promise((resolve, reject) => {
    const tx = conn.transaction('clips', 'readwrite');
    tx.objectStore('clips').put(clip);
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
}

async function idbGetBySession(sessionId) {
  const conn = await db();
  return new Promise((resolve, reject) => {
    const req = conn.transaction('clips', 'readonly')
      .objectStore('clips').index('sessionId').getAll(sessionId);
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

async function idbDeleteSession(sessionId) {
  const clips = await idbGetBySession(sessionId);
  const conn = await db();
  return new Promise((resolve, reject) => {
    const tx = conn.transaction('clips', 'readwrite');
    const store = tx.objectStore('clips');
    clips.forEach(c => store.delete(c.id));
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
}

/* ============================ question sets ============================ */

/* Question categories are IAEA's own, from the Agency's pre-screening deck
   ("Examples of Sonru questions that can be asked"). Keeping the six labels
   means a mock run covers the same ground the real screen does. */
const CATEGORIES = [
  'Motivational',
  'Job related generic',
  'Job related technical',
  'Managerial',
  'Scenario',
  'Competency based',
];

/* A full mock at IAEA's stated average: 5-6 questions, one drawn from each
   category. Three of these are the Agency's own example questions, reworded
   only where the sample role differed. */
const SET_MOCK = [
  ['Motivational',
    'Please tell us what motivated you to apply for this position, and explain what specific skills and abilities you possess that make you the best candidate.'],
  ['Job related generic',
    'Tell us briefly about your experience in data engineering. Please specify the different steps you typically follow to take a data product from requirement through to production.'],
  ['Job related technical',
    'Please describe the differences between a data warehouse, a data lake and a lakehouse, and explain how you would decide which is appropriate for an organization consolidating data from many independent operational systems.'],
  ['Competency based',
    'Please tell us of a time when you had exceeded the expectations of an internal client or key stakeholder.'],
  ['Scenario',
    'How would you lead and coordinate the design, implementation and monitoring of a new data platform, and ensure targeted delivery levels are met within the Section?'],
  ['Managerial',
    'Describe a time when you were coordinating a team where a member’s performance or attitude was negatively impacting delivery, and explain how you dealt with it.'],
];

/* Behavioural bank. Each maps to an IAEA core or functional competency and to
   one of the eight story themes, so one prepared story can serve several. */
const SET_COMPETENCY = [
  ['Competency based', 'Please tell us of a time when you had exceeded the expectations of an internal client or key stakeholder.'],
  ['Competency based', 'Give an example of a time when you had to deal with a particularly challenging user or client issue relating to data they depended on.'],
  ['Competency based', 'Describe a situation where you had to explain a complex technical concept to a non-technical stakeholder in order to get a decision made.'],
  ['Competency based', 'Tell us about a time when you failed to meet an important goal or deadline. What contributed to it, and what did you change afterwards?'],
  ['Competency based', 'Describe a situation where you had a disagreement with a colleague over a technical approach. How did you resolve it and preserve the working relationship?'],
  ['Competency based', 'Give an example of a complex problem you encountered that required an innovative solution. How did you measure whether it worked?'],
  ['Competency based', 'Describe a time when you had to learn a new technology quickly because a delivery depended on it.'],
  ['Competency based', 'Describe a period when you had to manage several high-priority pieces of work at once. How did you prioritize, and what would you do differently?'],
  ['Competency based', 'Tell us about a time you identified an improvement to a process or standard that nobody had asked you to fix.'],
  ['Competency based', 'Tell us about a time you shared knowledge or built the capability of colleagues — through documentation, training or mentoring.'],
  ['Competency based', 'Describe a time you were under pressure to deliver a figure or a report that the underlying data did not properly support. How did you handle it?'],
  ['Competency based', 'Tell us about a time you worked with people from very different cultural or professional backgrounds to deliver a shared result.'],
  ['Competency based', 'Describe a time you received critical feedback on your technical work. How did you respond?'],
  ['Competency based', 'Tell us about a time a production data process failed. How did you diagnose it, and what did you change so it would not recur?'],
];

const SET_TECHNICAL = [
  ['Job related generic', 'Tell us briefly about your experience in data engineering. Please specify the different steps you typically follow to take a data product from requirement through to production.'],
  ['Job related generic', 'Tell us about your experience gathering data requirements from stakeholders who are not sure what they need.'],
  ['Job related generic', 'Describe your experience with data governance — metadata, lineage, cataloguing and documentation standards.'],
  ['Job related technical', 'Please describe the differences between a data warehouse, a data lake and a lakehouse, and how you would choose between them.'],
  ['Job related technical', 'Explain the difference between ETL and ELT, and describe the circumstances in which you would choose one over the other.'],
  ['Job related technical', 'Describe the differences between batch and streaming ingestion, and explain how you would decide which a given source warrants.'],
  ['Job related technical', 'How do you build data quality assurance into a pipeline? Describe the specific controls you put in place and what happens when one fails.'],
  ['Job related technical', 'Describe your approach to data modelling. Explain the difference between a normalized and a dimensional model, and when each is appropriate.'],
  ['Job related technical', 'How do you handle schema changes from an upstream system that you do not control?'],
  ['Job related technical', 'Describe how you would design a pipeline to handle sensitive or confidential data, covering access control, anonymization and audit.'],
  ['Job related technical', 'Tell us how you apply software engineering practice — version control, testing, CI/CD, code review — to data pipelines.'],
  ['Job related technical', 'Describe a time you improved the performance or cost of a data process. What was the measurable result?'],
  ['Job related technical', 'How do you monitor pipelines in production, and how do you decide what is worth alerting on?'],
  ['Job related technical', 'Explain how you would reconcile the same business entity arriving from several source systems with conflicting values.'],
  ['Scenario', 'You join and find the existing pipelines are undocumented, and fail most weeks. What would you do in your first ninety days?'],
  ['Scenario', 'A Member State submits its monthly data in a slightly different structure each time. How would you design around that?'],
  ['Scenario', 'A senior stakeholder needs a figure by tomorrow, but you know the underlying data has an unresolved quality problem. What do you do?'],
  ['Scenario', 'You are asked to consolidate reporting across several Sections that each maintain their own spreadsheets and definitions. How would you approach it?'],
];

const SET_MOTIVATION = [
  ['Motivational', 'Please tell us what motivated you to apply for this position, and explain what specific skills and abilities you possess that make you the best candidate.'],
  ['Motivational', 'What challenges are you looking for in this data engineer position?'],
  ['Motivational', 'Why do you want to work for an international organization, and for the IAEA in particular?'],
  ['Motivational', 'What do you understand the IAEA’s mandate to be, and where do you see data engineering contributing to it?'],
  ['Motivational', 'The IAEA’s core values are integrity, professionalism and respect. Tell us about a time your own work demonstrated one of them.'],
  ['Motivational', 'This role would mean working in a multicultural environment in Vienna. What in your background prepares you for that?'],
  ['Motivational', 'Where do you see the biggest opportunity for the Agency to make better use of its data over the next few years?'],
  ['Motivational', 'What questions would you want answered about this role and the team before accepting an offer?'],
];

const DEFAULT_SETS = [
  ['IAEA mock — full run (6 questions, one per category)', SET_MOCK],
  ['IAEA competency & behavioural bank', SET_COMPETENCY],
  ['Core data engineering — technical & scenario', SET_TECHNICAL],
  ['Motivation & IAEA fit', SET_MOTIVATION],
];

/* Questions are stored as {t: text, c: category}. Older sets held bare strings,
   so everything is normalized on read. */
function normalizeQuestion(q) {
  if (q && typeof q === 'object') return { t: String(q.t || ''), c: String(q.c || '') };
  const text = String(q || '');
  const m = text.match(/^\s*\[([^\]]{1,40})\]\s*(.+)$/s);
  return m ? { t: m[2].trim(), c: m[1].trim() } : { t: text.trim(), c: '' };
}

const SEED_VERSION = 2;   // bump when DEFAULT_SETS gains a set worth pushing out

function loadSets() {
  let sets = read(LS.sets, null) || [];
  const seeded = read(LS.seed, 0);

  if (seeded < SEED_VERSION) {
    // Add any default set the user does not already have, by name. Sets they
    // wrote or edited themselves are left untouched.
    const have = new Set(sets.map(s => s.name));
    DEFAULT_SETS.forEach(([name, rows]) => {
      if (have.has(name)) return;
      sets.push({ id: uid(), name, questions: rows.map(([c, t]) => ({ t, c })) });
    });
    write(LS.sets, sets);
    write(LS.seed, SEED_VERSION);
  }

  sets.forEach(s => { s.questions = (s.questions || []).map(normalizeQuestion); });
  return sets;
}

/* ============================ tiny DOM helpers ============================ */

const $ = sel => document.querySelector(sel);
const $$ = sel => Array.from(document.querySelectorAll(sel));
const el = (tag, cls, text) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
};
const mmss = secs => {
  const s = Math.max(0, Math.round(secs));
  return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
};
const fmtDate = ts => new Date(ts).toLocaleString(undefined, {
  dateStyle: 'medium', timeStyle: 'short',
});

/* ============================ navigation ============================ */

let currentScreen = 'home';

function goto(name) {
  if (IV.running && name !== 'interview') return; // guarded by the abort button
  currentScreen = name;
  $$('.screen').forEach(s => s.classList.toggle('active', s.id === 'screen-' + name));
  $$('.nav-btn').forEach(b => b.classList.toggle('active',
    b.dataset.goto === name ||
    (name === 'setup' && b.dataset.goto === 'home') ||
    (name === 'done' && b.dataset.goto === 'review')));
  window.scrollTo(0, 0);

  if (name !== 'setup') teardownSetup();
  if (name === 'setup') initSetup();
  if (name === 'review') renderSessionList();
  if (name === 'questions') renderEditor();
  if (name === 'home') renderHome();
}

$$('[data-goto]').forEach(b => b.addEventListener('click', () => goto(b.dataset.goto)));

/* ============================ home ============================ */

function renderHome() {
  const sets = loadSets();
  const prefs = read(LS.prefs, {});
  const sel = $('#set-select');
  sel.innerHTML = '';
  sets.forEach(s => {
    const o = el('option', null, `${s.name} (${s.questions.length} questions)`);
    o.value = s.id;
    sel.appendChild(o);
  });
  if (prefs.setId && sets.some(s => s.id === prefs.setId)) sel.value = prefs.setId;
  if (prefs.secs) $('#time-select').value = String(prefs.secs);
  if (prefs.mode) $('#mode-select').value = prefs.mode;
  if (prefs.order) $('#order-select').value = prefs.order;
  $('#opt-readaloud').checked = !!prefs.readAloud;
  renderCountOptions();
}

function renderCountOptions() {
  const set = loadSets().find(s => s.id === $('#set-select').value);
  const total = set ? set.questions.length : 0;
  const prefs = read(LS.prefs, {});
  const sel = $('#count-select');
  sel.innerHTML = '';
  const all = el('option', null, `All ${total}`);
  all.value = String(total);
  sel.appendChild(all);
  [3, 5, 6, 8, 10].filter(n => n < total).forEach(n => {
    const o = el('option', null, `First ${n}`);
    o.value = String(n);
    sel.appendChild(o);
  });
  if (prefs.count && Array.from(sel.options).some(o => o.value === String(prefs.count))) {
    sel.value = String(prefs.count);
  }
}

$('#set-select').addEventListener('change', renderCountOptions);

$('#btn-to-setup').addEventListener('click', () => {
  const set = loadSets().find(s => s.id === $('#set-select').value);
  if (!set || !set.questions.length) return alert('That set has no questions in it yet.');

  let questions = set.questions.slice();
  if ($('#order-select').value === 'shuffle') {
    for (let i = questions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [questions[i], questions[j]] = [questions[j], questions[i]];
    }
  }
  const count = parseInt($('#count-select').value, 10) || questions.length;

  pending = {
    setName: set.name,
    setId: set.id,
    questions: questions.slice(0, count),
    secs: parseInt($('#time-select').value, 10),
    mode: $('#mode-select').value,
    readAloud: $('#opt-readaloud').checked,
  };
  write(LS.prefs, {
    setId: set.id, secs: pending.secs, mode: pending.mode,
    order: $('#order-select').value, count, readAloud: pending.readAloud,
  });
  goto('setup');
});

let pending = null;

/* ============================ device setup ============================ */

const SETUP = { stream: null, audioCtx: null, raf: null, sawAudio: false, busy: false };

async function initSetup() {
  hideSetupError();
  if (SETUP.stream && SETUP.stream.getVideoTracks().some(t => t.readyState === 'live')) {
    // Already holding a good stream (e.g. returning from Home) -- reuse it.
    $('#setup-video').srcObject = SETUP.stream;
    startMeter(SETUP.stream);
    refreshStartButton();
    return;
  }
  await openStream();
}

/* One combined request. Only ever called when we hold no live stream, so we can
   never collide with ourselves over a device the OS has not released yet. */
async function openStream() {
  if (SETUP.busy) return;
  SETUP.busy = true;
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: true,
    });
    adoptStream(stream);
    await listDevices();
    hideSetupError();
  } catch (err) {
    showSetupError(err);
  } finally {
    SETUP.busy = false;
  }
}

function adoptStream(stream) {
  SETUP.stream = stream;
  $('#setup-video').srcObject = stream;
  markCheck('#chk-video', true);
  startMeter(stream);
  watchTracks(stream);
  refreshStartButton();
}

/* If Windows hands the camera to another app (Teams, Zoom, the Camera app) the
   track just ends. Say so plainly instead of showing a frozen frame. */
function watchTracks(stream) {
  stream.getTracks().forEach(track => {
    track.onended = () => {
      if (IV.running) return;
      markCheck('#chk-video', false);
      $('#btn-start').disabled = true;
      showSetupError({
        name: 'TrackEnded',
        message: `Your ${track.kind === 'video' ? 'camera' : 'microphone'} was disconnected, ` +
          'usually because another application took it over. Close that app, then use Retry.',
      });
    };
  });
}

/* Swap a single track in place. The device we already hold is never re-requested,
   and the surviving stream object stays the same, so the preview never drops. */
async function switchDevice(kind, deviceId) {
  if (!SETUP.stream || SETUP.busy || !deviceId) return;
  SETUP.busy = true;
  try {
    const constraints = kind === 'video'
      ? { video: { deviceId: { ideal: deviceId } } }
      : { audio: { deviceId: { ideal: deviceId } } };
    const temp = await navigator.mediaDevices.getUserMedia(constraints);
    const fresh = temp.getTracks().find(t => t.kind === kind);
    if (!fresh) throw new Error('That device returned no ' + kind + ' track.');

    SETUP.stream.getTracks().filter(t => t.kind === kind).forEach(old => {
      SETUP.stream.removeTrack(old);
      old.stop();
    });
    SETUP.stream.addTrack(fresh);
    watchTracks(SETUP.stream);

    if (kind === 'video') {
      $('#setup-video').srcObject = SETUP.stream;
      markCheck('#chk-video', true);
    } else {
      startMeter(SETUP.stream);   // the analyser is bound to the old track
    }
    hideSetupError();
    refreshStartButton();
  } catch (err) {
    // The previous device is untouched and still live -- this is not fatal.
    showSetupError(err, true);
    await listDevices();          // put the dropdown back on what is actually running
  } finally {
    SETUP.busy = false;
  }
}

async function listDevices() {
  const devices = await navigator.mediaDevices.enumerateDevices();
  const fill = (sel, kind) => {
    const node = $(sel);
    node.innerHTML = '';
    devices.filter(d => d.kind === kind).forEach((d, i) => {
      const o = el('option', null, d.label || `${kind === 'videoinput' ? 'Camera' : 'Microphone'} ${i + 1}`);
      o.value = d.deviceId;
      node.appendChild(o);
    });
    const active = SETUP.stream &&
      SETUP.stream.getTracks().find(t => t.kind === (kind === 'videoinput' ? 'video' : 'audio'));
    const activeId = active && active.getSettings().deviceId;
    if (activeId && Array.from(node.options).some(o => o.value === activeId)) node.value = activeId;
  };
  fill('#cam-select', 'videoinput');
  fill('#mic-select', 'audioinput');
}

$('#cam-select').addEventListener('change', e => switchDevice('video', e.target.value));
$('#mic-select').addEventListener('change', e => {
  SETUP.sawAudio = false;
  markCheck('#chk-audio', false);
  switchDevice('audio', e.target.value);
});
$('#btn-retry-cam').addEventListener('click', async () => {
  stopStream(SETUP.stream);
  SETUP.stream = null;
  SETUP.sawAudio = false;
  markCheck('#chk-audio', false);
  markCheck('#chk-video', false);
  await openStream();
});

/* Devices appearing or vanishing must never touch the running stream. */
if (navigator.mediaDevices.addEventListener) {
  navigator.mediaDevices.addEventListener('devicechange', () => {
    if (SETUP.stream && currentScreen === 'setup') listDevices().catch(() => {});
  });
}

function startMeter(stream) {
  stopMeter();
  if (!stream.getAudioTracks().length) return;
  SETUP.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  const source = SETUP.audioCtx.createMediaStreamSource(stream);
  const analyser = SETUP.audioCtx.createAnalyser();
  analyser.fftSize = 1024;
  source.connect(analyser);
  const buf = new Float32Array(analyser.fftSize);

  const tick = () => {
    analyser.getFloatTimeDomainData(buf);
    let sum = 0;
    for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
    const rms = Math.sqrt(sum / buf.length);
    const pct = Math.min(100, rms * 320);
    $('#meter-fill').style.width = pct + '%';
    $('#meter-fill').style.background = pct > 88 ? 'var(--danger)' : pct > 12 ? 'var(--ok)' : 'var(--warn)';
    if (pct > 14 && !SETUP.sawAudio) {
      SETUP.sawAudio = true;
      markCheck('#chk-audio', true);
      $('#meter-hint').textContent = 'Levels look good.';
      refreshStartButton();
    } else if (!SETUP.sawAudio) {
      $('#meter-hint').textContent = 'Speak normally — the bar should reach the middle.';
    } else if (pct > 88) {
      $('#meter-hint').textContent = 'That is clipping. Move back or lower your input gain.';
    }
    SETUP.raf = requestAnimationFrame(tick);
  };
  tick();
}

function stopMeter() {
  if (SETUP.raf) cancelAnimationFrame(SETUP.raf);
  SETUP.raf = null;
  if (SETUP.audioCtx) { SETUP.audioCtx.close().catch(() => {}); SETUP.audioCtx = null; }
}

function stopStream(stream) {
  if (stream) stream.getTracks().forEach(t => t.stop());
}

function teardownSetup() {
  stopMeter();
  if (!IV.running) { stopStream(SETUP.stream); SETUP.stream = null; }
  $('#setup-video').srcObject = null;
}

function markCheck(sel, done) {
  const node = $(sel);
  node.classList.toggle('done', done);
  node.querySelector('.tick').textContent = done ? '●' : '○';
}

$('#chk-quiet').addEventListener('click', () => {
  markCheck('#chk-quiet', !$('#chk-quiet').classList.contains('done'));
  refreshStartButton();
});

function refreshStartButton() {
  const ready = !!SETUP.stream && SETUP.sawAudio && $('#chk-quiet').classList.contains('done');
  $('#btn-start').disabled = !ready;
  $('#start-hint').textContent = !SETUP.stream
    ? 'Grant camera and microphone access to continue.'
    : !SETUP.sawAudio ? 'Say a sentence out loud so we can confirm the microphone works.'
    : !$('#chk-quiet').classList.contains('done') ? 'Confirm you are in a quiet room to continue.'
    : `${pending ? pending.questions.length : 0} questions · ${mmss(pending ? pending.secs : 0)} each · one take.`;
}

function hideSetupError() {
  $('#setup-error').classList.add('hidden');
  $('#btn-retry-cam').classList.add('hidden');
}

function showSetupError(err, recoverable) {
  const name = (err && err.name) || '';
  const messages = {
    NotAllowedError:
      'Camera and microphone access was blocked. Click the camera icon in the address bar, ' +
      'allow both, then press Retry.',
    NotFoundError:
      'No camera or microphone was found. Check that they are plugged in and enabled in ' +
      'Windows Settings › Privacy & security › Camera.',
    NotReadableError:
      'Windows would not hand over the camera — another application is holding it. ' +
      'Close Teams, Zoom, OBS or the Camera app (check the system tray too), then press Retry.',
    TrackStartError:
      'Windows would not hand over the camera — another application is holding it. ' +
      'Close Teams, Zoom, OBS or the Camera app, then press Retry.',
    OverconstrainedError:
      'That device would not start with the requested settings. Pick a different one, ' +
      'or press Retry to fall back to the default.',
    AbortError:
      'The camera stopped responding. Press Retry; if it persists, unplug and replug it.',
  };
  const box = $('#setup-error');
  box.classList.remove('hidden');
  box.textContent = (messages[name] ||
    'Could not start the camera: ' + (err && err.message ? err.message : err)) +
    (recoverable ? ' Your previous device is still running.' : '');
  $('#btn-retry-cam').classList.toggle('hidden', !!recoverable);
}

/* ============================ the interview ============================ */

const IV = {
  running: false, questions: [], idx: 0, secs: 240, mode: 'realistic',
  readAloud: false, session: null, recorder: null, chunks: [],
  deadline: 0, tick: null, resolve: null, action: null, startedAt: 0,
};

const RING_CIRCUMFERENCE = 2 * Math.PI * 54;

function pickMime() {
  const options = [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm',
    'video/mp4',
  ];
  return options.find(m => window.MediaRecorder && MediaRecorder.isTypeSupported(m)) || '';
}

$('#btn-start').addEventListener('click', () => runInterview());

async function runInterview() {
  if (!pending || !SETUP.stream) return;
  stopMeter();

  Object.assign(IV, {
    running: true, questions: pending.questions, idx: 0, secs: pending.secs,
    mode: pending.mode, readAloud: pending.readAloud, startedAt: Date.now(),
  });

  IV.session = {
    id: uid(), startedAt: Date.now(), setName: pending.setName,
    secs: pending.secs, mode: pending.mode, answers: [],
  };
  const sessions = read(LS.sessions, []);
  sessions.unshift(IV.session);
  write(LS.sessions, sessions);

  $('#live-video').srcObject = SETUP.stream;
  $('#q-total').textContent = IV.questions.length;
  $('#btn-retake').classList.toggle('hidden', IV.mode !== 'practice');
  window.addEventListener('beforeunload', warnLeaving);
  goto('interview');

  let i = 0;
  while (i < IV.questions.length) {
    IV.idx = i;
    const action = await askQuestion(i);
    if (action === 'abort') break;
    if (action === 'retake') continue;      // same index, fresh take
    i++;
  }

  finishInterview();
}

function warnLeaving(e) { e.preventDefault(); e.returnValue = ''; }

async function askQuestion(i) {
  $('#q-index').textContent = i + 1;
  $('#progress-fill').style.width = (i / IV.questions.length * 100) + '%';
  $('#rec-badge').classList.add('hidden');
  $('#question-live').classList.add('hidden');
  $('#lead-in').classList.remove('hidden');
  $('#time-left').textContent = mmss(IV.secs);
  setRing(1);

  const aborted = await leadIn(3);
  if (aborted) return 'abort';

  // Question appears and recording starts in the same beat — as instructed.
  $('#lead-in').classList.add('hidden');
  $('#q-text').textContent = IV.questions[i].t;
  $('#question-live').classList.remove('hidden');
  $('#rec-badge').classList.remove('hidden');
  if (IV.readAloud) speak(IV.questions[i].t);

  const result = await recordAnswer();
  if (result.action === 'saved') {
    await storeAnswer(i, result.blob, result.duration);
  }
  return result.action;
}

function leadIn(seconds) {
  return new Promise(resolve => {
    let n = seconds;
    $('#lead-count').textContent = n;
    IV.action = null;
    const id = setInterval(() => {
      if (IV.action === 'abort') { clearInterval(id); return resolve(true); }
      n -= 1;
      if (n <= 0) { clearInterval(id); return resolve(false); }
      $('#lead-count').textContent = n;
      beep(660, 0.05, 0.04);
    }, 1000);
  });
}

function recordAnswer() {
  return new Promise(resolve => {
    const mime = pickMime();
    IV.chunks = [];
    IV.action = null;
    let recorder;
    try {
      recorder = new MediaRecorder(SETUP.stream, mime ? { mimeType: mime } : undefined);
    } catch (err) {
      alert('This browser cannot record video: ' + err.message);
      return resolve({ action: 'abort' });
    }
    IV.recorder = recorder;
    const started = Date.now();

    recorder.ondataavailable = e => { if (e.data && e.data.size) IV.chunks.push(e.data); };
    recorder.onstop = () => {
      clearInterval(IV.tick);
      IV.tick = null;
      $('#rec-badge').classList.add('hidden');
      const duration = (Date.now() - started) / 1000;
      const blob = new Blob(IV.chunks, { type: mime || 'video/webm' });
      IV.recorder = null;
      resolve({
        action: IV.action === 'retake' ? 'retake' : IV.action === 'abort' ? 'abort' : 'saved',
        blob, duration,
      });
    };

    recorder.start();
    IV.deadline = Date.now() + IV.secs * 1000;

    let warned60 = false, warned10 = false;
    IV.tick = setInterval(() => {
      const left = (IV.deadline - Date.now()) / 1000;
      $('#time-left').textContent = mmss(left);
      setRing(Math.max(0, left / IV.secs));
      if (left <= 60 && !warned60) { warned60 = true; beep(520, 0.12, 0.05); }
      if (left <= 10 && !warned10) { warned10 = true; beep(440, 0.18, 0.06); }
      if (left <= 0) {
        IV.action = 'timeup';
        if (recorder.state !== 'inactive') recorder.stop();
      }
    }, 100);
  });
}

function setRing(fraction) {
  const ring = $('#ring-value');
  ring.style.strokeDashoffset = String(RING_CIRCUMFERENCE * (1 - fraction));
  ring.classList.toggle('warn', fraction <= 0.25 && fraction > 0.08);
  ring.classList.toggle('crit', fraction <= 0.08);
}

function stopTake(action) {
  IV.action = action;
  if (IV.recorder && IV.recorder.state !== 'inactive') IV.recorder.stop();
}

$('#btn-submit').addEventListener('click', () => stopTake('submit'));
$('#btn-retake').addEventListener('click', () => {
  if (IV.mode !== 'practice') return;
  stopTake('retake');
});
$('#btn-abort').addEventListener('click', () => {
  if (!confirm('End the interview here? Answers already recorded are kept.')) return;
  IV.action = 'abort';
  if (IV.recorder && IV.recorder.state !== 'inactive') IV.recorder.stop();
});

async function storeAnswer(i, blob, duration) {
  const clip = {
    id: uid(),
    sessionId: IV.session.id,
    index: i,
    question: IV.questions[i].t,
    category: IV.questions[i].c,
    blob,
    type: blob.type,
    duration,
    allotted: IV.secs,
    createdAt: Date.now(),
  };
  try {
    await idbPut(clip);
  } catch (err) {
    console.error('Could not store the recording', err);
    alert('The recording for question ' + (i + 1) + ' could not be saved: ' + err.message);
    return;
  }
  IV.session.answers.push({
    clipId: clip.id, index: i, question: clip.question, category: clip.category,
    duration, allotted: IV.secs, createdAt: clip.createdAt,
  });
  const sessions = read(LS.sessions, []);
  const target = sessions.find(s => s.id === IV.session.id);
  if (target) { target.answers = IV.session.answers; write(LS.sessions, sessions); }
}

function finishInterview() {
  IV.running = false;
  clearInterval(IV.tick);
  IV.tick = null;
  window.removeEventListener('beforeunload', warnLeaving);
  window.speechSynthesis && window.speechSynthesis.cancel();
  stopStream(SETUP.stream);
  SETUP.stream = null;
  SETUP.sawAudio = false;
  markCheck('#chk-audio', false);
  $('#live-video').srcObject = null;

  const answered = IV.session.answers.length;
  const total = IV.session.answers.reduce((sum, a) => sum + a.duration, 0);
  $('#done-summary').textContent =
    `${answered} of ${IV.questions.length} answered · ${mmss(total)} of speaking recorded · saved locally.`;
  reviewSessionId = IV.session.id;
  goto('done');
}

$('#btn-to-review').addEventListener('click', () => { goto('review'); openSession(reviewSessionId); });

function speak(text) {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.rate = 0.98;
  window.speechSynthesis.speak(u);
}

let beepCtx = null;
function beep(freq, duration, gainValue) {
  try {
    beepCtx = beepCtx || new (window.AudioContext || window.webkitAudioContext)();
    const osc = beepCtx.createOscillator();
    const gain = beepCtx.createGain();
    osc.frequency.value = freq;
    osc.type = 'sine';
    gain.gain.value = gainValue;
    osc.connect(gain).connect(beepCtx.destination);
    osc.start();
    osc.stop(beepCtx.currentTime + duration);
  } catch { /* audio is a nicety, never a blocker */ }
}

/* ============================ review ============================ */

let reviewSessionId = null;
let openUrls = [];

/* These are the Agency's own evaluation criteria, in its own order, from
   "How do we evaluate Sonru interviews?" -- not a generic interview rubric. */
const CRITERIA = [
  ['content', 'Content of the answer'],
  ['style', 'Communication style — structure, focus, clarity'],
  ['depth', 'Depth & complexity of the example'],
  ['posture', 'Body language & posture'],
  ['fit', 'Fit for the team & positive attitude'],
];

function releaseUrls() {
  openUrls.forEach(URL.revokeObjectURL);
  openUrls = [];
}

function renderSessionList() {
  releaseUrls();
  $('#session-detail').hidden = true;
  $('#session-list').hidden = false;
  $('#btn-back-sessions').hidden = true;

  const list = $('#session-list');
  list.innerHTML = '';
  const sessions = read(LS.sessions, []).filter(s => s.answers && s.answers.length);

  if (!sessions.length) {
    const empty = el('div', 'empty');
    empty.innerHTML = 'No recorded sessions yet.<br>Run a practice interview and it will appear here.';
    list.appendChild(empty);
    return;
  }

  sessions.forEach(s => {
    const row = el('div', 'session-row');
    const left = el('div');
    const title = el('div');
    title.appendChild(el('strong', null, fmtDate(s.startedAt)));
    const pill = el('span', 'pill', s.mode === 'practice' ? 'practice' : 'realistic');
    title.appendChild(pill);
    left.appendChild(title);
    const spoken = s.answers.reduce((sum, a) => sum + a.duration, 0);
    left.appendChild(el('div', 'session-meta',
      `${s.setName} · ${s.answers.length} answers · ${mmss(spoken)} recorded · ${mmss(s.secs)} allowed per question`));
    row.appendChild(left);

    const actions = el('div', 'row');
    actions.style.marginTop = '0';
    const open = el('button', 'btn primary sm', 'Review');
    open.addEventListener('click', () => openSession(s.id));
    const del = el('button', 'btn danger-quiet sm', 'Delete');
    del.addEventListener('click', async () => {
      if (!confirm('Delete this session and all of its recordings? This cannot be undone.')) return;
      await idbDeleteSession(s.id);
      write(LS.sessions, read(LS.sessions, []).filter(x => x.id !== s.id));
      const scores = read(LS.scores, {});
      s.answers.forEach(a => delete scores[a.clipId]);
      write(LS.scores, scores);
      renderSessionList();
    });
    actions.append(open, del);
    row.appendChild(actions);
    list.appendChild(row);
  });
}

async function openSession(sessionId) {
  const session = read(LS.sessions, []).find(s => s.id === sessionId);
  if (!session) return renderSessionList();

  releaseUrls();
  reviewSessionId = sessionId;
  $('#session-list').hidden = true;
  $('#btn-back-sessions').hidden = false;
  const host = $('#session-detail');
  host.hidden = false;
  host.innerHTML = '';

  const head = el('div', 'card');
  head.style.marginBottom = '18px';
  head.appendChild(el('h2', null, session.setName));
  head.appendChild(el('div', 'session-meta',
    `${fmtDate(session.startedAt)} · ${session.answers.length} answers · ${mmss(session.secs)} per question · ${session.mode} mode`));
  host.appendChild(head);

  const clips = await idbGetBySession(sessionId);
  const byId = new Map(clips.map(c => [c.id, c]));
  const scores = read(LS.scores, {});

  session.answers.slice().sort((a, b) => a.index - b.index).forEach((answer, n) => {
    const clip = byId.get(answer.clipId);
    const card = el('div', 'answer-card');

    const head2 = el('div', 'answer-head');
    const numRow = el('div', 'answer-num');
    numRow.appendChild(el('span', null, `Question ${answer.index + 1}`));
    if (answer.category) numRow.appendChild(el('span', 'cat-badge', answer.category));
    head2.appendChild(numRow);
    head2.appendChild(el('p', 'answer-q', answer.question));
    card.appendChild(head2);

    const body = el('div', 'answer-body');

    const left = el('div');
    if (clip && clip.blob) {
      const url = URL.createObjectURL(clip.blob);
      openUrls.push(url);
      const video = el('video');
      video.src = url;
      video.controls = true;
      video.preload = 'metadata';
      left.appendChild(video);
    } else {
      left.appendChild(el('div', 'no-video', 'The recording for this answer is missing.'));
    }
    body.appendChild(left);

    const right = el('div');
    const rubric = el('div', 'rubric');
    const saved = scores[answer.clipId] || { notes: '' };

    CRITERIA.forEach(([key, label]) => {
      const row = el('div', 'rubric-row');
      row.appendChild(el('div', 'rubric-label', label));
      const stars = el('div', 'stars');
      for (let v = 1; v <= 5; v++) {
        const star = el('button', 'star', '★');
        star.type = 'button';
        star.title = `${v} of 5`;
        if ((saved[key] || 0) >= v) star.classList.add('on');
        star.addEventListener('click', () => {
          const all = read(LS.scores, {});
          const entry = all[answer.clipId] || { notes: '' };
          entry[key] = entry[key] === v ? 0 : v;   // click the same star to clear
          all[answer.clipId] = entry;
          write(LS.scores, all);
          Array.from(stars.children).forEach((s, i) => s.classList.toggle('on', i < (entry[key] || 0)));
          flagSaved(card);
        });
        stars.appendChild(star);
      }
      row.appendChild(stars);
      rubric.appendChild(row);
    });
    right.appendChild(rubric);

    const notes = el('textarea', 'notes');
    notes.placeholder = 'Interviewer notes — what landed, what rambled, what to say instead…';
    notes.value = saved.notes || '';
    let debounce;
    notes.addEventListener('input', () => {
      clearTimeout(debounce);
      debounce = setTimeout(() => {
        const all = read(LS.scores, {});
        const entry = all[answer.clipId] || {};
        entry.notes = notes.value;
        all[answer.clipId] = entry;
        write(LS.scores, all);
        flagSaved(card);
      }, 400);
    });
    right.appendChild(notes);
    body.appendChild(right);
    card.appendChild(body);

    const foot = el('div', 'answer-foot');
    const used = Math.round(answer.duration / answer.allotted * 100);
    foot.appendChild(el('div', null,
      `Used ${mmss(answer.duration)} of ${mmss(answer.allotted)} (${used}%)`));
    const footRight = el('div', 'row');
    footRight.style.marginTop = '0';
    const flag = el('span', 'saved-flag', 'Saved');
    footRight.appendChild(flag);
    if (clip && clip.blob) {
      const dl = el('button', 'btn ghost sm', 'Download');
      dl.addEventListener('click', () => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(clip.blob);
        const ext = (clip.type || '').includes('mp4') ? 'mp4' : 'webm';
        a.download = `answer-q${answer.index + 1}-${new Date(session.startedAt)
          .toISOString().slice(0, 10)}.${ext}`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 30000);
      });
      footRight.appendChild(dl);
    }
    foot.appendChild(footRight);
    card.appendChild(foot);

    host.appendChild(card);
  });
}

function flagSaved(card) {
  const flag = card.querySelector('.saved-flag');
  if (!flag) return;
  flag.classList.add('show');
  clearTimeout(flag._t);
  flag._t = setTimeout(() => flag.classList.remove('show'), 1200);
}

$('#btn-back-sessions').addEventListener('click', renderSessionList);

/* ============================ question editor ============================ */

let editingSetId = null;

function renderEditor() {
  const sets = loadSets();
  const sel = $('#edit-set-select');
  sel.innerHTML = '';
  sets.forEach(s => {
    const o = el('option', null, s.name);
    o.value = s.id;
    sel.appendChild(o);
  });
  if (!editingSetId || !sets.some(s => s.id === editingSetId)) editingSetId = sets[0].id;
  sel.value = editingSetId;
  loadSetIntoEditor();
}

function loadSetIntoEditor() {
  const set = loadSets().find(s => s.id === editingSetId);
  if (!set) return;
  $('#set-name').value = set.name;
  $('#set-questions').value = set.questions
    .map(q => (q.c ? `[${q.c}] ${q.t}` : q.t)).join('\n\n');
  updateCountHint();
}

function parseQuestions() {
  return $('#set-questions').value
    .split('\n').map(l => l.trim()).filter(Boolean).map(normalizeQuestion);
}

function updateCountHint() {
  const n = parseQuestions().length;
  $('#q-count-hint').textContent = `${n} question${n === 1 ? '' : 's'} in this set.`;
}

$('#set-questions').addEventListener('input', updateCountHint);
$('#edit-set-select').addEventListener('change', () => {
  editingSetId = $('#edit-set-select').value;
  loadSetIntoEditor();
});

$('#btn-save-set').addEventListener('click', () => {
  const sets = loadSets();
  const set = sets.find(s => s.id === editingSetId);
  if (!set) return;
  const questions = parseQuestions();
  if (!questions.length) return alert('Add at least one question before saving.');
  set.name = $('#set-name').value.trim() || 'Untitled set';
  set.questions = questions;
  write(LS.sets, sets);
  renderEditor();
  const btn = $('#btn-save-set');
  btn.textContent = 'Saved ✓';
  setTimeout(() => { btn.textContent = 'Save'; }, 1200);
});

$('#btn-new-set').addEventListener('click', () => {
  const sets = loadSets();
  const fresh = { id: uid(), name: 'New set', questions: ['Tell us about yourself.'] };
  sets.push(fresh);
  write(LS.sets, sets);
  editingSetId = fresh.id;
  renderEditor();
  $('#set-name').focus();
  $('#set-name').select();
});

$('#btn-del-set').addEventListener('click', () => {
  const sets = loadSets();
  if (sets.length === 1) return alert('Keep at least one question set.');
  if (!confirm('Delete this question set? Recordings made from it are not affected.')) return;
  write(LS.sets, sets.filter(s => s.id !== editingSetId));
  editingSetId = null;
  renderEditor();
});

/* ============================ boot ============================ */

if (!navigator.mediaDevices || !window.MediaRecorder) {
  document.body.innerHTML =
    '<div style="max-width:560px;margin:80px auto;padding:24px;font:15px system-ui">' +
    '<h1>This browser cannot record video</h1>' +
    '<p>Open the app in a recent Chrome or Edge over <code>http://localhost</code>. ' +
    'Opening the file directly with <code>file://</code> blocks camera access.</p></div>';
} else {
  goto('home');
}
