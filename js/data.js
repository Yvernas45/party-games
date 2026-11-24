// Données du site : avatars, couvertures, jeux, questions.
const AV = [
  ['Renard', '<path d="M16 13 L25 23 L14 27Z M44 13 L35 23 L46 27Z" fill="#e8642c"/><path d="M13 25 Q30 16 47 25 L30 50Z" fill="#e8642c"/><path d="M13 25 L30 50 L23 35Z M47 25 L30 50 L37 35Z" fill="#fff6ec"/><circle cx="24" cy="31" r="2.2" fill="#2a1f1a"/><circle cx="36" cy="31" r="2.2" fill="#2a1f1a"/><circle cx="30" cy="47.5" r="2.4" fill="#2a1f1a"/>'],
  ['Chat', '<path d="M17 27 L19 12 L28 21Z M43 27 L41 12 L32 21Z" fill="#d9a441"/><circle cx="30" cy="33" r="15" fill="#d9a441"/><circle cx="25" cy="32" r="2.2" fill="#2a1f1a"/><circle cx="35" cy="32" r="2.2" fill="#2a1f1a"/><path d="M28.5 37 L31.5 37 L30 39Z" fill="#c0504d"/><path d="M12 37 L22 38 M12 41 L22 40 M48 37 L38 38 M48 41 L38 40" stroke="#2a1f1a" stroke-width="1" opacity=".5"/>'],
  ['Ours', '<circle cx="19" cy="20" r="6" fill="#8b5a3c"/><circle cx="41" cy="20" r="6" fill="#8b5a3c"/><circle cx="19" cy="20" r="3" fill="#c58b62"/><circle cx="41" cy="20" r="3" fill="#c58b62"/><circle cx="30" cy="33" r="16" fill="#8b5a3c"/><ellipse cx="30" cy="39" rx="7" ry="5" fill="#d9b08c"/><ellipse cx="30" cy="37" rx="2.6" ry="1.8" fill="#2a1f1a"/><circle cx="24" cy="30" r="2.2" fill="#2a1f1a"/><circle cx="36" cy="30" r="2.2" fill="#2a1f1a"/>'],
  ['Lapin', '<ellipse cx="23" cy="16" rx="4.5" ry="11" fill="#d8cfc6"/><ellipse cx="37" cy="16" rx="4.5" ry="11" fill="#d8cfc6"/><ellipse cx="23" cy="16" rx="2" ry="8" fill="#e9a4a0"/><ellipse cx="37" cy="16" rx="2" ry="8" fill="#e9a4a0"/><circle cx="30" cy="37" r="14" fill="#d8cfc6"/><circle cx="25" cy="36" r="2.2" fill="#2a1f1a"/><circle cx="35" cy="36" r="2.2" fill="#2a1f1a"/><ellipse cx="30" cy="41" rx="2" ry="1.5" fill="#e07a76"/>'],
  ['Panda', '<circle cx="18" cy="22" r="5.5" fill="#2a1f1a"/><circle cx="42" cy="22" r="5.5" fill="#2a1f1a"/><circle cx="30" cy="34" r="15" fill="#ffffff"/><ellipse cx="24" cy="33" rx="4" ry="5" fill="#2a1f1a" transform="rotate(20 24 33)"/><ellipse cx="36" cy="33" rx="4" ry="5" fill="#2a1f1a" transform="rotate(-20 36 33)"/><circle cx="24.5" cy="32" r="1.4" fill="#fff"/><circle cx="35.5" cy="32" r="1.4" fill="#fff"/><ellipse cx="30" cy="39" rx="2.4" ry="1.6" fill="#2a1f1a"/>'],
  ['Hibou', '<path d="M14 17 L23 24 L16 29Z M46 17 L37 24 L44 29Z" fill="#9c6644"/><ellipse cx="30" cy="34" rx="16" ry="15" fill="#9c6644"/><circle cx="23" cy="32" r="6.5" fill="#fff6ec"/><circle cx="37" cy="32" r="6.5" fill="#fff6ec"/><circle cx="23" cy="32" r="3" fill="#2a1f1a"/><circle cx="37" cy="32" r="3" fill="#2a1f1a"/><path d="M28 37 L32 37 L30 42Z" fill="#f2a541"/>'],
  ['Chien', '<circle cx="30" cy="32" r="14" fill="#c98b55"/><ellipse cx="17" cy="32" rx="5" ry="10" fill="#7a4a2c" transform="rotate(15 17 32)"/><ellipse cx="43" cy="32" rx="5" ry="10" fill="#7a4a2c" transform="rotate(-15 43 32)"/><ellipse cx="30" cy="39" rx="7" ry="5" fill="#f1d7b8"/><ellipse cx="30" cy="36.5" rx="2.8" ry="2" fill="#2a1f1a"/><circle cx="24.5" cy="29" r="2.2" fill="#2a1f1a"/><circle cx="35.5" cy="29" r="2.2" fill="#2a1f1a"/>'],
  ['Raton laveur', '<path d="M16 25 L18 12 L27 19Z M44 25 L42 12 L33 19Z" fill="#8d8580"/><circle cx="30" cy="33" r="15" fill="#8d8580"/><path d="M15 30 Q30 23 45 30 Q40 37 30 33 Q20 37 15 30Z" fill="#3a2e27"/><circle cx="24" cy="30.5" r="2.2" fill="#fff6ec"/><circle cx="36" cy="30.5" r="2.2" fill="#fff6ec"/><circle cx="24" cy="30.5" r="1" fill="#2a1f1a"/><circle cx="36" cy="30.5" r="1" fill="#2a1f1a"/><ellipse cx="30" cy="40" rx="6" ry="4.5" fill="#f4ece4"/><ellipse cx="30" cy="38.5" rx="2.2" ry="1.5" fill="#2a1f1a"/>']
];

const avatarSvg = (i) => {
  const a = AV[((i % AV.length) + AV.length) % AV.length];
  return `<svg viewBox="0 0 60 60" aria-hidden="true"><circle cx="30" cy="30" r="28" fill="#f4e2cf"/>${a[1]}</svg>`;
};

const W = 'stroke="#fff" stroke-width="1.6" fill="none"';
const covers = {
  'qui-est-ce': () => {
    let cells = '';
    for (let r = 0; r < 2; r++) for (let k = 0; k < 4; k++) {
      const x = 30 + k * 36, y = 18 + r * 44, i = r * 4 + k, down = [1, 4, 6].includes(i), hit = i === 3;
      cells += down
        ? `<rect x="${x}" y="${y + 24}" width="28" height="12" rx="3" fill="#fff" opacity=".18"/>`
        : `<rect x="${x}" y="${y}" width="28" height="36" rx="3" ${W} ${hit ? 'class="hl" stroke-opacity="1"' : 'stroke-opacity=".75"'}/><circle cx="${x + 14}" cy="${y + 14}" r="6" ${W} stroke-opacity=".75"/><path d="M${x + 6} ${y + 31} Q${x + 14} ${y + 21} ${x + 22} ${y + 31}" ${W} stroke-opacity=".75"/>`;
    }
    return `<svg class="cover" viewBox="0 0 200 120" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><rect width="200" height="120" fill="#2e221c"/>${cells}<rect x="138" y="18" width="28" height="36" rx="3" fill="#e8642c" opacity=".18" class="hl"/></svg>`;
  },
  'quiz': () => {
    const rows = [0, 1, 2, 3].map(i => {
      const x = 26 + (i % 2) * 78, y = 52 + Math.floor(i / 2) * 30, ok = i === 2;
      return `<rect x="${x}" y="${y}" width="70" height="22" rx="4" ${ok ? 'fill="#e8642c" class="hl"' : W + ' stroke-opacity=".6"'}/><text x="${x + 10}" y="${y + 15}" font-family="Manrope,sans-serif" font-size="10" font-weight="700" fill="#fff">${'ABCD'[i]}</text><rect x="${x + 22}" y="${y + 9}" width="${26 + i * 5}" height="4" rx="2" fill="#fff" opacity="${ok ? .9 : .35}"/>`;
    }).join('');
    return `<svg class="cover" viewBox="0 0 200 120" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><rect width="200" height="120" fill="#2e221c"/><text x="26" y="34" font-family="Manrope,sans-serif" font-size="11" font-weight="700" fill="#fff" opacity=".5">Question 3 / 10</text><rect x="26" y="40" width="110" height="4" rx="2" fill="#fff" opacity=".85"/><circle cx="168" cy="30" r="10" ${W} stroke-opacity=".6"/><path d="M168 30 L168 23" stroke="#e8642c" stroke-width="2" stroke-linecap="round"/>${rows}</svg>`;
  },
  'blind-test': () => {
    let bars = '';
    for (let i = 0; i < 16; i++) {
      const h = 6 + Math.abs(Math.sin(i * 1.7)) * 36;
      bars += `<rect x="${108 + i * 5.4}" y="${60 - h / 2}" width="2.6" height="${h}" rx="1.3" fill="${i < 10 ? '#fff' : '#fff'}" opacity="${i < 10 ? .9 : .3}"/>`;
    }
    return `<svg class="cover" viewBox="0 0 200 120" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><rect width="200" height="120" fill="#2e221c"/><circle cx="62" cy="60" r="38" ${W} stroke-opacity=".75"/><circle cx="62" cy="60" r="29" ${W} stroke-opacity=".3"/><circle cx="62" cy="60" r="20" ${W} stroke-opacity=".3"/><circle cx="62" cy="60" r="10" fill="#e8642c" class="hl"/><circle cx="62" cy="60" r="2.5" fill="#2e221c"/>${bars}<rect x="108" y="88" width="84" height="2" rx="1" fill="#fff" opacity=".2"/><rect x="108" y="88" width="52" height="2" rx="1" fill="#e8642c"/></svg>`;
  },
  'devine-le-mot': () => {
    const tiles = ['M', '?', 'T'].map((t, i) => `<rect x="${44 + i * 40}" y="34" width="32" height="38" rx="4" ${i === 1 ? 'fill="#e8642c" class="hl"' : W + ' stroke-opacity=".75"'}/><text x="${60 + i * 40}" y="60" font-family="Manrope,sans-serif" font-size="19" font-weight="800" text-anchor="middle" fill="#fff">${t}</text>`).join('');
    return `<svg class="cover" viewBox="0 0 200 120" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><rect width="200" height="120" fill="#2e221c"/>${tiles}<rect x="44" y="86" width="112" height="3" rx="1.5" fill="#fff" opacity=".2"/><rect x="44" y="86" width="40" height="3" rx="1.5" fill="#fff" opacity=".8"/></svg>`;
  }
};

const GAMES = [
  { id: 'qui-est-ce', name: 'Qui est-ce ?', desc: 'Trouve le personnage secret de ton adversaire avant qu’il trouve le tien.', players: '2 joueurs', step: 'Étape 4',
    rules: ['Chaque joueur reçoit un personnage secret, tiré au hasard dans le thème choisi.', 'À tour de rôle, posez une question fermée : oui ou non.', 'Éliminez les personnages qui ne correspondent pas.', 'Le premier qui nomme le bon personnage gagne.'] },
  { id: 'quiz', name: 'Quiz', desc: 'Questions sur la K-pop, les séries, les films et la culture générale.', players: 'Solo ou multijoueur', step: 'Étape 2', ready: true,
    rules: ['Sélectionne les thèmes avant la partie.', 'Réponds parmi 4 propositions ou en tapant ta réponse.', 'Les petites fautes d’orthographe sont acceptées.', 'Les réponses rapides rapportent plus de points.'] },
  { id: 'blind-test', name: 'Blind test', desc: 'Reconnais le titre ou l’artiste à partir d’un extrait de 30 secondes.', players: 'Solo ou multijoueur', step: 'Étape 2', ready: true,
    rules: ['Un extrait de 30 secondes est diffusé.', 'Trouve le titre, l’artiste, ou les deux.', 'Réponse à choix ou tapée, petites fautes acceptées.', 'Les réponses rapides rapportent plus de points.'] },
  { id: 'devine-le-mot', name: 'Devine le mot', desc: 'Trouve le mot secret en 6 essais. En salon, le premier qui trouve gagne la manche.', players: 'Solo ou multijoueur', step: 'Étape 3', ready: true,
    rules: ['Propose un mot de la bonne longueur.', 'Vert : bonne lettre bien placée. Jaune : lettre présente ailleurs. Gris : absente.', 'Tu as 6 essais par mot.', 'En salon, le premier qui trouve remporte la manche.'] }
];

const THEMES = [['kpop', 'K-pop'], ['series', 'Séries'], ['films', 'Films'], ['culture', 'Culture générale']];
const themeName = (k) => (THEMES.find(t => t[0] === k) || ['', k])[1];
// [thème, question, bonne réponse, 3 mauvaises réponses, autres réponses acceptées]
const QUESTIONS = [
  ['kpop', 'Quelle agence a créé BTS ?', 'Big Hit (HYBE)', ['SM Entertainment', 'YG Entertainment', 'JYP Entertainment'], ['HYBE', 'Big Hit', 'Big Hit Music', 'BigHit']],
  ['kpop', 'Quel groupe chante « How You Like That » ?', 'BLACKPINK', ['TWICE', 'aespa', 'ITZY'], []],
  ['kpop', 'Combien de membres compte BTS ?', '7', ['5', '9', '13'], ['sept']],
  ['kpop', 'Quel artiste a chanté « Gangnam Style » ?', 'PSY', ['G-Dragon', 'Rain', 'Taeyang'], []],
  ['kpop', 'Quelle agence gère TWICE ?', 'JYP Entertainment', ['SM Entertainment', 'YG Entertainment', 'HYBE'], ['JYP']],
  ['kpop', 'Quel groupe a sorti « Super Shy » en 2023 ?', 'NewJeans', ['IVE', 'LE SSERAFIM', 'aespa'], ['New Jeans']],
  ['kpop', 'Comment s’appellent les fans de BTS ?', 'ARMY', ['BLINK', 'ONCE', 'MY'], []],
  ['kpop', 'Qui est le leader de BTS ?', 'RM', ['Jin', 'Suga', 'Jungkook'], ['Namjoon', 'Kim Namjoon', 'Rap Monster']],
  ['kpop', 'Quel groupe de Pledis compte 13 membres ?', 'SEVENTEEN', ['NCT 127', 'Stray Kids', 'ENHYPEN'], []],
  ['kpop', 'Comment s’appellent les fans de BLACKPINK ?', 'BLINK', ['ARMY', 'ONCE', 'MOA'], []],
  ['kpop', 'Quel groupe chante « God’s Menu » ?', 'Stray Kids', ['ATEEZ', 'TXT', 'EXO'], ['SKZ']],
  ['series', 'Dans quelle ville se passe « Stranger Things » ?', 'Hawkins', ['Riverdale', 'Derry', 'Springfield'], []],
  ['series', 'De quel pays vient la série « Squid Game » ?', 'Corée du Sud', ['Japon', 'Chine', 'Thaïlande'], ['Corée', 'Coree']],
  ['series', 'Dans « La Casa de Papel », comment surnomme-t-on le cerveau du braquage ?', 'Le Professeur', ['Berlin', 'Tokyo', 'Nairobi'], ['Professeur', 'El Profesor']],
  ['series', 'Quel professeur de chimie devient trafiquant dans « Breaking Bad » ?', 'Walter White', ['Jesse Pinkman', 'Saul Goodman', 'Hank Schrader'], ['Walter', 'Heisenberg']],
  ['series', 'Dans « Game of Thrones », quelle famille a le loup pour emblème ?', 'Stark', ['Lannister', 'Targaryen', 'Baratheon'], ['Les Stark']],
  ['series', 'Comment s’appelle le café de « Friends » ?', 'Central Perk', ['MacLaren’s', 'Monk’s', 'The Peach Pit'], []],
  ['series', 'À quelle famille appartient Mercredi ?', 'Addams', ['Munster', 'Bridgerton', 'Simpson'], ['Famille Addams']],
  ['series', 'Quelle entreprise de papier est au cœur de « The Office » (US) ?', 'Dunder Mifflin', ['Sterling Cooper', 'Pied Piper', 'Wernham Hogg'], []],
  ['series', 'Qui joue le rôle principal de « Lupin » sur Netflix ?', 'Omar Sy', ['Jean Dujardin', 'Vincent Cassel', 'Tahar Rahim'], []],
  ['series', 'De quel jeu vidéo est tirée la série « Arcane » ?', 'League of Legends', ['Valorant', 'Overwatch', 'Dota 2'], ['LoL']],
  ['films', 'Qui a réalisé « Parasite » ?', 'Bong Joon-ho', ['Park Chan-wook', 'Kim Jee-woon', 'Lee Chang-dong'], ['Bong Joon Ho', 'Bong']],
  ['films', 'En quelle année est sorti « Titanic » de James Cameron ?', '1997', ['1995', '1999', '2001'], []],
  ['films', 'Comment s’appelle le lionceau du « Roi Lion » ?', 'Simba', ['Mufasa', 'Nala', 'Scar'], []],
  ['films', 'Dans « Intouchables », qui joue Driss ?', 'Omar Sy', ['Jamel Debbouze', 'Kad Merad', 'Dany Boon'], []],
  ['films', 'Comment s’appelle l’école de Harry Potter ?', 'Poudlard', ['Beauxbâtons', 'Durmstrang', 'Ilvermorny'], ['Hogwarts']],
  ['films', 'Quel est le vrai nom d’Iron Man ?', 'Tony Stark', ['Steve Rogers', 'Bruce Banner', 'Peter Parker'], ['Stark', 'Anthony Stark']],
  ['films', 'Quel hobbit doit détruire l’Anneau unique ?', 'Frodon', ['Sam', 'Bilbon', 'Pippin'], ['Frodo', 'Frodon Sacquet']],
  ['films', 'Quel est le premier long métrage de Pixar ?', 'Toy Story', ['1001 pattes', 'Le Monde de Nemo', 'Monstres et Cie'], []],
  ['films', 'Qui a réalisé « Inception » ?', 'Christopher Nolan', ['Denis Villeneuve', 'Ridley Scott', 'David Fincher'], ['Nolan']],
  ['films', 'Comment s’appelle la sœur d’Elsa dans « La Reine des neiges » ?', 'Anna', ['Ariel', 'Raiponce', 'Belle'], []],
  ['culture', 'Quelle est la capitale de l’Australie ?', 'Canberra', ['Sydney', 'Melbourne', 'Perth'], []],
  ['culture', 'Quelle planète est la plus proche du Soleil ?', 'Mercure', ['Vénus', 'Mars', 'Terre'], []],
  ['culture', 'Combien de côtés a un hexagone ?', '6', ['5', '7', '8'], ['six']],
  ['culture', 'Qui a peint « La Joconde » ?', 'Léonard de Vinci', ['Michel-Ange', 'Raphaël', 'Botticelli'], ['De Vinci', 'Vinci', 'Leonardo da Vinci']],
  ['culture', 'Quel est le symbole chimique de l’or ?', 'Au', ['Ag', 'Or', 'Fe'], []],
  ['culture', 'Quel est le plus grand océan du monde ?', 'Pacifique', ['Atlantique', 'Indien', 'Arctique'], ['Océan Pacifique']],
  ['culture', 'Quelle est la langue officielle du Brésil ?', 'Portugais', ['Espagnol', 'Brésilien', 'Anglais'], []],
  ['culture', 'Combien de joueurs par équipe sur un terrain de football ?', '11', ['9', '10', '12'], ['onze']],
  ['culture', 'En quelle année l’homme a-t-il marché sur la Lune pour la première fois ?', '1969', ['1965', '1972', '1959'], []],
  ['culture', 'Quelle est la capitale du Canada ?', 'Ottawa', ['Toronto', 'Montréal', 'Vancouver'], []]
];

export { AV, avatarSvg, covers, GAMES, THEMES, themeName, QUESTIONS };
