// Party Games : accueil, profil, Quiz et Blind test en solo ou en salon.
import { AV, avatarSvg, covers, GAMES, THEMES, themeName, QUESTIONS } from './data.js';
import { esc, shuffle, norm, matches, loadCfg, saveCfg } from './util.js';
import { fetchArtists } from './deezer.js';

const $ = (id) => document.getElementById(id);
const view = () => $('view-game');
const SECS = { quiz: 20, blind: 30 };
const MODES = [['choice', '4 propositions'], ['typed', 'Réponse tapée'], ['mix', 'Mélange']];
const COUNTS = [[5, '5'], [10, '10'], [20, '20']];
const backHome = `<a href="#accueil" class="btn ghost back">← Retour aux jeux</a>`;

// Le réseau (Firebase) ne se charge que quand on joue en salon.
let netP = null;
const getNet = () => (netP = netP || import('./net.js'));

// ---------- Profil ----------
const store = {
  get() { try { return JSON.parse(localStorage.getItem('pg-player') || 'null'); } catch (e) { return null; } },
  set(v) { try { localStorage.setItem('pg-player', JSON.stringify(v)); } catch (e) {} }
};
let player = store.get();
let picked = player && Number.isInteger(player.avatar) ? player.avatar % AV.length : 0;
let pendingHash = '';
const avIndex = (a) => (Number.isInteger(a) ? ((a % AV.length) + AV.length) % AV.length : 0);

const renderAvatars = () => {
  $('avatars').innerHTML = AV.map((a, i) =>
    `<button type="button" class="av" data-i="${i}" aria-pressed="${i === picked}" aria-label="${a[0]}">${avatarSvg(i)}</button>`).join('');
};

const renderGrid = () => {
  $('grid').innerHTML = GAMES.map(g => `
    <button type="button" class="card" data-go="${g.id}">
      ${covers[g.id]()}
      <span class="body">
        <span class="h3">${g.name}</span>
        <p>${g.desc}</p>
        <span class="meta"><span class="tag">${g.players}</span>${g.ready ? '<span class="tag on">Jouable</span>' : `<span class="tag">${g.step}</span>`}</span>
      </span>
    </button>`).join('');
};

const renderPlayer = () => {
  const chip = $('chip');
  if (player) {
    chip.classList.remove('hidden');
    chip.innerHTML = avatarSvg(player.avatar) + '<span></span>';
    chip.querySelector('span').textContent = player.name;
    $('profile').classList.add('hidden');
    $('join').classList.remove('hidden');
    $('intro').innerHTML = `<div class="hello">${avatarSvg(player.avatar)}<div><h1>Bonjour, <span id="hello-name"></span></h1><p>Choisis un jeu, ou rejoins le salon d'un ami avec son code.</p></div></div>`;
    $('hello-name').textContent = player.name;
  } else {
    chip.classList.add('hidden');
    $('profile').classList.remove('hidden');
    $('join').classList.add('hidden');
    $('intro').innerHTML = `<h1>Crée ton profil de joueur</h1><p>Un pseudo et un avatar suffisent. Aucun compte n'est nécessaire.</p>`;
  }
};

// ---------- Outils de partie ----------
const toggles = (items, attr, isOn, isOff) => items.map(([k, n]) =>
  `<button type="button" class="tg" data-${attr}="${k}" aria-pressed="${isOn(k)}"${isOff && isOff(k) ? ' disabled' : ''}>${n}</button>`).join('');

const label = (t) => (t.artist ? `${t.title} — ${t.artist}` : t.title);

const quizItems = (cfg) => shuffle(QUESTIONS.filter(q => cfg.themes.includes(q[0]))).slice(0, cfg.count).map(q => ({
  theme: q[0], q: q[1], a: q[2], alts: [q[2], ...q[4]], choices: shuffle([q[2], ...q[3]]),
  typed: cfg.mode === 'typed' || (cfg.mode === 'mix' && Math.random() < 0.5)
}));

const blindItems = (pool, cfg) => {
  const canChoice = new Set(pool.map(label)).size >= 4;
  return shuffle(pool).slice(0, cfg.count).map(t => {
    const typed = !canChoice || cfg.mode === 'typed' || (cfg.mode === 'mix' && Math.random() < 0.5);
    const near = [...new Set(pool.filter(x => x.g && x.g === t.g && label(x) !== label(t)).map(label))];
    const all = [...new Set(pool.filter(x => label(x) !== label(t)).map(label))];
    const others = shuffle(near.length >= 3 ? near : all).slice(0, 3);
    return { url: t.url, title: t.title, artist: t.artist, label: label(t), seek: !!t.seek, typed, choices: typed ? [] : shuffle([label(t), ...others]) };
  });
};

// Note une réponse : 100 points + bonus de rapidité (jusqu'à 100).
const grade = (game, item, v, elapsed) => {
  const sec = SECS[game];
  const full = 100 + Math.round(Math.max(0, sec - elapsed) / sec * 100);
  if (v === undefined || v === null || v === '') return { pts: 0, ok: false, res: 'Pas de réponse' };
  if (game === 'quiz') {
    const ok = item.typed ? matches(v, item.alts || [item.a]) : v === item.a;
    return { pts: ok ? full : 0, ok, res: ok ? 'Juste' : 'Raté' };
  }
  if (!item.typed) { const ok = v === item.label; return { pts: ok ? full : 0, ok, res: ok ? 'Trouvé' : 'Raté' }; }
  if (matches(v, [item.title])) return { pts: full, ok: true, res: 'Titre trouvé' };
  if (item.artist && matches(v, [item.artist])) return { pts: Math.round(full / 2), ok: true, res: 'Artiste trouvé' };
  return { pts: 0, ok: false, res: 'Raté' };
};

// Partie solo : même fonctionnement qu'un salon, mais en mémoire.
const setPath = (obj, path, val) => {
  const keys = path.split('/'); let o = obj;
  keys.slice(0, -1).forEach(k => { if (typeof o[k] !== 'object' || o[k] === null) o[k] = {}; o = o[k]; });
  const last = keys[keys.length - 1];
  if (val === null) delete o[last]; else o[last] = val;
};
const localRoom = (game, cfg, items) => {
  const uid = 'moi';
  const st = {
    host: uid, game, cfg, items, status: 'playing', answers: {},
    round: { i: 0, phase: 'question', startAt: Date.now() + 1500 },
    players: { [uid]: { name: player.name, avatar: player.avatar, score: 0, last: 0, online: true } }
  };
  const ls = [];
  const emit = () => setTimeout(() => ls.forEach(f => f(st)), 0);
  return {
    code: null, me: uid, local: true, now: () => Date.now(),
    subscribe(f) { ls.push(f); emit(); },
    close() { ls.length = 0; },
    answer(i, v) { st.answers[i] = st.answers[i] || {}; if (!st.answers[i][uid]) { st.answers[i][uid] = { v, t: Date.now() }; emit(); } },
    hostUpdate(patch) { Object.entries(patch).forEach(([k, v]) => setPath(st, k, v)); emit(); return Promise.resolve(); }
  };
};

// ---------- Son ----------
const audio = new Audio();
audio.preload = 'auto';
let audioKey = '';
const SILENT = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=';
const unlockAudio = () => { if (audioKey) return; audio.src = SILENT; audio.play().catch(() => {}); audioKey = 'unlocked'; };
const stopAudio = () => { audio.pause(); audioKey = audioKey ? 'stopped' : ''; };
const playItem = (key, item) => {
  if (audioKey === key) return;
  audioKey = key;
  audio.pause();
  audio.src = item.url;
  const go = () => audio.play().then(() => { const eq = $('eq'); if (eq) eq.classList.add('on'); const b = $('listen-btn'); if (b) b.classList.add('hidden'); })
    .catch(() => { const b = $('listen-btn'); if (b) b.classList.remove('hidden'); });
  if (item.seek) {
    audio.addEventListener('loadedmetadata', () => {
      if (isFinite(audio.duration) && audio.duration > 45) audio.currentTime = audio.duration * (0.2 + Math.random() * 0.3);
      go();
    }, { once: true });
  } else go();
};

// ---------- Réglages : Quiz ----------
const quiz = { cfg: loadCfg('pg-quiz', { themes: THEMES.map(t => t[0]), mode: 'mix', count: 10 }) };

const quizSetup = (focusSel, msg) => {
  const c = quiz.cfg;
  const avail = QUESTIONS.filter(q => c.themes.includes(q[0])).length;
  const n = Math.min(avail, c.count);
  view().innerHTML = `${backHome}
    <div class="ghead"><h1>Quiz</h1><p class="desc">Choisis tes thèmes et ta façon de répondre, puis joue seul ou crée un salon pour tes amis.</p></div>
    <div class="setup">
      <fieldset><legend>Thèmes</legend><div class="toggles">${THEMES.map(([k, name]) => `<button type="button" class="tg" data-th="${k}" aria-pressed="${c.themes.includes(k)}">${name} <small>${QUESTIONS.filter(q => q[0] === k).length}</small></button>`).join('')}</div></fieldset>
      <fieldset><legend>Réponses</legend><div class="toggles">${toggles(MODES, 'mode', k => c.mode === k)}</div></fieldset>
      <fieldset><legend>Nombre de questions</legend><div class="toggles">${toggles(COUNTS, 'count', k => c.count === k)}</div></fieldset>
      <div class="row-end">
        <button class="btn" type="button" id="solo"${avail ? '' : ' disabled'}>Jouer en solo</button>
        <button class="btn ghost" type="button" id="multi"${avail ? '' : ' disabled'}>Créer un salon</button>
        <p class="note">${avail ? `${n} question${n > 1 ? 's' : ''} · ${SECS.quiz} secondes chacune · petites fautes acceptées` : 'Sélectionne au moins un thème.'}</p>
      </div>
      <p class="err" id="setup-err" aria-live="polite"></p>
    </div>`;
  if (msg) $('setup-err').textContent = msg;
  if (focusSel) { const f = view().querySelector(focusSel); if (f) f.focus(); }
  view().onclick = async (e) => {
    const b = e.target.closest('button'); if (!b || b.disabled) return;
    let sel = null;
    if (b.dataset.th) { const k = b.dataset.th; c.themes = c.themes.includes(k) ? c.themes.filter(x => x !== k) : [...c.themes, k]; sel = `[data-th="${k}"]`; }
    else if (b.dataset.mode) { c.mode = b.dataset.mode; sel = `[data-mode="${c.mode}"]`; }
    else if (b.dataset.count) { c.count = +b.dataset.count; sel = `[data-count="${c.count}"]`; }
    else if (b.id === 'solo') { saveCfg('pg-quiz', c); startSolo('quiz', c, quizItems(c)); return; }
    else if (b.id === 'multi') { saveCfg('pg-quiz', c); createRoom('quiz', c, quizItems(c), b); return; }
    else return;
    saveCfg('pg-quiz', c); quizSetup(sel);
  };
};

// ---------- Réglages : Blind test ----------
const GENRES = [
  ['kpop', 'K-pop', ['BTS', 'BLACKPINK', 'TWICE', 'Stray Kids', 'NewJeans', 'SEVENTEEN', 'aespa', 'IVE', 'LE SSERAFIM', 'ITZY']],
  ['pop', 'Pop', ['Taylor Swift', 'Dua Lipa', 'The Weeknd', 'Ed Sheeran', 'Billie Eilish', 'Bruno Mars', 'Ariana Grande', 'Harry Styles', 'Lady Gaga', 'Rihanna']],
  ['rapus', 'Rap US', ['Drake', 'Kendrick Lamar', 'Travis Scott', 'Eminem', 'Kanye West', 'Post Malone', 'Future', '21 Savage', 'Nicki Minaj', 'J. Cole']],
  ['rapfr', 'Rap FR', ['Ninho', 'Jul', 'PNL', 'Gims', 'SCH', 'Damso', 'Orelsan', 'Booba', 'Nekfeu', 'Tiakola']],
  ['rock', 'Rock', ['Imagine Dragons', 'Coldplay', 'Linkin Park', 'Queen', 'Nirvana', 'AC/DC', 'Arctic Monkeys', 'Red Hot Chili Peppers', 'Muse', 'Green Day']],
  ['varfr', 'Variété française', ['Aya Nakamura', 'Angèle', 'Stromae', 'Indila', 'Soprano', 'Louane', 'Vianney', 'Kendji Girac', 'Zaz', 'Black M']]
];
const BCOUNTS = [[15, '15'], [30, '30'], [60, '60']];
const blind = { cfg: loadCfg('pg-blind', { genres: ['pop'], mode: 'choice', count: 15 }), pool: [], poolKey: '', loading: false, msg: '' };
if (!Array.isArray(blind.cfg.genres) || !blind.cfg.genres.length) blind.cfg.genres = ['pop'];
blind.cfg.genres = blind.cfg.genres.filter(g => GENRES.some(x => x[0] === g));
if (!blind.cfg.genres.length) blind.cfg.genres = ['pop'];
if (![15, 30, 60].includes(blind.cfg.count)) blind.cfg.count = 15;
['src', 'kind', 'q', 'pl'].forEach(k => delete blind.cfg[k]);

const srcKey = (c) => [...c.genres].sort().join(',');
const currentPool = () => (blind.poolKey === srcKey(blind.cfg) ? blind.pool : []);

// Charge les extraits Deezer des genres choisis (5 artistes tirés au hasard par genre).
const loadDeezer = async () => {
  const c = blind.cfg, key = srcKey(c);
  if (blind.poolKey === key && blind.pool.length) return blind.pool;
  blind.loading = true; blind.msg = '';
  if (location.hash === '#blind-test' && !cur) blindSetup();
  const names = GENRES.filter(g => c.genres.includes(g[0])).flatMap(g => shuffle(g[2]).slice(0, 5));
  try {
    const pool = (await fetchArtists(names, 20)).map(t => Object.assign(t, { g: (GENRES.find(g => g[2].includes(t.from)) || [''])[0] }));
    if (srcKey(blind.cfg) !== key) { blind.loading = false; return loadDeezer(); }
    blind.pool = pool; blind.poolKey = key;
    blind.msg = pool.length ? '' : 'Aucun extrait trouvé. Réessaie dans un instant.';
  } catch (err) {
    if (srcKey(blind.cfg) !== key) { blind.loading = false; return loadDeezer(); }
    blind.pool = []; blind.poolKey = '';
    blind.msg = 'Impossible de joindre Deezer. Vérifie ta connexion et réessaie.';
  }
  blind.loading = false;
  if (location.hash === '#blind-test' && !cur) blindSetup();
  return currentPool();
};

const blindSetup = (focusSel) => {
  const c = blind.cfg, pool = currentPool();
  const ready = pool.length > 0;
  const n = Math.min(pool.length || c.count, c.count);
  view().innerHTML = `${backHome}
    <div class="ghead"><h1>Blind test</h1><p class="desc">Reconnais le titre ou l'artiste à partir d'un extrait de ${SECS.blind} secondes.</p></div>
    <div class="setup">
      <fieldset><legend>Genres</legend>
        <div class="toggles">${GENRES.map(([k, name]) => `<button type="button" class="tg" data-genre="${k}" aria-pressed="${c.genres.includes(k)}">${name}</button>`).join('')}</div>
        <p class="note" style="margin-top:10px">${blind.loading ? 'Chargement des morceaux…' : ready ? `${pool.length} extraits prêts · choisis un ou plusieurs genres` : 'Choisis un ou plusieurs genres.'}</p>
        ${blind.msg ? `<p class="err" style="margin-top:6px" aria-live="polite">${esc(blind.msg)}</p>` : ''}
      </fieldset>
      <fieldset><legend>Réponses</legend><div class="toggles">${toggles(MODES, 'mode', k => c.mode === k)}</div></fieldset>
      <fieldset><legend>Nombre de morceaux</legend><div class="toggles">${toggles(BCOUNTS, 'count', k => c.count === k)}</div></fieldset>
      <div class="row-end">
        <button class="btn" type="button" id="solo"${blind.loading ? ' disabled' : ''}>Jouer en solo</button>
        <button class="btn ghost" type="button" id="multi"${blind.loading ? ' disabled' : ''}>Créer un salon</button>
        <p class="note">${n} morceaux · réponse tapée : titre = tous les points, artiste seul = moitié</p>
      </div>
      <p class="err" id="setup-err" aria-live="polite"></p>
    </div>`;
  if (focusSel) { const f = view().querySelector(focusSel); if (f) f.focus(); }
  view().onclick = async (e) => {
    const b = e.target.closest('button'); if (!b || b.disabled) return;
    if (b.dataset.genre) {
      const k = b.dataset.genre;
      if (c.genres.includes(k)) { if (c.genres.length > 1) c.genres = c.genres.filter(x => x !== k); }
      else c.genres = [...c.genres, k];
      saveCfg('pg-blind', c); blindSetup(`[data-genre="${k}"]`);
      clearTimeout(blind.t); blind.t = setTimeout(() => { if (!blind.loading) loadDeezer(); }, 700);
      return;
    }
    if (b.dataset.mode) { c.mode = b.dataset.mode; saveCfg('pg-blind', c); blindSetup(`[data-mode="${c.mode}"]`); return; }
    if (b.dataset.count) { c.count = +b.dataset.count; saveCfg('pg-blind', c); blindSetup(`[data-count="${c.count}"]`); return; }
    if (b.id === 'solo' || b.id === 'multi') {
      saveCfg('pg-blind', c); unlockAudio();
      const pool = await loadDeezer();
      if (!pool.length) return;
      const items = blindItems(pool, c);
      if (b.id === 'solo') startSolo('blind', c, items);
      else createRoom('blind', c, items, $('multi') || b);
    }
  };
};

// ---------- Salons ----------
let cur = null; // { ctl, st, key }

const leaveRoom = () => {
  if (cur) { cur.ctl.close(); cur = null; }
  stopAudio();
};

const startSolo = (game, cfg, items) => {
  leaveRoom();
  const ctl = localRoom(game, cfg, items);
  cur = { ctl, st: null, key: '', back: game === 'quiz' ? 'quiz' : 'blind-test' };
  ctl.subscribe((st) => onState(st));
};

const createRoom = async (game, cfg, items, btn) => {
  btn.disabled = true; btn.textContent = 'Création…';
  try {
    const net = await getNet();
    const code = await net.createRoom(game, cfg, items, player);
    location.hash = 'salon-' + code;
  } catch (err) {
    btn.disabled = false; btn.textContent = 'Créer un salon';
    const el = $('setup-err'); if (el) el.textContent = 'Impossible de créer le salon. Vérifie ta connexion et réessaie.';
  }
};

const joinRoom = async (code) => {
  leaveRoom();
  view().innerHTML = `${backHome}<div class="ghead"><h1>Salon ${esc(code)}</h1><p class="desc">Connexion au salon…</p></div>`;
  try {
    const net = await getNet();
    const ctl = await net.openRoom(code, player);
    if (location.hash.toUpperCase() !== '#SALON-' + code) { ctl.close(); return; }
    cur = { ctl, st: null, key: '', back: 'accueil' };
    ctl.subscribe((st) => onState(st));
  } catch (err) {
    view().innerHTML = `${backHome}<div class="ghead"><h1>Salon introuvable</h1><p class="desc">Le code ${esc(code)} ne correspond à aucun salon. Vérifie le code avec la personne qui a créé la partie.</p></div>`;
    if (err.message !== 'absent') view().querySelector('.desc').textContent = 'Connexion impossible pour le moment. Vérifie ta connexion et réessaie.';
  }
};

const ranking = (st) => Object.entries(st.players || {}).map(([uid, p]) => ({ uid, ...p })).sort((a, b) => (b.score || 0) - (a.score || 0));
const answersAt = (st, i) => (st.answers && st.answers[i]) || {};
const onlineUids = (st) => Object.entries(st.players || {}).filter(([, p]) => p.online !== false).map(([u]) => u);

const playerRow = (p, me, extra) => `<li class="${p.uid === me ? 'me' : ''}${p.online === false ? ' off' : ''}">${avatarSvg(avIndex(p.avatar))}<span class="pn">${esc(p.name)}${p.uid === me ? ' <small>(toi)</small>' : ''}${p.online === false ? ' <small>(déconnecté)</small>' : ''}</span>${extra || ''}</li>`;

const onState = (st) => {
  if (!cur) return;
  cur.st = st;
  const me = cur.ctl.me;
  const answered = !!answersAt(st, st.round.i)[me];
  const key = [st.status, st.round.i, st.round.phase, st.round.startAt, answered].join('|');
  if (key !== cur.key) { cur.key = key; renderRoom(); }
  updateDynamic();
};

const renderRoom = () => {
  const { ctl, st } = cur;
  const isHost = st.host === ctl.me;
  const quizMode = st.game === 'quiz';
  const title = quizMode ? 'Quiz' : 'Blind test';
  const back = ctl.local ? `<button type="button" class="btn ghost back" data-setup>← Réglages</button>` : `<a href="#accueil" class="btn ghost back">← Quitter le salon</a>`;
  view().onclick = null; view().oninput = null; view().onchange = null; view().onkeydown = null;

  if (st.status === 'lobby') {
    stopAudio();
    const link = `${location.origin}${location.pathname}#salon-${ctl.code}`;
    const n = (st.items || []).length;
    view().innerHTML = `${back}
      <div class="lobby">
        <div class="codebox">
          <p class="note">Code du salon</p>
          <div class="code">${esc(ctl.code)}</div>
          <p class="note">Tes amis entrent ce code sur l'accueil, ou ouvrent le lien.</p>
          <button class="btn ghost" type="button" id="copy">Copier le lien</button>
          <p class="note" id="copy-msg" aria-live="polite"></p>
        </div>
        <div>
          <div class="ghead" style="margin-top:0"><h1>${title}</h1><p class="desc">${n} ${quizMode ? 'question' : 'morceau'}${n > 1 ? (quizMode ? 's' : 'x') : ''} · ${SECS[st.game]} secondes chacun${quizMode ? 'e' : ''}</p></div>
          <h2 class="sub">Joueurs</h2>
          <ul class="plist" id="plist"></ul>
          ${!quizMode ? '<button class="btn ghost" type="button" id="unlock">Activer le son sur cet appareil</button>' : ''}
          <div class="row-end" style="margin-top:16px">${isHost ? '<button class="btn" type="button" id="start">Lancer la partie</button><p class="note">Lance quand tout le monde est là.</p>' : '<p class="note">En attente du lancement par la personne qui a créé le salon.</p>'}</div>
        </div>
      </div>`;
    $('copy').onclick = () => {
      const msg = $('copy-msg');
      navigator.clipboard.writeText(link).then(() => { msg.textContent = 'Lien copié.'; }).catch(() => { msg.textContent = link; });
    };
    const ul = $('unlock'); if (ul) ul.onclick = () => { unlockAudio(); ul.textContent = 'Son activé'; ul.disabled = true; };
    const sb = $('start'); if (sb) sb.onclick = () => { unlockAudio(); sb.disabled = true; ctl.hostUpdate({ status: 'playing', round: { i: 0, phase: 'question', startAt: ctl.now() + 3000 } }); };
    return;
  }

  if (st.status === 'ended') { renderEnd(back, isHost); return; }

  const i = st.round.i, item = st.items[i], total = st.items.length;
  const reveal = st.round.phase === 'reveal';
  const mine = answersAt(st, i)[ctl.me];
  const myVal = mine ? mine.v : null;
  const choices = item.choices || [];
  const correctChoice = quizMode ? item.a : item.label;
  if (!reveal && !quizMode) { if (audioKey !== `${ctl.code}|${st.round.startAt}`) { audio.pause(); } }

  const choiceHtml = choices.map((ch, k) => {
    let cls = 'choice';
    if (reveal) { if (ch === correctChoice) cls += ' ok'; else if (ch === myVal) cls += ' ko'; }
    else if (ch === myVal) cls += ' picked';
    return `<button type="button" class="${cls}" data-k="${k}"${reveal || mine ? ' disabled' : ''}><b>${'ABCD'[k]}</b><span>${esc(ch)}</span></button>`;
  }).join('');

  const typedHtml = `<form class="typed" id="tf"><input type="text" id="ans" autocomplete="off" placeholder="${quizMode ? 'Ta réponse' : 'Titre ou artiste'}" aria-label="Ta réponse"${reveal || mine ? ' disabled' : ''} value="${myVal ? esc(myVal) : ''}"><button class="btn" type="submit"${reveal || mine ? ' disabled' : ''}>Valider</button></form>`;

  let fb = '', fbCls = '';
  if (reveal) {
    const r = grade(st.game, item, myVal, mine ? (mine.t - st.round.startAt) / 1000 : 0);
    fbCls = r.pts ? 'ok' : 'ko';
    const answerText = quizMode ? item.a : item.label;
    fb = r.pts ? `${r.res}, +${r.pts} points. ${quizMode ? (item.typed && norm(myVal) !== norm(item.a) ? `Orthographe exacte : ${answerText}.` : '') : `C'était : ${answerText}.`}`
      : `${mine ? 'Raté.' : 'Pas de réponse.'} ${quizMode ? 'La réponse était' : 'C’était'} : ${answerText}.`;
  } else if (mine) fb = 'Réponse envoyée.';

  const last = i + 1 >= total;
  view().innerHTML = `${back}
    <div class="play" id="play">
      <div class="hud"><span>${quizMode ? 'Question' : 'Morceau'} ${i + 1} / ${total}${ctl.code ? ` · salon ${esc(ctl.code)}` : ''}</span><span id="pts"></span></div>
      <div class="timer" aria-hidden="true"><i id="bar"${reveal ? ' style="width:0"' : ''}></i></div>
      <div class="countdown hidden" id="countdown" aria-live="polite"></div>
      <div class="qa">
        ${quizMode
          ? `<span class="tag">${esc(themeName(item.theme))}</span><p class="qtext">${esc(item.q)}</p>`
          : `<div class="listen"><div class="eq${reveal ? '' : ''}" id="eq" aria-hidden="true">${'<span></span>'.repeat(14)}</div><button class="btn ghost hidden" type="button" id="listen-btn">Écouter l'extrait</button></div><p class="qtext">${item.typed ? 'Quel est ce morceau ?' : 'Quel morceau entends-tu ?'}</p>`}
        ${item.typed ? typedHtml : `<div class="choices">${choiceHtml}</div>`}
      </div>
      <p class="fb ${fbCls}" id="fb" aria-live="polite">${esc(fb)}</p>
      <p class="note" id="waiting"></p>
      ${reveal && !ctl.local ? '<h2 class="sub">Classement</h2><ol class="plist board" id="board"></ol>' : ''}
      <div class="row-end" id="nx">${reveal ? (isHost ? `<button class="btn" type="button" id="next">${last ? 'Voir le résultat' : (quizMode ? 'Question suivante' : 'Morceau suivant')}</button>` : '<p class="note">La personne qui a créé le salon passe à la suite.</p>') : ''}</div>
    </div>`;

  if (!quizMode && audioKey === `${ctl.code}|${st.round.startAt}` && !audio.paused) { $('eq').classList.add('on'); }
  const lb = $('listen-btn'); if (lb) lb.onclick = () => { audio.play().then(() => { lb.classList.add('hidden'); $('eq').classList.add('on'); }).catch(() => {}); };
  view().onclick = (e) => {
    const b = e.target.closest('.choice');
    if (b && !b.disabled && !reveal && !answersAt(cur.st, i)[ctl.me] && ctl.now() >= st.round.startAt) ctl.answer(i, choices[+b.dataset.k]);
  };
  const tf = $('tf');
  if (tf) {
    tf.onsubmit = (e) => { e.preventDefault(); const v = $('ans').value.trim(); if (v && ctl.now() >= st.round.startAt && !answersAt(cur.st, i)[ctl.me]) ctl.answer(i, v); };
    if (!reveal && !mine) setTimeout(() => { const a = $('ans'); if (a && !a.disabled) a.focus(); }, 50);
  }
  const nb = $('next');
  if (nb) {
    nb.onclick = () => {
      nb.disabled = true;
      if (last) ctl.hostUpdate({ status: 'ended' });
      else ctl.hostUpdate({ round: { i: i + 1, phase: 'question', startAt: ctl.now() + (ctl.local ? 800 : 2000) } });
    };
    nb.focus();
  }
};

const renderEnd = (back, isHost) => {
  const { ctl, st } = cur;
  stopAudio();
  const quizMode = st.game === 'quiz';
  const me = ctl.me;
  const rows = (st.items || []).map((it, i) => {
    const a = answersAt(st, i)[me];
    const r = grade(st.game, it, a ? a.v : null, 0);
    return { q: quizMode ? it.q : it.label, given: a ? a.v : '', res: quizMode ? it.a : r.res, ok: r.ok };
  });
  const rank = ranking(st);
  const mineP = (st.players || {})[me] || { score: 0 };
  const good = rows.filter(r => r.ok).length;
  const pos = rank.findIndex(p => p.uid === me) + 1;
  view().innerHTML = `${back}
    <div class="res">
      <div>
        <p class="note">${ctl.local ? 'Score final' : `Tu termines ${pos === 1 ? '1er' : pos + 'e'} sur ${rank.length}`}</p>
        <div class="result-big">${mineP.score || 0}</div>
        <p class="desc">${good} sur ${rows.length} ${quizMode ? 'bonne' + (good > 1 ? 's' : '') + ' réponse' + (good > 1 ? 's' : '') : 'morceau' + (good > 1 ? 'x' : '') + ' trouvé' + (good > 1 ? 's' : '')}</p>
        <div class="row-end">${isHost ? '<button class="btn" type="button" id="again">Rejouer</button>' : '<p class="note">La personne qui a créé le salon peut relancer une partie.</p>'}${ctl.local ? '<button type="button" class="btn ghost" data-setup>Changer les réglages</button>' : ''}</div>
        <p class="err" id="end-err" aria-live="polite"></p>
      </div>
      <div>
        ${ctl.local ? '' : `<h2 class="sub">Classement final</h2><ol class="plist board">${rank.map((p, k) => playerRow(p, me, `<span class="sc">${p.score || 0} pts</span>`).replace('<li', `<li data-rank="${k + 1}"`)).join('')}</ol>`}
        <h2 class="sub">Tes réponses</h2>
        <div class="scroll"><table class="stack">
          <thead><tr><th>${quizMode ? 'Question' : 'Morceau'}</th><th>Ta réponse</th><th>${quizMode ? 'Bonne réponse' : 'Résultat'}</th></tr></thead>
          <tbody>${rows.map(r => `<tr class="${r.ok ? 'ok' : 'ko'}"><td data-l="${quizMode ? 'Question' : 'Morceau'}">${esc(r.q)}</td><td data-l="Ta réponse">${r.given ? esc(r.given) : '<span class="note">Pas de réponse</span>'}</td><td data-l="${quizMode ? 'Bonne réponse' : 'Résultat'}">${esc(r.res)}</td></tr>`).join('')}</tbody>
        </table></div>
      </div>
    </div>`;
  const ag = $('again');
  if (ag) ag.onclick = async () => {
    ag.disabled = true;
    let items;
    if (quizMode) items = quizItems(st.cfg);
    else {
      const pool = ctl.local ? currentPool() : await (async () => { blind.cfg = Object.assign({}, blind.cfg, st.cfg); try { return await loadDeezer(); } catch (e) { return []; } })();
      if (!pool.length) { $('end-err').textContent = 'Impossible de recharger les morceaux.'; ag.disabled = false; return; }
      items = blindItems(pool, st.cfg);
      unlockAudio();
    }
    const patch = { items, answers: null, status: 'playing', round: { i: 0, phase: 'question', startAt: ctl.now() + (ctl.local ? 1500 : 3000) } };
    Object.keys(st.players || {}).forEach(u => { patch[`players/${u}/score`] = 0; patch[`players/${u}/last`] = 0; });
    ctl.hostUpdate(patch);
  };
};

// Parties variables mises à jour sans tout redessiner.
const updateDynamic = () => {
  if (!cur || !cur.st) return;
  const { ctl, st } = cur;
  const me = ctl.me;
  const pl = $('plist');
  if (pl && st.status === 'lobby') pl.innerHTML = ranking(st).sort((a, b) => (a.joinedAt || 0) - (b.joinedAt || 0)).map(p => playerRow(p, me, p.uid === st.host ? '<span class="sc">hôte</span>' : '')).join('');
  const pts = $('pts'); if (pts) pts.textContent = (((st.players || {})[me] || {}).score || 0) + ' pts';
  const w = $('waiting');
  if (w && st.status === 'playing' && !ctl.local) {
    const on = onlineUids(st), ans = answersAt(st, st.round.i);
    w.textContent = st.round.phase === 'question' ? `${on.filter(u => ans[u]).length} / ${on.length} joueur${on.length > 1 ? 's ont' : ' a'} répondu` : '';
  }
  const bd = $('board');
  if (bd) bd.innerHTML = ranking(st).map((p, k) => playerRow(p, me, `<span class="sc">${p.last ? `<small>+${p.last}</small> ` : ''}${p.score || 0} pts</span>`).replace('<li', `<li data-rank="${k + 1}"`)).join('');
};

// Horloge : compte à rebours, barre de temps, son, et passage automatique à la correction (hôte).
setInterval(() => {
  if (!cur || !cur.st) return;
  const { ctl, st } = cur;
  if (st.status !== 'playing' || st.round.phase !== 'question') return;
  const sec = SECS[st.game];
  const el = (ctl.now() - st.round.startAt) / 1000;
  const pending = el < 0;
  const play = $('play'); if (play) play.classList.toggle('pending', pending);
  const cd = $('countdown');
  if (cd) { cd.classList.toggle('hidden', !pending); cd.textContent = pending ? `Prêt ? ${Math.ceil(-el)}` : ''; }
  const bar = $('bar'); if (bar) bar.style.width = pending ? '100%' : Math.max(0, (sec - el) / sec * 100) + '%';
  if (!pending && st.game === 'blind') playItem(`${ctl.code}|${st.round.startAt}`, st.items[st.round.i]);
  if (st.host === ctl.me && !pending) {
    const on = onlineUids(st), ans = answersAt(st, st.round.i);
    const all = on.length > 0 && on.every(u => ans[u]);
    if ((el >= sec || all) && cur.revealed !== st.round.startAt) {
      cur.revealed = st.round.startAt;
      const item = st.items[st.round.i];
      const patch = { 'round/phase': 'reveal' };
      Object.entries(st.players || {}).forEach(([u, p]) => {
        const a = ans[u];
        const r = grade(st.game, item, a ? a.v : null, a ? (a.t - st.round.startAt) / 1000 : 0);
        patch[`players/${u}/score`] = (p.score || 0) + r.pts;
        patch[`players/${u}/last`] = r.pts;
      });
      ctl.hostUpdate(patch);
    }
  }
}, 100);

// ---------- Pages ----------
const renderGame = (g) => {
  view().innerHTML = `${backHome}
    <div class="game-head">
      <div>
        <h1></h1><p class="desc"></p>
        <div class="meta"><span class="tag">${g.players}</span></div>
        <ol>${g.rules.map(() => '<li></li>').join('')}</ol>
        <div class="status"><strong>En développement</strong><p class="note" style="margin-top:2px">Disponible à l'${g.step.toLowerCase()} du projet.</p></div>
      </div>
      ${covers[g.id]()}
    </div>`;
  view().querySelector('h1').textContent = g.name;
  view().querySelector('.desc').textContent = g.desc;
  view().querySelectorAll('li').forEach((li, i) => { li.textContent = g.rules[i]; });
};

const route = () => {
  const h = location.hash.slice(1);
  const roomCode = (h.match(/^salon-([A-Z0-9]{5})$/i) || [])[1];
  const g = GAMES.find(x => x.id === h);
  const v = view();
  v.onclick = v.oninput = v.onchange = v.onkeydown = null;
  leaveRoom();
  if ((roomCode || (g && g.ready)) && !player) {
    pendingHash = h;
    $('view-home').classList.remove('hidden'); v.classList.add('hidden');
    $('err').textContent = 'Choisis d’abord un pseudo pour jouer.';
    $('pseudo').focus();
    return;
  }
  const inGame = !!(roomCode || g);
  $('view-home').classList.toggle('hidden', inGame);
  v.classList.toggle('hidden', !inGame);
  if (roomCode) { joinRoom(roomCode.toUpperCase()); document.title = 'Salon · Party Games'; }
  else if (g) {
    if (g.id === 'quiz') quizSetup(); else if (g.id === 'blind-test') { blindSetup(); if (!currentPool().length && !blind.loading) loadDeezer(); }
    else renderGame(g);
    document.title = g.name + ' · Party Games';
  } else document.title = 'Party Games';
  window.scrollTo(0, 0);
};

// ---------- Événements ----------
$('avatars').addEventListener('click', (e) => {
  const b = e.target.closest('.av'); if (!b) return;
  picked = +b.dataset.i; renderAvatars();
  $('avatars').querySelector(`[data-i="${picked}"]`).focus();
});

$('profile').addEventListener('submit', (e) => {
  e.preventDefault();
  const name = $('pseudo').value.trim().replace(/\s+/g, ' ');
  if (name.length < 2) { $('err').textContent = 'Le pseudo doit contenir au moins 2 caractères.'; $('pseudo').focus(); return; }
  $('err').textContent = '';
  player = { name, avatar: picked };
  store.set(player);
  renderPlayer();
  if (pendingHash) { const h = pendingHash; pendingHash = ''; if (location.hash.slice(1) === h) route(); else location.hash = h; }
});

$('chip').addEventListener('click', () => {
  $('pseudo').value = player ? player.name : '';
  player = null;
  renderPlayer(); renderAvatars();
  if (location.hash && location.hash !== '#accueil') location.hash = 'accueil';
  $('pseudo').focus();
});

$('join-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const code = $('code').value.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (code.length !== 5) { $('join-err').textContent = 'Le code fait 5 caractères.'; return; }
  $('join-err').textContent = '';
  location.hash = 'salon-' + code;
});

$('grid').addEventListener('click', (e) => {
  const c = e.target.closest('[data-go]'); if (c) location.hash = c.dataset.go;
});

document.addEventListener('click', (e) => { if (e.target.closest('[data-setup]')) route(); });
window.addEventListener('hashchange', route);
renderAvatars(); renderGrid(); renderPlayer(); route();
