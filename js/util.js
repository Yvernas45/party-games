// Outils communs.
const esc = (s) => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const shuffle = (arr) => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const norm = (s) => String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/&/g, ' et ').replace(/[^a-z0-9]+/g, ' ').trim().replace(/^(le|la|les|l|the|un|une) /, '').replace(/ /g, '');
const lev = (a, b) => {
  let p = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const c = [i];
    for (let j = 1; j <= b.length; j++) c[j] = Math.min(p[j] + 1, c[j - 1] + 1, p[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    p = c;
  }
  return p[b.length];
};
// Réponse tapée : accents, majuscules, ponctuation ignorés ; 1 faute tolérée dès 4 lettres, 2 dès 7.
const matches = (input, answers) => {
  const x = norm(input); if (!x) return false;
  return answers.some(a => {
    const y = norm(a); if (!y) return false;
    if (/^\d+$/.test(y)) return x === y;
    const tol = y.length <= 3 ? 0 : y.length <= 6 ? 1 : 2;
    return lev(x, y) <= tol;
  });
};
const loadCfg = (k, d) => { try { return Object.assign({}, d, JSON.parse(localStorage.getItem(k) || '{}')); } catch (e) { return Object.assign({}, d); } };
const saveCfg = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };

export { esc, shuffle, norm, lev, matches, loadCfg, saveCfg };
