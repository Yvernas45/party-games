// Connexion à Firebase : comptes invités anonymes et salons en temps réel.
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
import { getDatabase, ref, set, get, update, onValue, onDisconnect, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-database.js';

const firebaseConfig = {
  apiKey: 'AIzaSyB7Q5QNG2ch6TnOkLyvLTD1TkECh_uD1yI',
  authDomain: 'party-games-53434.firebaseapp.com',
  databaseURL: 'https://party-games-53434-default-rtdb.europe-west1.firebasedatabase.app',
  projectId: 'party-games-53434',
  storageBucket: 'party-games-53434.firebasestorage.app',
  messagingSenderId: '967370451813',
  appId: '1:967370451813:web:2202cc6deb91513f174f8c'
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

// Horloge commune : décalage entre cet appareil et le serveur.
let offset = 0;
onValue(ref(db, '.info/serverTimeOffset'), (s) => { offset = s.val() || 0; });
export const now = () => Date.now() + offset;

let uidPromise = null;
export const ready = () => {
  if (!uidPromise) {
    uidPromise = new Promise((resolve, reject) => {
      const stop = onAuthStateChanged(auth, (u) => { if (u) { stop(); resolve(u.uid); } });
      signInAnonymously(auth).catch(reject);
    });
  }
  return uidPromise;
};

const ALPHA = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const newCode = () => Array.from({ length: 5 }, () => ALPHA[Math.floor(Math.random() * ALPHA.length)]).join('');
const clean = (v) => JSON.parse(JSON.stringify(v));

export async function createRoom(game, cfg, items, me) {
  const uid = await ready();
  for (let k = 0; k < 6; k++) {
    const code = newCode();
    const r = ref(db, 'rooms/' + code);
    if ((await get(r)).exists()) continue;
    await set(r, clean({
      host: uid, game, cfg, items, status: 'lobby', createdAt: Date.now(),
      round: { i: 0, phase: 'question', startAt: 0 },
      players: { [uid]: { name: me.name, avatar: me.avatar, score: 0, last: 0, online: true, joinedAt: Date.now() } }
    }));
    return code;
  }
  throw new Error('code');
}

// Ouvre un salon existant et renvoie un « contrôleur » commun avec le mode solo.
export async function openRoom(code, me) {
  const uid = await ready();
  const r = ref(db, 'rooms/' + code);
  const snap = await get(r);
  if (!snap.exists()) throw new Error('absent');
  const prev = (snap.val().players || {})[uid];
  await set(ref(db, `rooms/${code}/players/${uid}`), {
    name: me.name, avatar: me.avatar,
    score: prev ? prev.score || 0 : 0, last: prev ? prev.last || 0 : 0,
    online: true, joinedAt: prev && prev.joinedAt ? prev.joinedAt : Date.now()
  });
  const onlineRef = ref(db, `rooms/${code}/players/${uid}/online`);
  onDisconnect(onlineRef).set(false);
  const listeners = [];
  const unsub = onValue(r, (s) => { const v = s.val(); if (v) listeners.forEach(f => f(v)); });
  return {
    code, me: uid, local: false, now,
    subscribe(f) { listeners.push(f); },
    close() { unsub(); set(onlineRef, false).catch(() => {}); },
    answer(i, v) { return set(ref(db, `rooms/${code}/answers/${i}/${uid}`), { v, t: now() }).catch(() => {}); },
    hostUpdate(patch) { return update(r, clean(patch)); }
  };
}

export { serverTimestamp };
