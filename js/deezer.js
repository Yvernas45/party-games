// Extraits Deezer : API publique, sans compte, appelée en JSONP.
import { norm } from './util.js?v=12';

let n = 0;
const jsonp = (path) => new Promise((resolve, reject) => {
  const cb = '__dz' + (++n) + '_' + Date.now();
  const s = document.createElement('script');
  const done = () => { clearTimeout(timer); delete window[cb]; s.remove(); };
  const timer = setTimeout(() => { done(); reject(new Error('timeout')); }, 12000);
  window[cb] = (d) => { done(); if (d && d.error) reject(new Error(d.error.message || 'deezer')); else resolve(d || {}); };
  s.onerror = () => { done(); reject(new Error('network')); };
  s.src = `https://api.deezer.com${path}${path.includes('?') ? '&' : '?'}output=jsonp&callback=${cb}`;
  document.head.appendChild(s);
});

const tidy = (t) => String(t || '').replace(/\s*[([](feat|ft|with|prod)\.?[^)\]]*[)\]]/ig, '').trim();
const toTrack = (t) => ({ url: t.preview, title: tidy(t.title_short || t.title), artist: t.artist ? t.artist.name : '', seek: false });

export const playlistId = (s) => {
  const m = String(s || '').match(/playlist\/(\d+)/) || String(s || '').trim().match(/^(\d{3,})$/);
  return m ? m[1] : null;
};

// src : { kind: 'chart' } | { kind: 'artists', q: 'BTS, BLACKPINK' } | { kind: 'playlist', pl: 'lien' }
export async function fetchPool(src) {
  let lists = [];
  if (src.kind === 'chart') lists = [await jsonp('/chart/0/tracks?limit=100')];
  else if (src.kind === 'playlist') {
    const id = playlistId(src.pl);
    if (!id) throw new Error('playlist');
    lists = [await jsonp(`/playlist/${id}/tracks?limit=200`)];
  } else {
    const names = String(src.q || '').split(',').map(x => x.trim()).filter(Boolean).slice(0, 10);
    if (!names.length) throw new Error('artists');
    lists = await Promise.all(names.map(a => jsonp(`/search?q=${encodeURIComponent(`artist:"${a}"`)}&limit=25`)));
  }
  const seen = new Set();
  return lists.flatMap(d => d.data || [])
    .filter(t => t && t.preview && t.readable !== false)
    .map(toTrack)
    .filter(t => { const k = norm(t.title) + '|' + norm(t.artist); if (!t.title || seen.has(k)) return false; seen.add(k); return true; });
}

// Extraits des artistes donnés : on trouve d'abord l'artiste exact, puis ses titres les plus écoutés.
const topOf = async (name, perArtist) => {
  const found = await jsonp(`/search/artist?q=${encodeURIComponent(name)}&limit=5`);
  const list = found.data || [];
  const artist = list.find(a => norm(a.name) === norm(name)) || list[0];
  if (!artist) return [];
  const top = await jsonp(`/artist/${artist.id}/top?limit=${perArtist}`);
  return (top.data || [])
    .filter(t => t && t.preview && t.readable !== false && t.artist && t.artist.id === artist.id)
    .map(t => Object.assign(toTrack(t), { artist: artist.name, from: name }));
};

export async function fetchArtists(names, perArtist) {
  const lists = [];
  let failed = 0;
  for (let k = 0; k < names.length; k += 6) {
    const part = await Promise.all(names.slice(k, k + 6).map(a => topOf(a, perArtist).catch(() => { failed++; return []; })));
    lists.push(...part);
  }
  const seen = new Set();
  const out = lists.flat().filter(t => { const key = norm(t.title) + '|' + norm(t.artist); if (!t.title || seen.has(key)) return false; seen.add(key); return true; });
  if (!out.length) throw new Error(failed ? 'network' : 'empty');
  return out;
}
