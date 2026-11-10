// Zones géographiques : [code, nom, "de" + nom (pour le titre), latitude, longitude du centre].
// id final = "<pays>-<code>" (ex. fr-bre), stocké dans events.regionId.
export const COUNTRIES = {
  FR: { n: 'France', de: 'de France' },
  BE: { n: 'Belgique', de: 'de Belgique' },
  CH: { n: 'Suisse', de: 'de Suisse' }
};

const RAW = {
  // France : 13 régions métropolitaines + 5 régions d’outre-mer
  FR: [
    ['ara', 'Auvergne-Rhône-Alpes', 'd’Auvergne-Rhône-Alpes', 45.4, 4.9],
    ['bfc', 'Bourgogne-Franche-Comté', 'de Bourgogne-Franche-Comté', 47.2, 4.8],
    ['bre', 'Bretagne', 'de Bretagne', 48.1, -2.8],
    ['cvl', 'Centre-Val de Loire', 'du Centre-Val de Loire', 47.5, 1.7],
    ['cor', 'Corse', 'de Corse', 42.15, 9.1],
    ['ges', 'Grand Est', 'du Grand Est', 48.7, 5.6],
    ['hdf', 'Hauts-de-France', 'des Hauts-de-France', 49.9, 2.8],
    ['idf', 'Île-de-France', 'd’Île-de-France', 48.7, 2.5],
    ['nor', 'Normandie', 'de Normandie', 49.1, 0.1],
    ['naq', 'Nouvelle-Aquitaine', 'de Nouvelle-Aquitaine', 45.2, 0.4],
    ['occ', 'Occitanie', 'd’Occitanie', 43.7, 2.1],
    ['pdl', 'Pays de la Loire', 'des Pays de la Loire', 47.4, -0.8],
    ['pac', 'Provence-Alpes-Côte d’Azur', 'de Provence-Alpes-Côte d’Azur', 43.9, 6.0],
    ['gp', 'Guadeloupe', 'de la Guadeloupe', 16.25, -61.55],
    ['mq', 'Martinique', 'de la Martinique', 14.65, -61.0],
    ['gf', 'Guyane', 'de la Guyane', 4.0, -53.0],
    ['re', 'La Réunion', 'de La Réunion', -21.1, 55.5],
    ['yt', 'Mayotte', 'de Mayotte', -12.8, 45.15]
  ],
  // Belgique : Bruxelles-Capitale + 10 provinces (plus utile qu’un découpage en 3 régions pour des sorties en famille)
  BE: [
    ['bru', 'Bruxelles-Capitale', 'de Bruxelles-Capitale', 50.85, 4.35],
    ['bwa', 'Brabant wallon', 'du Brabant wallon', 50.65, 4.6],
    ['bfl', 'Brabant flamand', 'du Brabant flamand', 50.9, 4.6],
    ['ant', 'Anvers', 'd’Anvers', 51.2, 4.7],
    ['lim', 'Limbourg', 'du Limbourg', 50.95, 5.4],
    ['wvl', 'Flandre occidentale', 'de Flandre occidentale', 51.0, 3.1],
    ['ovl', 'Flandre orientale', 'de Flandre orientale', 51.0, 3.8],
    ['hai', 'Hainaut', 'du Hainaut', 50.45, 3.9],
    ['lie', 'Liège', 'de Liège', 50.5, 5.8],
    ['lux', 'Luxembourg', 'du Luxembourg belge', 49.95, 5.5],
    ['nam', 'Namur', 'de Namur', 50.3, 4.9]
  ],
  // Suisse : 26 cantons
  CH: [
    ['ag', 'Argovie', 'd’Argovie', 47.4, 8.1],
    ['ai', 'Appenzell Rhodes-Intérieures', 'd’Appenzell Rhodes-Intérieures', 47.32, 9.4],
    ['ar', 'Appenzell Rhodes-Extérieures', 'd’Appenzell Rhodes-Extérieures', 47.37, 9.3],
    ['be', 'Berne', 'de Berne', 46.8, 7.6],
    ['bl', 'Bâle-Campagne', 'de Bâle-Campagne', 47.45, 7.75],
    ['bs', 'Bâle-Ville', 'de Bâle-Ville', 47.57, 7.6],
    ['fr', 'Fribourg', 'de Fribourg', 46.72, 7.1],
    ['ge', 'Genève', 'de Genève', 46.2, 6.15],
    ['gl', 'Glaris', 'de Glaris', 46.98, 9.07],
    ['gr', 'Grisons', 'des Grisons', 46.65, 9.6],
    ['ju', 'Jura', 'du Jura', 47.35, 7.15],
    ['lu', 'Lucerne', 'de Lucerne', 47.08, 8.1],
    ['ne', 'Neuchâtel', 'de Neuchâtel', 47.0, 6.8],
    ['nw', 'Nidwald', 'de Nidwald', 46.93, 8.4],
    ['ow', 'Obwald', 'd’Obwald', 46.88, 8.25],
    ['sg', 'Saint-Gall', 'de Saint-Gall', 47.2, 9.2],
    ['sh', 'Schaffhouse', 'de Schaffhouse', 47.7, 8.6],
    ['so', 'Soleure', 'de Soleure', 47.3, 7.6],
    ['sz', 'Schwytz', 'de Schwytz', 47.06, 8.75],
    ['tg', 'Thurgovie', 'de Thurgovie', 47.57, 9.05],
    ['ti', 'Tessin', 'du Tessin', 46.3, 8.9],
    ['ur', 'Uri', 'd’Uri', 46.77, 8.63],
    ['vd', 'Vaud', 'de Vaud', 46.6, 6.6],
    ['vs', 'Valais', 'du Valais', 46.2, 7.6],
    ['zg', 'Zoug', 'de Zoug', 47.15, 8.55],
    ['zh', 'Zurich', 'de Zurich', 47.41, 8.65]
  ]
};

export const ZONES = Object.entries(RAW).flatMap(([c, list]) =>
  list.map(([k, n, de, lat, lng]) => ({ id: `${c.toLowerCase()}-${k}`, c, n, de, lat, lng })));

const norm = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z]/g, '');

// Retrouve la zone à partir d’une position (coordonnées arrondies avant l’appel à Nominatim).
export async function zoneFrom(lat, lon) {
  let cc = '', state = '';
  try {
    // Coordonnées arrondies (≈1 km) avant l’appel au service de géocodage inverse d’OpenStreetMap.
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=5&accept-language=fr&lat=${lat.toFixed(2)}&lon=${lon.toFixed(2)}`;
    const j = await (await fetch(url)).json();
    cc = (j.address?.country_code || '').toUpperCase();
    state = j.address?.state || '';
  } catch {}
  if (['GP', 'MQ', 'GF', 'RE', 'YT'].includes(cc)) cc = 'FR';
  const pool = ZONES.filter(z => !cc || z.c === cc);
  if (!pool.length) return null;
  const n = norm(state);
  const byName = n && pool.find(z => n === norm(z.n) || n.includes(norm(z.n)));
  if (byName) return byName;
  const k = Math.cos(lat * Math.PI / 180);
  return pool.reduce((best, z) =>
    ((z.lat - lat) ** 2 + ((z.lng - lon) * k) ** 2) < ((best.lat - lat) ** 2 + ((best.lng - lon) * k) ** 2) ? z : best);
}

// Zone par défaut : celle mémorisée par la page d’accueil, sinon celle de la position de la personne.
export async function defaultZone() {
  let s = null; try { s = localStorage.getItem('sel'); } catch {}
  if (s && ZONES.some(z => z.id === s)) return s;
  if (!navigator.geolocation) return '';
  return new Promise(res => navigator.geolocation.getCurrentPosition(async p => {
    const z = await zoneFrom(p.coords.latitude, p.coords.longitude); res(z ? z.id : '');
  }, () => res(''), { timeout: 8000, maximumAge: 600000 }));
}
