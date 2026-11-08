import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js';
import { getFirestore, collection, query, where, orderBy, limit, getDocs, Timestamp }
  from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';
import { firebaseConfig } from './firebase-config.js';
import { COUNTRIES, ZONES } from './regions.js';

const TYPES = { atelier: 'Atelier', spectacle: 'Spectacle', nature: 'Sortie nature', eveil: 'Éveil et contes', loisirs: 'Loisirs' };
const AGES = [['Tous', null], ['0–3 ans', [0, 3]], ['3–6 ans', [3, 6]], ['6–12 ans', [6, 12]]];
const COLORS = ['--sun', '--rose', '--leaf', '--sky', '--lav', '--sun', '--rose'];
const S = { sel: '', day: null, age: null, free: false, type: null, events: [], state: 'loading' };

const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const norm = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z]/g, '');
const key = d => d.toLocaleDateString('sv-SE');
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
const store = {
  get: k => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k, v) => { try { localStorage.setItem(k, v); } catch {} }
};

const configured = firebaseConfig.projectId && !firebaseConfig.projectId.startsWith('VOTRE');
const db = configured ? getFirestore(initializeApp(firebaseConfig)) : null;

const today = new Date(); today.setHours(0, 0, 0, 0);
const DAYS = [...Array(7)].map((_, i) => { const d = new Date(today); d.setDate(d.getDate() + i); return d; });

/* ---------- Interface : fanions, filtres, liste des zones ---------- */
$('flags').innerHTML = DAYS.map((d, i) =>
  `<button class="flag" type="button" data-k="${key(d)}" aria-pressed="false" style="--fc:var(${COLORS[i]})" aria-label="${d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}">` +
  `<span class="dn">${d.toLocaleDateString('fr-FR', { weekday: 'short' }).replace('.', '')}</span><span class="dd">${d.getDate()}</span></button>`).join('');
$('flags').addEventListener('click', e => {
  const b = e.target.closest('.flag'); if (!b) return;
  S.day = S.day === b.dataset.k ? null : b.dataset.k; render();
});

AGES.forEach(([l, v], i) => {
  const b = document.createElement('button'); b.className = 'chip'; b.type = 'button'; b.textContent = l; b.dataset.i = i;
  b.onclick = () => { S.age = v; render(); }; $('ages').append(b);
});
Object.entries(TYPES).forEach(([k, l]) => {
  const b = document.createElement('button'); b.className = 'chip t-' + k; b.type = 'button'; b.dataset.k = k;
  b.innerHTML = `<i></i>${l}`; b.onclick = () => { S.type = S.type === k ? null : k; render(); }; $('types').append(b);
});
$('free').onclick = () => { S.free = !S.free; render(); };

$('region').innerHTML = '<option value="">Partout</option>' + Object.entries(COUNTRIES).map(([c, o]) =>
  `<optgroup label="${o.n}"><option value="${c}">Toute la ${o.n}</option>` +
  ZONES.filter(z => z.c === c).map(z => `<option value="${z.id}">${z.n}</option>`).join('') + '</optgroup>').join('');
$('region').onchange = e => { $('note').textContent = ''; setSel(e.target.value); };
$('loc').onclick = () => locate();

/* ---------- Zone et géolocalisation ---------- */
function setSel(v) {
  S.sel = v; S.day = null; $('region').value = v; store.set('sel', v); load();
}

function titleFor() {
  const base = 'L’agenda des familles';
  if (!S.sel) return base;
  if (S.sel.length === 2) return `${base} ${COUNTRIES[S.sel].de}`;
  return `${base} ${ZONES.find(z => z.id === S.sel).de}`;
}

async function zoneFrom(lat, lon) {
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

function locate() {
  const note = m => { $('note').textContent = m; };
  if (!navigator.geolocation) { note('La localisation n’est pas disponible. Choisissez votre coin dans la liste.'); return; }
  note('Recherche de votre position…');
  navigator.geolocation.getCurrentPosition(async p => {
    const z = await zoneFrom(p.coords.latitude, p.coords.longitude);
    if (z) { note(`Autour de vous : ${z.n} (${COUNTRIES[z.c].n}).`); setSel(z.id); }
    else note('Pas encore d’agenda dans votre secteur. Choisissez un coin dans la liste.');
  }, () => note('Localisation refusée ou indisponible. Choisissez votre coin dans la liste.'),
  { timeout: 8000, maximumAge: 600000 });
}

/* ---------- Données Firestore ---------- */
let seq = 0;
async function load() {
  const id = ++seq;
  S.state = 'loading'; render();
  if (!db) { S.state = 'noconfig'; render(); return; }
  const end = new Date(today); end.setDate(end.getDate() + 7);
  const c = [where('status', '==', 'published')];
  if (S.sel.length === 2) c.push(where('country', '==', S.sel));
  else if (S.sel) c.push(where('regionId', '==', S.sel));
  c.push(where('startsAt', '>=', Timestamp.fromDate(today)), where('startsAt', '<', Timestamp.fromDate(end)));
  try {
    const snap = await getDocs(query(collection(db, 'events'), ...c, orderBy('startsAt'), limit(200)));
    if (id !== seq) return;
    S.events = snap.docs.map(x => { const v = x.data(); return { ...v, id: x.id, d: v.startsAt.toDate() }; });
    S.state = 'ok';
  } catch (e) {
    console.error(e);
    if (id !== seq) return;
    S.state = 'error';
  }
  render();
}

/* ---------- Affichage ---------- */
function render() {
  const title = titleFor();
  $('title').textContent = title; document.title = 'Les P’tits Programmes – ' + title;
  $('bunting').classList.toggle('has-day', S.day !== null);
  document.querySelectorAll('.flag').forEach(b => b.setAttribute('aria-pressed', b.dataset.k === S.day));
  document.querySelectorAll('#ages .chip').forEach(b => b.setAttribute('aria-pressed', AGES[b.dataset.i][1] === S.age));
  document.querySelectorAll('#types .chip').forEach(b => b.setAttribute('aria-pressed', b.dataset.k === S.type));
  $('free').setAttribute('aria-pressed', S.free);

  const msg = (t, retry) => { $('list').innerHTML = `<div class="state"><p>${t}</p>${retry ? '<button class="btn" id="retry" type="button">Réessayer</button>' : ''}</div>`; if (retry) $('retry').onclick = load; };
  if (S.state === 'loading') { $('count').textContent = 'Chargement…'; $('list').innerHTML = ''; return; }
  if (S.state === 'noconfig') { $('count').textContent = ''; msg('Firebase n’est pas encore configuré : renseignez <code>public/js/firebase-config.js</code>.'); return; }
  if (S.state === 'error') { $('count').textContent = ''; msg('Impossible de charger l’agenda. Vérifiez votre connexion.', true); return; }

  const list = S.events.filter(e => {
    const min = e.ageMin ?? 0, max = e.ageMax ?? 12;
    return (!S.day || key(e.d) === S.day) && (!S.type || e.type === S.type) && (!S.free || e.price === 0)
      && (!S.age || (min < S.age[1] && max > S.age[0]));
  });

  const dayName = d => d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  const when = S.day ? 'le ' + dayName(DAYS.find(d => key(d) === S.day)) : 'cette semaine';
  $('count').textContent = list.length ? `${list.length} événement${list.length > 1 ? 's' : ''} ${when}` : 'Aucun événement trouvé';
  if (!list.length) {
    $('list').innerHTML = '<div class="empty"><p>Rien de prévu avec ces choix. Essayez un autre jour, une autre zone ou retirez un filtre.</p><button class="btn" type="button" id="rst">Tout réafficher</button></div>';
    $('rst').onclick = () => { Object.assign(S, { day: null, age: null, free: false, type: null }); render(); };
    return;
  }
  let out = '', cur = '';
  list.forEach(e => {
    if (key(e.d) !== cur) { cur = key(e.d); out += `<h2 class="day">${cap(dayName(e.d))}</h2>`; }
    const k = TYPES[e.type] ? e.type : 'loisirs';
    const time = e.d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }).replace(':', 'h');
    const age = e.ageMin != null && e.ageMax != null ? `<span>${esc(e.ageMin)}–${esc(e.ageMax)} ans</span>` : '';
    const price = typeof e.price === 'number' ? `<span class="price${e.price ? '' : ' free'}">${e.price ? esc(e.price) + ' €' : 'Gratuit'}</span>` : '';
    const src = e.sourceName ? `Trouvé sur : ${esc(e.sourceName)}. ` : '';
    const link = /^https?:\/\//.test(e.sourceUrl || '') ? `<a href="${esc(e.sourceUrl)}" target="_blank" rel="noopener noreferrer">Voir l’annonce d’origine</a>` : '';
    out += `<article class="card t-${k}"><div class="when">${time}</div><div class="body">
      <h3>${esc(e.title)}</h3><p class="place">${esc([e.place, e.city].filter(Boolean).join(', '))}</p>
      <p class="meta"><span class="tag">${TYPES[k]}</span>${age}${price}</p>
      <p class="src">${src}${link}</p></div></article>`;
  });
  $('list').innerHTML = out;
}

/* ---------- Démarrage : zone mémorisée, sinon géolocalisation proposée d’emblée ---------- */
const saved = store.get('sel');
if (saved !== null && (saved === '' || COUNTRIES[saved] || ZONES.some(z => z.id === saved))) {
  S.sel = saved; $('region').value = saved; load();
} else {
  load(); locate();
}
