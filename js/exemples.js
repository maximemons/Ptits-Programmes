// Événements d’exemple, générés à partir de la date du jour (ils couvrent toujours les ~2 prochains mois).
// Utilisés par le mode démo du site (tant que Firebase n’est pas configuré) et par tools/seed.mjs.
// Série : [jour de semaine (0 = dimanche), heure, titre, lieu, ville, pays, code zone, âge min, âge max, type, prix, source, devise?]
const SERIES = [
  [3, '10:30', 'Heure du conte en breton et en français', 'Médiathèque', 'Quimper', 'FR', 'bre', 3, 7, 'eveil', 0, 'Ville de Quimper'],
  [6, '14:00', 'Peinture sur galets', 'Café Les Petits Loups', 'Brest', 'FR', 'bre', 3, 8, 'atelier', 8, 'Page Facebook du café'],
  [6, '10:00', 'Balade nature avec un animateur', 'Maison de la nature', 'Landerneau', 'FR', 'bre', 6, 12, 'nature', 0, 'Communauté de communes'],
  [0, '10:30', 'Atelier cuisine parents-enfants', 'Café Bout’chou', 'Lille', 'FR', 'hdf', 4, 10, 'atelier', 12, 'Site du café'],
  [4, '10:00', 'Éveil musical', 'Maison de quartier', 'Roubaix', 'FR', 'hdf', 0, 3, 'eveil', 0, 'Page Facebook de la maison de quartier'],
  [6, '10:00', 'Initiation au judo', 'Dojo municipal', 'Tourcoing', 'FR', 'hdf', 4, 8, 'loisirs', 0, 'Site du club'],
  [3, '15:00', 'Chasse aux feuilles', 'Parc de la Citadelle', 'Lille', 'FR', 'hdf', 3, 8, 'nature', 0, 'Site de la ville de Lille'],
  [6, '10:30', 'Bébés lecteurs', 'Médiathèque', 'Paris', 'FR', 'idf', 0, 3, 'eveil', 0, 'Mairie de Paris'],
  [0, '15:00', 'Atelier poterie', 'Atelier Terre et Compagnie', 'Montreuil', 'FR', 'idf', 5, 12, 'atelier', 14, 'Site de l’atelier'],
  [3, '14:30', 'Ciné-goûter', 'Cinéma de quartier', 'Lyon', 'FR', 'ara', 4, 10, 'loisirs', 5, 'Site du cinéma'],
  [6, '10:00', 'Balade des petits explorateurs', 'Parc de la Colline', 'Marseille', 'FR', 'pac', 4, 10, 'nature', 0, 'Ville de Marseille'],
  [0, '16:00', 'Conte musical', 'Salle des fêtes', 'Toulouse', 'FR', 'occ', 3, 8, 'spectacle', 6, 'Mairie de quartier'],
  [3, '14:00', 'Chasse aux feuilles', 'Parc du Cinquantenaire', 'Bruxelles', 'BE', 'bru', 3, 8, 'nature', 0, 'Page Facebook de l’association'],
  [6, '14:00', 'Atelier bricolage', 'Maison des enfants', 'Ixelles', 'BE', 'bru', 6, 12, 'atelier', 6, 'Commune d’Ixelles'],
  [0, '15:00', 'Théâtre de marionnettes', 'Théâtre jeune public', 'Liège', 'BE', 'lie', 2, 6, 'spectacle', 7, 'Site du théâtre'],
  [3, '10:30', 'Heure du conte', 'Bibliothèque', 'Mons', 'BE', 'hai', 3, 7, 'eveil', 0, 'Ville de Mons'],
  [0, '14:30', 'Spectacle de marionnettes', 'Salle communale', 'Genève', 'CH', 'ge', 2, 6, 'spectacle', 8, 'Ville de Genève', 'CHF'],
  [6, '10:00', 'Atelier cuisine', 'Centre de loisirs', 'Lausanne', 'CH', 'vd', 5, 12, 'atelier', 15, 'Site du centre', 'CHF'],
  [3, '14:00', 'Heure du conte bilingue', 'Bibliothèque', 'Zurich', 'CH', 'zh', 3, 7, 'eveil', 0, 'Bibliothèque de Zurich']
];

// Événements uniques : [jours à partir d’aujourd’hui, heure, titre, lieu, ville, pays, code zone, âge min, âge max, type, prix, source, devise?]
const PONCTUELS = [
  [5, '15:00', 'Spectacle de magie', 'Salle des fêtes', 'Douai', 'FR', 'hdf', 4, 10, 'spectacle', 6, 'Mairie de Douai'],
  [9, '16:00', 'Concert jeune public « Petites oreilles »', 'Salle polyvalente', 'Villeneuve-d’Ascq', 'FR', 'hdf', 3, 10, 'spectacle', 6, 'Mairie de Villeneuve-d’Ascq'],
  [12, '14:00', 'Chasse au trésor en famille', 'Château et jardins', 'Nantes', 'FR', 'pdl', 4, 10, 'loisirs', 5, 'Office de tourisme'],
  [16, '10:00', 'Atelier théâtre', 'Maison de la culture', 'Rennes', 'FR', 'bre', 6, 12, 'atelier', 10, 'Page Facebook'],
  [20, '15:00', 'Spectacle d’ombres', 'Salle des fêtes', 'Morlaix', 'FR', 'bre', 3, 8, 'spectacle', 5, 'Morlaix Communauté'],
  [27, '14:30', 'Initiation au cirque', 'Chapiteau municipal', 'Strasbourg', 'FR', 'ges', 5, 12, 'loisirs', 8, 'Ville de Strasbourg'],
  [33, '11:00', 'Visite contée du parc animalier', 'Parc animalier', 'Anvers', 'BE', 'ant', 3, 10, 'nature', 9, 'Site du parc'],
  [41, '15:00', 'Grand spectacle de fin d’année', 'Salle communale', 'Neuchâtel', 'CH', 'ne', 3, 10, 'spectacle', 10, 'Commune', 'CHF'],
  [48, '10:00', 'Stage de peinture (vacances)', 'Atelier des arts', 'Bordeaux', 'FR', 'naq', 6, 12, 'atelier', 25, 'Site de l’atelier'],
  [55, '14:00', 'Après-midi jeux de société', 'Médiathèque', 'Fribourg', 'CH', 'fr', 5, 12, 'loisirs', 0, 'Ville de Fribourg']
];

export function exemples(base = new Date()) {
  const t0 = new Date(base); t0.setHours(0, 0, 0, 0);
  const at = (j, hm) => { const d = new Date(t0); d.setDate(d.getDate() + j); const [h, m] = hm.split(':'); d.setHours(+h, +m, 0, 0); return d; };
  const out = [];
  const add = (j, [, hm, title, place, city, country, reg, ageMin, ageMax, type, price, sourceName, currency]) =>
    out.push({
      title, place, city, country, regionId: `${country.toLowerCase()}-${reg}`, ageMin, ageMax, type, price,
      sourceName, sourceUrl: 'https://example.org', ...(currency ? { currency } : {}),
      status: 'published', startsAt: at(j, hm)
    });
  SERIES.forEach(r => { for (let j = 0; j < 63; j++) if (at(j, '12:00').getDay() === r[0]) add(j, r); });
  PONCTUELS.forEach(([j, ...r]) => add(j, [0, ...r]));
  return out;
}
