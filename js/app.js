// Party Games : accueil, profil, Quiz, Blind test et Devine le mot en solo ou en salon.
import { AV, avatarSvg, covers, GAMES, THEMES, themeName, QUESTIONS } from './data.js?v=10';
import { esc, shuffle, norm, matches, loadCfg, saveCfg } from './util.js?v=10';
import { fetchArtists } from './deezer.js?v=10';
import { MOTS } from './mots.js?v=10';
import { QUI_THEMES, PERSOS } from './qui.js?v=10';

const $ = (id) => document.getElementById(id);
const view = () => $('view-game');
const SECS = { quiz: 20, blind: 30, mot: 180 };
const TITLES = { quiz: 'Quiz', blind: 'Blind test', mot: 'Devine le mot', qui: 'Qui est-ce ?' };
const BACKS = { quiz: 'quiz', blind: 'blind-test', mot: 'devine-le-mot', qui: 'qui-est-ce' };
const MODES = [['choice', '4 propositions'], ['typed', 'Réponse tapée'], ['mix', 'Mélange']];
const COUNTS = [[5, '5'], [10, '10'], [20, '20']];
const backHome = `<a href="#accueil" class="btn ghost back">← Retour aux jeux</a>`;

// Le réseau (Firebase) ne se charge que quand on joue en salon.
let netP = null;
const getNet = () => (netP = netP || import('./net.js?v=10'));

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
    guess(i, v) { st.answers[i] = st.answers[i] || {}; st.answers[i][uid] = { v, t: Date.now() }; emit(); },
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
    blind.msg = err.message === 'empty' ? 'Deezer n\u2019a renvoyé aucun extrait pour ces genres. Réessaie dans un instant.' : 'Impossible de joindre Deezer. Vérifie ta connexion et réessaie.';
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
      <fieldset><legend>Genres <small class="note">· plusieurs choix possibles, clique à nouveau pour retirer</small></legend>
        <div class="toggles">${GENRES.map(([k, name]) => `<button type="button" class="tg" data-genre="${k}" aria-pressed="${c.genres.includes(k)}">${name}</button>`).join('')}</div>
        <p class="note" style="margin-top:10px">${blind.loading ? 'Chargement des morceaux…' : ready ? `${pool.length} extraits prêts · ${c.genres.map(g => GENRES.find(x => x[0] === g)[1]).join(' + ')}` : 'Choisis un ou plusieurs genres.'}</p>
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

// ---------- Devine le mot ----------
const MAX_TRIES = 6;
const MLENS = [[5, '5 lettres'], [6, '6 lettres'], [7, '7 lettres']];
const MCOUNTS = [[1, '1'], [3, '3'], [5, '5'], [10, '10']];
const mot = { cfg: loadCfg('pg-mot', { len: 5, count: 3 }) };
if (!MOTS[mot.cfg.len]) mot.cfg.len = 5;
if (![1, 3, 5, 10].includes(mot.cfg.count)) mot.cfg.count = 3;
const motItems = (cfg) => shuffle(MOTS[cfg.len] || MOTS[5]).slice(0, cfg.count).map(w => ({ w }));
const motLetter = (k) => (k || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase();

// Essais d'un joueur pour la manche i (stockés « MAISON,PORTE,… »).
const motGuesses = (st, i, uid) => { const a = ((st.answers || {})[i] || {})[uid]; return a && a.v ? String(a.v).split(',') : []; };
// c = bien placée, p = présente ailleurs, a = absente (les lettres en double sont comptées correctement).
const motColors = (g, w) => {
  const res = Array(w.length).fill('a'), left = {};
  for (let k = 0; k < w.length; k++) { if (g[k] === w[k]) res[k] = 'c'; else left[w[k]] = (left[w[k]] || 0) + 1; }
  for (let k = 0; k < w.length; k++) if (res[k] !== 'c' && left[g[k]] > 0) { res[k] = 'p'; left[g[k]]--; }
  return res;
};
// Gagnant de la manche : celui qui a trouvé le plus tôt.
const motWinner = (st, i) => {
  const w = st.items[i].w; let best = null;
  Object.entries((st.answers || {})[i] || {}).forEach(([u, a]) => {
    if (a && a.v && String(a.v).split(',').includes(w) && (!best || a.t < best.t)) best = { uid: u, t: a.t, tries: String(a.v).split(',').length };
  });
  return best;
};
const motPoints = (tries, elapsed) => 100 + (MAX_TRIES - tries) * 20 + Math.round(Math.max(0, SECS.mot - elapsed) / SECS.mot * 50);

const motSetup = (focusSel) => {
  const c = mot.cfg;
  view().innerHTML = `${backHome}
    <div class="ghead"><h1>Devine le mot</h1><p class="desc">Trouve le mot secret en ${MAX_TRIES} essais. En salon, tout le monde cherche le même mot : le premier qui trouve gagne la manche.</p></div>
    <div class="setup">
      <fieldset><legend>Longueur du mot</legend><div class="toggles">${toggles(MLENS, 'len', k => c.len === k)}</div></fieldset>
      <fieldset><legend>Nombre de mots</legend><div class="toggles">${toggles(MCOUNTS, 'count', k => c.count === k)}</div></fieldset>
      <div class="row-end">
        <button class="btn" type="button" id="solo">Jouer en solo</button>
        <button class="btn ghost" type="button" id="multi">Créer un salon</button>
        <p class="note">${c.count} mot${c.count > 1 ? 's' : ''} de ${c.len} lettres · ${MAX_TRIES} essais · ${SECS.mot / 60} minutes par mot</p>
      </div>
      <p class="err" id="setup-err" aria-live="polite"></p>
    </div>`;
  if (focusSel) { const f = view().querySelector(focusSel); if (f) f.focus(); }
  view().onclick = (e) => {
    const b = e.target.closest('button'); if (!b || b.disabled) return;
    if (b.dataset.len) { c.len = +b.dataset.len; saveCfg('pg-mot', c); motSetup(`[data-len="${c.len}"]`); return; }
    if (b.dataset.count) { c.count = +b.dataset.count; saveCfg('pg-mot', c); motSetup(`[data-count="${c.count}"]`); return; }
    if (b.id === 'solo') { saveCfg('pg-mot', c); startSolo('mot', c, motItems(c)); }
    else if (b.id === 'multi') { saveCfg('pg-mot', c); createRoom('mot', c, motItems(c), b); }
  };
};

const KB = ['AZERTYUIOP', 'QSDFGHJKLM', 'WXCVBN'];
const tileRow = (letters, L, colors, extra) => `<div class="wrow"${extra || ''}>${Array.from({ length: L }, (_, k) => `<span class="tile${colors ? ' ' + colors[k] : letters[k] ? ' typed' : ''}">${letters[k] ? esc(letters[k]) : ''}</span>`).join('')}</div>`;

const renderMot = (back, isHost) => {
  const { ctl, st } = cur;
  const i = st.round.i, item = st.items[i], L = item.w.length, total = st.items.length;
  const reveal = st.round.phase === 'reveal';
  const mine = motGuesses(st, i, ctl.me);
  const found = mine.includes(item.w);
  const over = reveal || found || mine.length >= MAX_TRIES;
  const rk = `${i}|${st.round.startAt}`;
  if (cur.typedFor !== rk) { cur.typedFor = rk; cur.typed = ''; }
  if (over) cur.typed = '';

  let rows = '';
  for (let r = 0; r < MAX_TRIES; r++) {
    if (r < mine.length) rows += tileRow(mine[r], L, motColors(mine[r], item.w));
    else if (r === mine.length && !over) rows += tileRow(cur.typed, L, null, ' id="cur-row"');
    else rows += tileRow('', L, null);
  }
  const best = {};
  const rank = { c: 3, p: 2, a: 1 };
  mine.forEach(g => motColors(g, item.w).forEach((c, k) => { if (!best[g[k]] || rank[c] > rank[best[g[k]]]) best[g[k]] = c; }));
  const kb = KB.map((row, n) => `<div class="krow">${n === 2 ? '<button type="button" class="key wide" data-key="ENTER">Entrée</button>' : ''}${[...row].map(l => `<button type="button" class="key ${best[l] || ''}" data-key="${l}">${l}</button>`).join('')}${n === 2 ? '<button type="button" class="key wide" data-key="BACK" aria-label="Effacer">⌫</button>' : ''}</div>`).join('');

  let fb = '', fbCls = '';
  if (reveal) {
    const mw = motWinner(st, i), win = mw && mw.uid;
    const wp = win && (st.players || {})[win];
    if (win === ctl.me) { fbCls = 'ok'; fb = ctl.local ? `Trouvé en ${mine.length} essai${mine.length > 1 ? 's' : ''}, +${((st.players || {})[ctl.me] || {}).last || 0} points.` : `Tu as trouvé en premier ! +${((st.players || {})[ctl.me] || {}).last || 0} points.`; }
    else if (wp) { fbCls = 'ko'; fb = `${wp.name} a trouvé en premier. Le mot était : ${item.w}.`; }
    else { fbCls = 'ko'; fb = `${ctl.local ? 'Raté' : 'Personne n’a trouvé'}. Le mot était : ${item.w}.`; }
  } else if (found) fb = 'Trouvé !';
  else if (mine.length >= MAX_TRIES) { fbCls = 'ko'; fb = 'Plus d’essais. Attends la fin de la manche.'; }

  const last = i + 1 >= total;
  view().innerHTML = `${back}
    <div class="play mot" id="play">
      <div class="hud"><span>Mot ${i + 1} / ${total} · ${L} lettres${ctl.code ? ` · salon ${esc(ctl.code)}` : ''}</span><span id="pts"></span></div>
      <div class="timer" aria-hidden="true"><i id="bar"${reveal ? ' style="width:0"' : ''}></i></div>
      <div class="countdown hidden" id="countdown" aria-live="polite"></div>
      <div class="motwrap">
        <div class="qa">
          <div class="wgrid" style="--L:${L}" aria-label="Grille de jeu">${rows}</div>
          <p class="fb ${fbCls}" id="fb" aria-live="polite">${esc(fb)}</p>
          ${over ? '' : `<div class="kb" id="kb">${kb}</div>`}
        </div>
        ${ctl.local ? '' : `<div><h2 class="sub" style="margin-top:0">${reveal ? 'Classement' : 'Adversaires'}</h2><ol class="plist${reveal ? ' board' : ''}" id="${reveal ? 'board' : 'rivals'}"></ol></div>`}
      </div>
      <div class="row-end" id="nx">${reveal ? (isHost ? `<button class="btn" type="button" id="next">${last ? 'Voir le résultat' : 'Mot suivant'}</button>` : '<p class="note">La personne qui a créé le salon passe à la suite.</p>') : ''}</div>
    </div>`;

  view().onclick = (e) => { const k = e.target.closest('[data-key]'); if (k) motKey(k.dataset.key); };
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

const motKey = (key) => {
  if (!cur || !cur.st || cur.st.game !== 'mot') return;
  const { ctl, st } = cur;
  if (st.status !== 'playing' || st.round.phase !== 'question' || ctl.now() < st.round.startAt) return;
  const i = st.round.i, w = st.items[i].w;
  const mine = motGuesses(st, i, ctl.me);
  if (mine.includes(w) || mine.length >= MAX_TRIES) return;
  const fb = $('fb');
  if (key === 'BACK') cur.typed = cur.typed.slice(0, -1);
  else if (key === 'ENTER') {
    if (cur.typed.length < w.length) { if (fb) { fb.className = 'fb ko'; fb.textContent = `Le mot fait ${w.length} lettres.`; } return; }
    if (cur.sentAt === `${i}|${mine.length}`) return;
    cur.sentAt = `${i}|${mine.length}`;
    const g = cur.typed; cur.typed = '';
    ctl.guess(i, [...mine, g].join(','));
    return;
  } else if (/^[A-Z]$/.test(key) && cur.typed.length < w.length) cur.typed += key;
  if (fb) { fb.className = 'fb'; fb.textContent = ''; }
  const row = $('cur-row');
  if (row) row.querySelectorAll('.tile').forEach((t, k) => { t.textContent = cur.typed[k] || ''; t.classList.toggle('typed', !!cur.typed[k]); });
};

document.addEventListener('keydown', (e) => {
  if (!cur || !cur.st || cur.st.game !== 'mot' || e.ctrlKey || e.metaKey || e.altKey) return;
  if (e.target.closest && e.target.closest('input, textarea')) return;
  if (e.key === 'Enter') { if (e.target.closest && e.target.closest('button') && !e.target.closest('[data-key]')) return; e.preventDefault(); motKey('ENTER'); }
  else if (e.key === 'Backspace') { e.preventDefault(); motKey('BACK'); }
  else { const l = motLetter(e.key); if (/^[A-Z]$/.test(l)) motKey(l); }
});

// ---------- Qui est-ce ----------
// Chaque joueur n'écrit que sa propre fiche (answers/0/<uid>) : personnages baissés, questions posées,
// réponses données et proposition finale. Le tour de jeu se déduit des deux fiches.
const QSIZES = [[16, '16'], [24, '24'], [30, '30']];
const qui = { cfg: loadCfg('pg-qui', { themes: ['kpop'], size: 24 }) };
qui.cfg.themes = (Array.isArray(qui.cfg.themes) ? qui.cfg.themes : []).filter(t => PERSOS[t]);
if (!qui.cfg.themes.length) qui.cfg.themes = ['kpop'];
if (![16, 24, 30].includes(qui.cfg.size)) qui.cfg.size = 24;
const quiPool = (cfg) => (cfg.themes || []).flatMap(t => PERSOS[t] || []);
const quiItems = (cfg) => ({ board: shuffle(quiPool(cfg)).slice(0, cfg.size).map(p => ({ n: p.n, s: p.s || '', img: p.img || '' })) });
const quiDeal = (board, order) => { const [x, y] = shuffle(board.map((_, k) => k)); return { board, order, secrets: { [order[0]]: x, [order[1]]: y } }; };
const quiPair = (st) => Object.entries(st.players || {}).filter(([, p]) => p.online !== false)
  .sort((a, b) => (a[1].joinedAt || 0) - (b[1].joinedAt || 0)).slice(0, 2).map(([u]) => u);

const quiRead = (st, u) => {
  const a = (((st.answers || {})[0]) || {})[u]; let v = {};
  try { v = a && a.v ? JSON.parse(a.v) : {}; } catch (e) { v = {}; }
  return { down: v.down || [], qs: v.qs || [], rs: v.rs || [], g: Number.isInteger(v.g) ? v.g : null };
};
// Ma fiche : la copie locale fait foi (évite de perdre un clic pendant l'envoi).
const quiOf = (st, u) => (cur && cur.qm && u === cur.ctl.me ? cur.qm : quiRead(st, u));
const quiSave = () => {
  if (!cur || !cur.qm) return;
  const c = cur, v = JSON.stringify(c.qm);
  Promise.resolve((c.ctl.put || c.ctl.guess).call(c.ctl, 0, v)).then(() => { if (c.qerr) { c.qerr = ''; const e = $('qerr'); if (e) e.textContent = ''; } })
    .catch((err) => { c.qerr = 'Ton action n’a pas été transmise à l’adversaire (le serveur Firebase l’a refusée). Vérifie les règles de la base de données.'; const e = $('qerr'); if (e) e.textContent = c.qerr; console.error('Qui est-ce : écriture refusée', err); });
};

const quiFlow = (st) => {
  const [A, B] = st.items.order, sa = quiOf(st, A), sb = quiOf(st, B);
  const g = sa.g !== null ? A : sb.g !== null ? B : null;
  if (g) {
    const opp = g === A ? B : A, pick = (g === A ? sa : sb).g, ok = pick === st.items.secrets[opp];
    return { kind: 'end', guesser: g, winner: ok ? g : opp, ok, pick };
  }
  if (sa.qs.length > sb.rs.length) return { kind: 'answer', who: B, asker: A, q: sa.qs[sb.rs.length] };
  if (sb.qs.length > sa.rs.length) return { kind: 'answer', who: A, asker: B, q: sb.qs[sa.rs.length] };
  return { kind: 'ask', who: sa.qs.length === sb.qs.length ? A : B };
};

const quiLog = (st) => {
  const [A, B] = st.items.order, sa = quiOf(st, A), sb = quiOf(st, B), out = [];
  for (let k = 0; k < Math.max(sa.qs.length, sb.qs.length); k++) {
    if (sa.qs[k] !== undefined) out.push({ u: A, q: sa.qs[k], r: sb.rs[k] });
    if (sb.qs[k] !== undefined) out.push({ u: B, q: sb.qs[k], r: sa.rs[k] });
  }
  return out;
};

const initials = (n) => n.replace(/[’'-]/g, ' ').split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();
const hueOf = (n) => [...n].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 7);
const face = (p) => `<span class="face">${p.img ? `<img src="${esc(p.img)}" alt="" loading="lazy">` : `<span class="ini" style="--h:${hueOf(p.n)}">${esc(initials(p.n))}</span>`}</span>`;
const persoCard = (p, k, cls, dis) => `<button type="button" class="pc${cls}" data-p="${k}"${dis ? ' disabled' : ''}>${face(p)}<span class="nm">${esc(p.n)}</span>${p.s ? `<small>${esc(p.s)}</small>` : ''}</button>`;
const ansCls = (r) => (r === 'Oui' ? 'oui' : r === 'Non' ? 'non' : '');

const quiSetup = (focusSel) => {
  const c = qui.cfg, avail = quiPool(c).length, n = Math.min(avail, c.size);
  view().innerHTML = `${backHome}
    <div class="ghead"><h1>Qui est-ce ?</h1><p class="desc">Chacun reçoit une personnalité secrète. Posez des questions fermées à tour de rôle et trouvez celle de l'autre en premier.</p></div>
    <div class="setup">
      <fieldset><legend>Thèmes <small class="note">· plusieurs choix possibles, ils se mélangent</small></legend><div class="toggles">${QUI_THEMES.map(([k, name]) => `<button type="button" class="tg" data-th="${k}" aria-pressed="${c.themes.includes(k)}">${name} <small>${PERSOS[k].length}</small></button>`).join('')}</div></fieldset>
      <fieldset><legend>Taille du plateau</legend><div class="toggles">${toggles(QSIZES, 'size', k => c.size === k, k => k > avail)}</div></fieldset>
      <div class="row-end">
        <button class="btn" type="button" id="multi">Créer un salon</button>
        <p class="note">2 joueurs · ${n} personnalités · à distance ou côte à côte, chacun sur son écran</p>
      </div>
      <p class="err" id="setup-err" aria-live="polite"></p>
    </div>`;
  if (focusSel) { const f = view().querySelector(focusSel); if (f) f.focus(); }
  view().onclick = (e) => {
    const b = e.target.closest('button'); if (!b || b.disabled) return;
    if (b.dataset.th) {
      const k = b.dataset.th;
      if (c.themes.includes(k)) { if (c.themes.length > 1) c.themes = c.themes.filter(x => x !== k); } else c.themes = [...c.themes, k];
      saveCfg('pg-qui', c); quiSetup(`[data-th="${k}"]`); return;
    }
    if (b.dataset.size) { c.size = +b.dataset.size; saveCfg('pg-qui', c); quiSetup(`[data-size="${c.size}"]`); return; }
    if (b.id === 'multi') { saveCfg('pg-qui', c); createRoom('qui', c, quiItems(c), b); }
  };
};

const renderQui = (back, isHost) => {
  const { ctl, st } = cur, me = ctl.me, it = st.items, board = it.board || [], order = it.order || [];
  const rk = String(st.round.startAt);
  const qi = $('qq'), hadFocus = !!(qi && document.activeElement === qi);
  if (qi) cur.qdraft = qi.value;
  if (cur.qmFor !== rk) { cur.qmFor = rk; cur.qm = order.includes(me) ? quiRead(st, me) : null; cur.qpick = null; cur.qdraft = ''; }
  const playing = !!cur.qm, opp = order.find(u => u !== me);
  const P = (u) => (st.players || {})[u] || { name: '?' };
  const nm = (u) => (u === me ? 'Toi' : esc(P(u).name));
  const f = quiFlow(st), ended = f.kind === 'end';
  const picking = playing && !ended && cur.qpick !== null;

  // Hôte : une manche gagnée = 1 point, compté une seule fois.
  if (ended && isHost && cur.scored !== rk) {
    cur.scored = rk;
    ctl.hostUpdate({ [`players/${f.winner}/score`]: ((P(f.winner).score) || 0) + 1, [`players/${f.winner}/last`]: 1 });
  }

  const down = new Set(playing ? cur.qm.down : []);
  const cards = board.map((p, k) => {
    let cls = '';
    if (ended) { if (k === it.secrets[opp] || (!playing && order.some(u => it.secrets[u] === k))) cls += ' win'; else if (down.has(k)) cls += ' down'; }
    else { if (down.has(k)) cls += ' down'; if (picking && cur.qpick === k) cls += ' pick'; }
    return persoCard(p, k, cls, !playing || ended);
  }).join('');

  let act = '';
  if (ended) {
    const gp = board[f.pick], oppOfG = order.find(u => u !== f.guesser);
    const won = f.winner === me;
    act = `<p class="qtext ${won ? 'okc' : playing ? 'koc' : ''}">${playing ? (won ? 'Gagné !' : 'Perdu…') : `${esc(P(f.winner).name)} gagne la manche`}</p>
      <p>${nm(f.guesser)} ${f.guesser === me ? 'as' : 'a'} proposé <b>${esc(gp ? gp.n : '?')}</b> : ${f.ok ? 'c’était la bonne réponse.' : `raté, c’était <b>${esc(board[it.secrets[oppOfG]].n)}</b>.`}</p>
      ${playing && opp ? `<p class="note">Personnalité de ${esc(P(opp).name)} : <b>${esc(board[it.secrets[opp]].n)}</b></p>` : ''}
      <div class="btns">${isHost ? '<button class="btn" type="button" id="again">Nouvelle manche</button>' : '<p class="note">La personne qui a créé le salon lance la manche suivante.</p>'}</div>
      <p class="err" id="end-err" aria-live="polite"></p>`;
  } else if (!playing) {
    act = `<p class="note">Tu regardes la partie entre ${esc(P(order[0]).name)} et ${esc(P(order[1]).name)}.</p>`;
  } else if (picking) {
    const pp = board[cur.qpick];
    act = pp
      ? `<p>Tu proposes <b>${esc(pp.n)}</b>. Si c'est faux, tu perds la manche.</p><div class="btns"><button class="btn" type="button" id="confirm">Valider</button><button class="btn ghost" type="button" id="cancel">Annuler</button></div>`
      : `<p><b>Clique sur la personnalité que tu proposes.</b></p><div class="btns"><button class="btn ghost" type="button" id="cancel">Annuler</button></div>`;
  } else if (f.kind === 'ask' && f.who === me) {
    act = `<p><b>À toi de poser une question.</b></p>
      <form id="askf" class="askf"><input type="text" id="qq" maxlength="120" autocomplete="off" placeholder="Ex. : Est-ce une femme ?" aria-label="Ta question"><button class="btn" type="submit">Poser</button></form>
      <p class="note">Vous êtes côte à côte ? Laisse vide et pose-la à voix haute.</p>
      <button class="btn ghost" type="button" id="guess">Proposer une personnalité</button>`;
  } else if (f.kind === 'ask') {
    act = `<p>${esc(P(f.who).name)} prépare sa question…</p>`;
  } else if (f.who === me) {
    act = `<p class="note">${esc(P(f.asker).name)} demande :</p><p class="qtext">${esc(f.q)}</p>
      <div class="btns"><button class="btn" type="button" data-r="Oui">Oui</button><button class="btn" type="button" data-r="Non">Non</button><button class="btn ghost" type="button" data-r="Je ne sais pas">Je ne sais pas</button></div>`;
  } else {
    act = `<p class="note">Ta question :</p><p class="qtext">${esc(f.q)}</p><p class="note">En attente de la réponse de ${esc(P(f.who).name)}…</p>`;
  }

  const log = quiLog(st);
  const plRows = order.map(u => {
    const left = board.length - quiOf(st, u).down.length;
    return playerRow({ uid: u, ...P(u) }, me, `<span class="sc">${left} restant${left > 1 ? 's' : ''} · ${P(u).score || 0} pt${(P(u).score || 0) > 1 ? 's' : ''}</span>`);
  }).join('');
  const mine = playing ? board[it.secrets[me]] : null;

  view().innerHTML = `${back}
    <div class="qui" id="play">
      <div class="hud"><span>Qui est-ce ?${ctl.code ? ` · salon ${esc(ctl.code)}` : ''}</span><span>${board.length} personnalités</span></div>
      <div class="quiwrap">
        <div class="qboard${picking ? ' picking' : ''}" aria-label="Plateau : clique sur une personnalité pour la baisser ou la relever">${cards}</div>
        <aside class="qside">
          ${mine ? `<div class="secret">${face(mine)}<div><p class="note">Ta personnalité secrète</p><strong>${esc(mine.n)}</strong>${mine.s ? `<small>${esc(mine.s)}</small>` : ''}</div></div>` : ''}
          <div class="qact" aria-live="polite">${act}<p class="err" id="qerr">${esc(cur.qerr || '')}</p></div>
        </aside>
        <div class="qinfo">
          <div><h2 class="sub">Joueurs</h2><ul class="plist">${plRows}</ul></div>
          <div><h2 class="sub">Questions</h2>${log.length ? `<ol class="qlog">${log.map(l => `<li><span class="note">${nm(l.u)}</span> ${esc(l.q)} <span class="ans ${ansCls(l.r)}">${l.r ? esc(l.r) : '…'}</span></li>`).join('')}</ol>` : '<p class="note">Aucune question pour l’instant.</p>'}</div>
        </div>
      </div>
    </div>`;
  const lg = view().querySelector('.qlog'); if (lg) lg.scrollTop = lg.scrollHeight;
  const q2 = $('qq');
  if (q2) { q2.value = cur.qdraft || ''; if (hadFocus) { q2.focus(); q2.setSelectionRange(q2.value.length, q2.value.length); } }

  view().onclick = (e) => {
    const b = e.target.closest('button'); if (!b || b.disabled || !cur || !cur.qm) return;
    const F = quiFlow(cur.st);
    if (b.dataset.p !== undefined) {
      const k = +b.dataset.p;
      if (cur.qpick !== null) cur.qpick = k;
      else { const d = new Set(cur.qm.down); if (d.has(k)) d.delete(k); else d.add(k); cur.qm.down = [...d]; quiSave(); }
      renderQui(back, isHost);
      const nb = view().querySelector(`[data-p="${k}"]`); if (nb) nb.focus();
      return;
    }
    if (b.id === 'guess') { cur.qpick = -1; renderQui(back, isHost); return; }
    if (b.id === 'cancel') { cur.qpick = null; renderQui(back, isHost); return; }
    if (b.id === 'confirm' && F.kind === 'ask' && F.who === me && board[cur.qpick]) { cur.qm.g = cur.qpick; cur.qpick = null; quiSave(); renderQui(back, isHost); return; }
    if (b.dataset.r && F.kind === 'answer' && F.who === me) { cur.qm.rs = [...cur.qm.rs, b.dataset.r]; quiSave(); renderQui(back, isHost); return; }
    if (b.id === 'again' && isHost) {
      b.disabled = true;
      const pair = quiPair(cur.st);
      if (pair.length < 2) { $('end-err').textContent = 'Il faut deux joueurs connectés.'; b.disabled = false; return; }
      const ord = pair.includes(order[0]) && pair.includes(order[1]) ? [order[1], order[0]] : shuffle(pair);
      ctl.hostUpdate({ items: quiDeal(quiItems(cur.st.cfg).board, ord), answers: null, round: { i: 0, phase: 'question', startAt: ctl.now() } });
    }
  };
  const af = $('askf');
  if (af) af.onsubmit = (e) => {
    e.preventDefault();
    const F = quiFlow(cur.st); if (!(F.kind === 'ask' && F.who === me)) return;
    const v = $('qq').value.trim().replace(/\s+/g, ' ') || '(question posée à voix haute)';
    cur.qdraft = ''; cur.qm.qs = [...cur.qm.qs, v]; quiSave(); renderQui(back, isHost);
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
  cur = { ctl, st: null, key: '', back: BACKS[game] };
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
  if (st.game === 'qui' && st.status === 'playing') { cur.key = 'qui'; renderRoom(); updateDynamic(); return; }
  const me = cur.ctl.me;
  const answered = st.game === 'mot' ? motGuesses(st, st.round.i, me).length : !!answersAt(st, st.round.i)[me];
  const key = [st.status, st.round.i, st.round.phase, st.round.startAt, answered].join('|');
  if (key !== cur.key) { cur.key = key; renderRoom(); }
  updateDynamic();
};

const renderRoom = () => {
  const { ctl, st } = cur;
  const isHost = st.host === ctl.me;
  const quizMode = st.game === 'quiz';
  const title = TITLES[st.game] || 'Partie';
  const motMode = st.game === 'mot';
  const back = ctl.local ? `<button type="button" class="btn ghost back" data-setup>← Réglages</button>` : `<a href="#accueil" class="btn ghost back">← Quitter le salon</a>`;
  view().onclick = null; view().oninput = null; view().onchange = null; view().onkeydown = null;

  if (st.status === 'lobby') {
    stopAudio();
    const link = `${location.origin}${location.pathname}#salon-${ctl.code}`;
    const quiMode = st.game === 'qui';
    const n = quiMode ? ((st.items || {}).board || []).length : (st.items || []).length;
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
          <div class="ghead" style="margin-top:0"><h1>${title}</h1><p class="desc">${quiMode ? `${n} personnalités · 2 joueurs · le premier qui trouve la personnalité de l’autre gagne` : motMode ? `${n} mot${n > 1 ? 's' : ''} de ${(st.cfg || {}).len || 5} lettres · ${MAX_TRIES} essais · le premier qui trouve gagne la manche` : `${n} ${quizMode ? 'question' : 'morceau'}${n > 1 ? (quizMode ? 's' : 'x') : ''} · ${SECS[st.game]} secondes chacun${quizMode ? 'e' : ''}`}</p></div>
          <h2 class="sub">Joueurs</h2>
          <ul class="plist" id="plist"></ul>
          ${st.game === 'blind' ? '<button class="btn ghost" type="button" id="unlock">Activer le son sur cet appareil</button>' : ''}
          <div class="row-end" style="margin-top:16px">${isHost ? `<button class="btn" type="button" id="start">Lancer la partie</button><p class="note" id="start-note">${quiMode ? 'Il faut deux joueurs.' : 'Lance quand tout le monde est là.'}</p>` : '<p class="note">En attente du lancement par la personne qui a créé le salon.</p>'}</div>
        </div>
      </div>`;
    $('copy').onclick = () => {
      const msg = $('copy-msg');
      navigator.clipboard.writeText(link).then(() => { msg.textContent = 'Lien copié.'; }).catch(() => { msg.textContent = link; });
    };
    const ul = $('unlock'); if (ul) ul.onclick = () => { unlockAudio(); ul.textContent = 'Son activé'; ul.disabled = true; };
    const sb = $('start');
    if (sb && quiMode) sb.onclick = () => {
      const pair = quiPair(cur.st); if (pair.length < 2) return;
      sb.disabled = true;
      ctl.hostUpdate({ items: quiDeal(cur.st.items.board, shuffle(pair)), answers: null, status: 'playing', round: { i: 0, phase: 'question', startAt: ctl.now() } });
    };
    else if (sb) sb.onclick = () => { unlockAudio(); sb.disabled = true; ctl.hostUpdate({ status: 'playing', round: { i: 0, phase: 'question', startAt: ctl.now() + 3000 } }); };
    return;
  }

  if (st.status === 'ended') { renderEnd(back, isHost); return; }
  if (st.game === 'qui') { renderQui(back, isHost); return; }
  if (motMode) { renderMot(back, isHost); return; }

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
  const motMode = st.game === 'mot';
  const me = ctl.me;
  const rows = (st.items || []).map((it, i) => {
    if (motMode) {
      const g = motGuesses(st, i, me), mw = motWinner(st, i), win = mw && mw.uid, wp = win && (st.players || {})[win];
      const got = g.includes(it.w);
      return { q: it.w, given: g.length ? (got ? `Trouvé en ${g.length}` : `${g.length} essai${g.length > 1 ? 's' : ''}`) : '', res: ctl.local ? (got ? 'Trouvé' : 'Raté') : (wp ? wp.name : 'Personne'), ok: win === me };
    }
    const a = answersAt(st, i)[me];
    const r = grade(st.game, it, a ? a.v : null, 0);
    return { q: quizMode ? it.q : it.label, given: a ? a.v : '', res: quizMode ? it.a : r.res, ok: r.ok };
  });
  const cols = motMode ? ['Mot', 'Tes essais', ctl.local ? 'Résultat' : 'Gagnant'] : quizMode ? ['Question', 'Ta réponse', 'Bonne réponse'] : ['Morceau', 'Ta réponse', 'Résultat'];
  const rank = ranking(st);
  const mineP = (st.players || {})[me] || { score: 0 };
  const good = rows.filter(r => r.ok).length;
  const pos = rank.findIndex(p => p.uid === me) + 1;
  view().innerHTML = `${back}
    <div class="res">
      <div>
        <p class="note">${ctl.local ? 'Score final' : `Tu termines ${pos === 1 ? '1er' : pos + 'e'} sur ${rank.length}`}</p>
        <div class="result-big">${mineP.score || 0}</div>
        <p class="desc">${good} sur ${rows.length} ${motMode ? (ctl.local ? 'mot' + (good > 1 ? 's' : '') + ' trouvé' + (good > 1 ? 's' : '') : 'manche' + (good > 1 ? 's' : '') + ' gagnée' + (good > 1 ? 's' : '')) : quizMode ? 'bonne' + (good > 1 ? 's' : '') + ' réponse' + (good > 1 ? 's' : '') : 'morceau' + (good > 1 ? 'x' : '') + ' trouvé' + (good > 1 ? 's' : '')}</p>
        <div class="row-end">${isHost ? '<button class="btn" type="button" id="again">Rejouer</button>' : '<p class="note">La personne qui a créé le salon peut relancer une partie.</p>'}${ctl.local ? '<button type="button" class="btn ghost" data-setup>Changer les réglages</button>' : ''}</div>
        <p class="err" id="end-err" aria-live="polite"></p>
      </div>
      <div>
        ${ctl.local ? '' : `<h2 class="sub">Classement final</h2><ol class="plist board">${rank.map((p, k) => playerRow(p, me, `<span class="sc">${p.score || 0} pts</span>`).replace('<li', `<li data-rank="${k + 1}"`)).join('')}</ol>`}
        <h2 class="sub">Tes réponses</h2>
        <div class="scroll"><table class="stack">
          <thead><tr>${cols.map(c => `<th>${c}</th>`).join('')}</tr></thead>
          <tbody>${rows.map(r => `<tr class="${r.ok ? 'ok' : 'ko'}"><td data-l="${cols[0]}">${esc(r.q)}</td><td data-l="${cols[1]}">${r.given ? esc(r.given) : `<span class="note">${motMode ? 'Aucun essai' : 'Pas de réponse'}</span>`}</td><td data-l="${cols[2]}">${esc(r.res)}</td></tr>`).join('')}</tbody>
        </table></div>
      </div>
    </div>`;
  const ag = $('again');
  if (ag) ag.onclick = async () => {
    ag.disabled = true;
    let items;
    if (quizMode) items = quizItems(st.cfg);
    else if (motMode) items = motItems(st.cfg);
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
  const qs = $('start'), qn = $('start-note');
  if (qs && st.status === 'lobby' && st.game === 'qui') {
    const k = onlineUids(st).length;
    qs.disabled = k < 2;
    if (qn) qn.textContent = k < 2 ? 'En attente d’un deuxième joueur…' : k > 2 ? 'Les deux premiers arrivés jouent, les autres regardent.' : 'Vous êtes deux, c’est parti quand tu veux.';
  }
  const pts = $('pts'); if (pts) pts.textContent = (((st.players || {})[me] || {}).score || 0) + ' pts';
  const w = $('waiting');
  if (w && st.status === 'playing' && !ctl.local && st.game !== 'mot') {
    const on = onlineUids(st), ans = answersAt(st, st.round.i);
    w.textContent = st.round.phase === 'question' ? `${on.filter(u => ans[u]).length} / ${on.length} joueur${on.length > 1 ? 's ont' : ' a'} répondu` : '';
  }
  const rv = $('rivals');
  if (rv && st.game === 'mot' && st.status === 'playing') {
    const i = st.round.i, wd = st.items[i].w;
    rv.innerHTML = ranking(st).filter(p => p.uid !== me).map(p => {
      const g = motGuesses(st, i, p.uid);
      const mini = `<span class="mini" style="--L:${wd.length}">${g.map(x => motColors(x, wd).map(c => `<i class="${c}"></i>`).join('')).join('')}</span>`;
      return playerRow(p, me, `${mini}<span class="sc">${g.length}/${MAX_TRIES}</span>`);
    }).join('') || '<li><span class="pn note">En attente d’autres joueurs</span></li>';
  }
  const bd = $('board');
  if (bd) bd.innerHTML = ranking(st).map((p, k) => playerRow(p, me, `<span class="sc">${p.last ? `<small>+${p.last}</small> ` : ''}${p.score || 0} pts</span>`).replace('<li', `<li data-rank="${k + 1}"`)).join('');
};

// Horloge : compte à rebours, barre de temps, son, et passage automatique à la correction (hôte).
setInterval(() => {
  if (!cur || !cur.st) return;
  const { ctl, st } = cur;
  if (st.status !== 'playing' || st.round.phase !== 'question' || st.game === 'qui') return;
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
    if (st.game === 'mot') {
      const i = st.round.i, win = motWinner(st, i);
      const allDone = on.length > 0 && on.every(u => motGuesses(st, i, u).length >= MAX_TRIES);
      if ((el >= sec || win || allDone) && cur.revealed !== st.round.startAt) {
        cur.revealed = st.round.startAt;
        const patch = { 'round/phase': 'reveal' };
        Object.entries(st.players || {}).forEach(([u, p]) => {
          const pts = win && win.uid === u ? motPoints(win.tries, (win.t - st.round.startAt) / 1000) : 0;
          patch[`players/${u}/score`] = (p.score || 0) + pts;
          patch[`players/${u}/last`] = pts;
        });
        ctl.hostUpdate(patch);
      }
      return;
    }
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
    if (g.id === 'quiz') quizSetup(); else if (g.id === 'qui-est-ce') quiSetup(); else if (g.id === 'devine-le-mot') motSetup(); else if (g.id === 'blind-test') { blindSetup(); if (!currentPool().length && !blind.loading) loadDeezer(); }
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
