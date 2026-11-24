// Qui est-ce : banque de personnages très connus, rangés par thème.
// Chaque personnage : n = nom, s = précision affichée sous le nom (groupe, série, métier…),
// img = photo facultative. Pour ajouter une photo, dépose l'image dans le dossier img/qui/
// puis écris son chemin, par exemple : { n: 'Jungkook', s: 'BTS', img: 'img/qui/jungkook.jpg' }.
// Sans photo, la carte affiche les initiales sur une pastille de couleur.

const QUI_THEMES = [
  ['stars', 'Célébrités'],
  ['films', 'Films'],
  ['series', 'Séries'],
  ['disney', 'Disney / Pixar'],
  ['youtube', 'YouTubeurs']
];

// Célébrités : 100 personnes, dont les 35 premières sont françaises.
const PERSOS = {
  stars: [
    { n: 'Kylian Mbappé', s: 'Football' }, { n: 'Zinédine Zidane', s: 'Football' }, { n: 'Antoine Griezmann', s: 'Football' }, { n: 'Karim Benzema', s: 'Football' },
    { n: 'Thierry Henry', s: 'Football' }, { n: 'Teddy Riner', s: 'Judo' }, { n: 'Tony Parker', s: 'Basket' }, { n: 'Victor Wembanyama', s: 'Basket' },
    { n: 'Léon Marchand', s: 'Natation' }, { n: 'Aya Nakamura', s: 'Chanteuse' }, { n: 'Jul', s: 'Rappeur' }, { n: 'Gims', s: 'Chanteur' },
    { n: 'Ninho', s: 'Rappeur' }, { n: 'Soprano', s: 'Chanteur' }, { n: 'Johnny Hallyday', s: 'Chanteur' }, { n: 'Édith Piaf', s: 'Chanteuse' },
    { n: 'David Guetta', s: 'DJ' }, { n: 'Orelsan', s: 'Rappeur' }, { n: 'Kendji Girac', s: 'Chanteur' }, { n: 'Omar Sy', s: 'Acteur' },
    { n: 'Jean Dujardin', s: 'Acteur' }, { n: 'Marion Cotillard', s: 'Actrice' }, { n: 'Kev Adams', s: 'Humoriste' }, { n: 'Jamel Debbouze', s: 'Humoriste' },
    { n: 'Dany Boon', s: 'Humoriste' }, { n: 'Louis de Funès', s: 'Acteur' }, { n: 'Gad Elmaleh', s: 'Humoriste' }, { n: 'Napoléon', s: 'Empereur' },
    { n: 'Charles de Gaulle', s: 'Président' }, { n: 'Victor Hugo', s: 'Écrivain' }, { n: 'Molière', s: 'Écrivain' }, { n: 'Marie Curie', s: 'Scientifique' },
    { n: 'Jeanne d’Arc', s: 'Héroïne' }, { n: 'Thomas Pesquet', s: 'Astronaute' }, { n: 'Coco Chanel', s: 'Créatrice de mode' }, { n: 'Lionel Messi', s: 'Football' },
    { n: 'Cristiano Ronaldo', s: 'Football' }, { n: 'Neymar', s: 'Football' }, { n: 'LeBron James', s: 'Basket' }, { n: 'Michael Jordan', s: 'Basket' },
    { n: 'Usain Bolt', s: 'Athlétisme' }, { n: 'Serena Williams', s: 'Tennis' }, { n: 'Roger Federer', s: 'Tennis' }, { n: 'Rafael Nadal', s: 'Tennis' },
    { n: 'Lewis Hamilton', s: 'Formule 1' }, { n: 'Muhammad Ali', s: 'Boxe' }, { n: 'Tiger Woods', s: 'Golf' }, { n: 'Taylor Swift', s: 'Chanteuse' },
    { n: 'Beyoncé', s: 'Chanteuse' }, { n: 'Rihanna', s: 'Chanteuse' }, { n: 'Shakira', s: 'Chanteuse' }, { n: 'Lady Gaga', s: 'Chanteuse' },
    { n: 'Ariana Grande', s: 'Chanteuse' }, { n: 'Billie Eilish', s: 'Chanteuse' }, { n: 'Ed Sheeran', s: 'Chanteur' }, { n: 'Justin Bieber', s: 'Chanteur' },
    { n: 'Drake', s: 'Rappeur' }, { n: 'Eminem', s: 'Rappeur' }, { n: 'Bruno Mars', s: 'Chanteur' }, { n: 'The Weeknd', s: 'Chanteur' },
    { n: 'Dua Lipa', s: 'Chanteuse' }, { n: 'Michael Jackson', s: 'Chanteur' }, { n: 'Elvis Presley', s: 'Chanteur' }, { n: 'Freddie Mercury', s: 'Chanteur' },
    { n: 'Madonna', s: 'Chanteuse' }, { n: 'Bob Marley', s: 'Chanteur' }, { n: 'Céline Dion', s: 'Chanteuse' }, { n: 'Stromae', s: 'Chanteur' },
    { n: 'Snoop Dogg', s: 'Rappeur' }, { n: 'PSY', s: 'K-pop' }, { n: 'Jennie', s: 'BLACKPINK' }, { n: 'Lisa', s: 'BLACKPINK' },
    { n: 'Rosé', s: 'BLACKPINK' }, { n: 'Jisoo', s: 'BLACKPINK' }, { n: 'Leonardo DiCaprio', s: 'Acteur' }, { n: 'Brad Pitt', s: 'Acteur' },
    { n: 'Angelina Jolie', s: 'Actrice' }, { n: 'Tom Cruise', s: 'Acteur' }, { n: 'Johnny Depp', s: 'Acteur' }, { n: 'Will Smith', s: 'Acteur' },
    { n: 'Dwayne Johnson', s: 'Acteur' }, { n: 'Jackie Chan', s: 'Acteur' }, { n: 'Zendaya', s: 'Actrice' }, { n: 'Margot Robbie', s: 'Actrice' },
    { n: 'Keanu Reeves', s: 'Acteur' }, { n: 'Scarlett Johansson', s: 'Actrice' }, { n: 'Morgan Freeman', s: 'Acteur' }, { n: 'Charlie Chaplin', s: 'Acteur' },
    { n: 'Marilyn Monroe', s: 'Actrice' }, { n: 'Jim Carrey', s: 'Acteur' }, { n: 'Albert Einstein', s: 'Scientifique' }, { n: 'Léonard de Vinci', s: 'Peintre' },
    { n: 'Mozart', s: 'Compositeur' }, { n: 'Cléopâtre', s: 'Reine d’Égypte' }, { n: 'Barack Obama', s: 'Président' }, { n: 'Elon Musk', s: 'Entrepreneur' },
    { n: 'Steve Jobs', s: 'Entrepreneur' }, { n: 'Élisabeth II', s: 'Reine' }, { n: 'Pablo Picasso', s: 'Peintre' }, { n: 'Nelson Mandela', s: 'Président' }
  ],
  films: [
    { n: 'Harry Potter', s: 'Harry Potter' }, { n: 'Hermione Granger', s: 'Harry Potter' }, { n: 'Ron Weasley', s: 'Harry Potter' }, { n: 'Dumbledore', s: 'Harry Potter' },
    { n: 'Voldemort', s: 'Harry Potter' }, { n: 'Dark Vador', s: 'Star Wars' }, { n: 'Luke Skywalker', s: 'Star Wars' }, { n: 'Yoda', s: 'Star Wars' },
    { n: 'Iron Man', s: 'Marvel' }, { n: 'Spider-Man', s: 'Marvel' }, { n: 'Captain America', s: 'Marvel' }, { n: 'Thor', s: 'Marvel' },
    { n: 'Hulk', s: 'Marvel' }, { n: 'Batman', s: 'DC' }, { n: 'Le Joker', s: 'DC' }, { n: 'Wonder Woman', s: 'DC' },
    { n: 'Jack Sparrow', s: 'Pirates des Caraïbes' }, { n: 'James Bond', s: '007' }, { n: 'Indiana Jones', s: 'Indiana Jones' }, { n: 'Gandalf', s: 'Le Seigneur des anneaux' },
    { n: 'Frodon', s: 'Le Seigneur des anneaux' }, { n: 'Shrek', s: 'Shrek' }, { n: 'Rocky Balboa', s: 'Rocky' }, { n: 'Terminator', s: 'Terminator' },
    { n: 'Forrest Gump', s: 'Forrest Gump' }
  ],
  series: [
    { n: 'Walter White', s: 'Breaking Bad' }, { n: 'Jesse Pinkman', s: 'Breaking Bad' }, { n: 'Daenerys Targaryen', s: 'Game of Thrones' }, { n: 'Jon Snow', s: 'Game of Thrones' },
    { n: 'Tyrion Lannister', s: 'Game of Thrones' }, { n: 'Eleven', s: 'Stranger Things' }, { n: 'Mercredi Addams', s: 'Mercredi' }, { n: 'Sheldon Cooper', s: 'The Big Bang Theory' },
    { n: 'Rachel Green', s: 'Friends' }, { n: 'Joey Tribbiani', s: 'Friends' }, { n: 'Ross Geller', s: 'Friends' }, { n: 'Homer Simpson', s: 'Les Simpson' },
    { n: 'Bart Simpson', s: 'Les Simpson' }, { n: 'Bob l’éponge', s: 'Bob l’éponge' }, { n: 'Michael Scott', s: 'The Office' }, { n: 'Barney Stinson', s: 'How I Met Your Mother' },
    { n: 'Le Professeur', s: 'La Casa de Papel' }, { n: 'Tokyo', s: 'La Casa de Papel' }, { n: 'Seong Gi-hun', s: 'Squid Game' }, { n: 'Assane Diop', s: 'Lupin' },
    { n: 'Thomas Shelby', s: 'Peaky Blinders' }, { n: 'Dr House', s: 'Dr House' }, { n: 'Sherlock Holmes', s: 'Sherlock' }, { n: 'Emily Cooper', s: 'Emily in Paris' },
    { n: 'Rick Grimes', s: 'The Walking Dead' }
  ],
  disney: [
    { n: 'Mickey Mouse', s: 'Disney' }, { n: 'Donald Duck', s: 'Disney' }, { n: 'Dingo', s: 'Disney' }, { n: 'Simba', s: 'Le Roi lion' },
    { n: 'Elsa', s: 'La Reine des neiges' }, { n: 'Olaf', s: 'La Reine des neiges' }, { n: 'Stitch', s: 'Lilo et Stitch' }, { n: 'Aladdin', s: 'Aladdin' },
    { n: 'Ariel', s: 'La Petite Sirène' }, { n: 'Raiponce', s: 'Raiponce' }, { n: 'Vaiana', s: 'Vaiana' }, { n: 'Mulan', s: 'Mulan' },
    { n: 'Blanche-Neige', s: 'Blanche-Neige' }, { n: 'Cendrillon', s: 'Cendrillon' }, { n: 'Woody', s: 'Toy Story' }, { n: 'Buzz l’Éclair', s: 'Toy Story' },
    { n: 'Nemo', s: 'Le Monde de Nemo' }, { n: 'Flash McQueen', s: 'Cars' }, { n: 'Wall-E', s: 'Wall-E' }, { n: 'Bob Razowski', s: 'Monstres et Cie' }
  ],
  youtube: [
    { n: 'Squeezie', s: 'YouTubeur' }, { n: 'Cyprien', s: 'YouTubeur' }, { n: 'Norman', s: 'YouTubeur' }, { n: 'Natoo', s: 'YouTubeuse' },
    { n: 'Tibo InShape', s: 'YouTubeur' }, { n: 'Michou', s: 'YouTubeur' }, { n: 'Inoxtag', s: 'YouTubeur' }, { n: 'Amixem', s: 'YouTubeur' },
    { n: 'McFly et Carlito', s: 'YouTubeurs' }, { n: 'Léna Situations', s: 'YouTubeuse' }, { n: 'EnjoyPhoenix', s: 'YouTubeuse' }, { n: 'Joyca', s: 'YouTubeur' },
    { n: 'Mister V', s: 'YouTubeur' }, { n: 'Seb la Frite', s: 'YouTubeur' }, { n: 'Gotaga', s: 'Streamer' }, { n: 'HugoDécrypte', s: 'YouTubeur' },
    { n: 'Domingo', s: 'Streamer' }, { n: 'Locklear', s: 'Streamer' }, { n: 'Kameto', s: 'Streamer' }, { n: 'ZeratoR', s: 'Streamer' },
    { n: 'Le Rire Jaune', s: 'YouTubeur' }, { n: 'Antoine Daniel', s: 'YouTubeur' }, { n: 'Mathieu Sommet', s: 'YouTubeur' }, { n: 'Jhon Rachid', s: 'YouTubeur' },
    { n: 'Lebouseuh', s: 'YouTubeur' }
  ]
};

export { QUI_THEMES, PERSOS };
