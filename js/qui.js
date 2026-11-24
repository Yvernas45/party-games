// Qui est-ce : banque de personnages très connus, rangés par thème.
// Chaque personnage : n = nom, s = précision affichée sous le nom (groupe, série, métier…),
// img = photo facultative. Pour ajouter une photo, dépose l'image dans le dossier img/qui/
// puis écris son chemin, par exemple : { n: 'Jungkook', s: 'BTS', img: 'img/qui/jungkook.jpg' }.
// Sans photo, la carte affiche les initiales sur une pastille de couleur.

const QUI_THEMES = [
  ['kpop', 'K-pop'],
  ['stars', 'Célébrités'],
  ['series', 'Séries'],
  ['films', 'Films']
];

const PERSOS = {
  kpop: [
    { n: 'Jungkook', s: 'BTS' }, { n: 'V', s: 'BTS' }, { n: 'Jimin', s: 'BTS' }, { n: 'Jin', s: 'BTS' },
    { n: 'Suga', s: 'BTS' }, { n: 'RM', s: 'BTS' }, { n: 'J-Hope', s: 'BTS' },
    { n: 'Jennie', s: 'BLACKPINK' }, { n: 'Lisa', s: 'BLACKPINK' }, { n: 'Rosé', s: 'BLACKPINK' }, { n: 'Jisoo', s: 'BLACKPINK' },
    { n: 'G-Dragon', s: 'BIGBANG' }, { n: 'PSY', s: 'Solo' }, { n: 'IU', s: 'Solo' }, { n: 'Taeyeon', s: 'Girls’ Generation' },
    { n: 'Bang Chan', s: 'Stray Kids' }, { n: 'Felix', s: 'Stray Kids' }, { n: 'Hyunjin', s: 'Stray Kids' },
    { n: 'Karina', s: 'aespa' }, { n: 'Winter', s: 'aespa' },
    { n: 'Nayeon', s: 'TWICE' }, { n: 'Sana', s: 'TWICE' }, { n: 'Tzuyu', s: 'TWICE' },
    { n: 'Wonyoung', s: 'IVE' }, { n: 'Hanni', s: 'NewJeans' }, { n: 'Minji', s: 'NewJeans' },
    { n: 'Sakura', s: 'LE SSERAFIM' }, { n: 'Yeji', s: 'ITZY' }, { n: 'Mingyu', s: 'SEVENTEEN' }, { n: 'Jackson Wang', s: 'GOT7' }
  ],
  stars: [
    { n: 'Kylian Mbappé', s: 'Football' }, { n: 'Lionel Messi', s: 'Football' }, { n: 'Cristiano Ronaldo', s: 'Football' }, { n: 'Zinédine Zidane', s: 'Football' },
    { n: 'LeBron James', s: 'Basket' }, { n: 'Serena Williams', s: 'Tennis' }, { n: 'Usain Bolt', s: 'Athlétisme' },
    { n: 'Taylor Swift', s: 'Chanteuse' }, { n: 'Beyoncé', s: 'Chanteuse' }, { n: 'Rihanna', s: 'Chanteuse' }, { n: 'Shakira', s: 'Chanteuse' },
    { n: 'Michael Jackson', s: 'Chanteur' }, { n: 'Elvis Presley', s: 'Chanteur' }, { n: 'Stromae', s: 'Chanteur' }, { n: 'Aya Nakamura', s: 'Chanteuse' },
    { n: 'Leonardo DiCaprio', s: 'Acteur' }, { n: 'Brad Pitt', s: 'Acteur' }, { n: 'Omar Sy', s: 'Acteur' }, { n: 'Angelina Jolie', s: 'Actrice' },
    { n: 'Albert Einstein', s: 'Scientifique' }, { n: 'Marie Curie', s: 'Scientifique' }, { n: 'Napoléon', s: 'Empereur' }, { n: 'Cléopâtre', s: 'Reine d’Égypte' },
    { n: 'Léonard de Vinci', s: 'Peintre' }, { n: 'Mozart', s: 'Compositeur' }, { n: 'Victor Hugo', s: 'Écrivain' }, { n: 'Molière', s: 'Écrivain' },
    { n: 'Charles de Gaulle', s: 'Président' }, { n: 'Barack Obama', s: 'Président' }, { n: 'Elon Musk', s: 'Entrepreneur' }, { n: 'Squeezie', s: 'Youtubeur' }
  ],
  series: [
    { n: 'Walter White', s: 'Breaking Bad' }, { n: 'Jesse Pinkman', s: 'Breaking Bad' },
    { n: 'Daenerys Targaryen', s: 'Game of Thrones' }, { n: 'Jon Snow', s: 'Game of Thrones' }, { n: 'Tyrion Lannister', s: 'Game of Thrones' },
    { n: 'Eleven', s: 'Stranger Things' }, { n: 'Steve Harrington', s: 'Stranger Things' }, { n: 'Jim Hopper', s: 'Stranger Things' },
    { n: 'Mercredi Addams', s: 'Mercredi' }, { n: 'Sheldon Cooper', s: 'The Big Bang Theory' },
    { n: 'Rachel Green', s: 'Friends' }, { n: 'Joey Tribbiani', s: 'Friends' }, { n: 'Ross Geller', s: 'Friends' },
    { n: 'Homer Simpson', s: 'Les Simpson' }, { n: 'Bart Simpson', s: 'Les Simpson' },
    { n: 'Michael Scott', s: 'The Office' }, { n: 'Barney Stinson', s: 'How I Met Your Mother' }, { n: 'Ted Mosby', s: 'How I Met Your Mother' },
    { n: 'Le Professeur', s: 'La Casa de Papel' }, { n: 'Tokyo', s: 'La Casa de Papel' }, { n: 'Seong Gi-hun', s: 'Squid Game' },
    { n: 'Assane Diop', s: 'Lupin' }, { n: 'Thomas Shelby', s: 'Peaky Blinders' }, { n: 'Dr House', s: 'Dr House' },
    { n: 'Meredith Grey', s: 'Grey’s Anatomy' }, { n: 'Sherlock Holmes', s: 'Sherlock' }, { n: 'Emily Cooper', s: 'Emily in Paris' }, { n: 'Bob l’éponge', s: 'Bob l’éponge' }
  ],
  films: [
    { n: 'Harry Potter', s: 'Harry Potter' }, { n: 'Hermione Granger', s: 'Harry Potter' }, { n: 'Ron Weasley', s: 'Harry Potter' },
    { n: 'Dumbledore', s: 'Harry Potter' }, { n: 'Voldemort', s: 'Harry Potter' },
    { n: 'Dark Vador', s: 'Star Wars' }, { n: 'Luke Skywalker', s: 'Star Wars' }, { n: 'Yoda', s: 'Star Wars' },
    { n: 'Iron Man', s: 'Marvel' }, { n: 'Spider-Man', s: 'Marvel' }, { n: 'Captain America', s: 'Marvel' }, { n: 'Thor', s: 'Marvel' },
    { n: 'Batman', s: 'DC' }, { n: 'Le Joker', s: 'DC' }, { n: 'Wonder Woman', s: 'DC' },
    { n: 'Jack Sparrow', s: 'Pirates des Caraïbes' }, { n: 'Forrest Gump', s: 'Forrest Gump' }, { n: 'Rocky Balboa', s: 'Rocky' },
    { n: 'James Bond', s: '007' }, { n: 'Indiana Jones', s: 'Indiana Jones' }, { n: 'Gandalf', s: 'Le Seigneur des anneaux' }, { n: 'Frodon', s: 'Le Seigneur des anneaux' },
    { n: 'Neo', s: 'Matrix' }, { n: 'Shrek', s: 'Shrek' }, { n: 'Simba', s: 'Le Roi lion' }, { n: 'Elsa', s: 'La Reine des neiges' },
    { n: 'Jack Dawson', s: 'Titanic' }, { n: 'Terminator', s: 'Terminator' }, { n: 'Barbie', s: 'Barbie' }
  ]
};

export { QUI_THEMES, PERSOS };
