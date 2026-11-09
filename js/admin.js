import { db, configured, onUser, login, logout, esc } from './firebase.js';
import { collection, getDocs, doc, query, where, orderBy, limit, writeBatch, increment, serverTimestamp, Timestamp } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';
import { COUNTRIES, ZONES } from './regions.js';

// Barème de fiabilité : points gagnés si validé, perdus si refusé, et seuil sous lequel le compte passe dans « Peu fiables ».
const POINTS_OK = 1, POINTS_KO = -2, SEUIL = -3;
const TYPES = ['atelier', 'spectacle', 'nature', 'eveil', 'loisirs'];
const $ = id => document.getElementById(id);
let tab = 'todo', pending = [], published = [], scores = {};

if (!configured) {
  $('login').hidden = false; $('go').hidden = true;
  $('err').textContent = 'Firebase n’est pas encore configuré (js/firebase-config.js).';
} else {
  $('go').onclick = async () => { try { await login(); } catch (e) { $('err').textContent = 'Connexion impossible. Réessayez.'; } };
  $('out').onclick = logout;
  $('zone').innerHTML = '<option value="">Choisir…</option>' + Object.entries(COUNTRIES).map(([c, o]) =>
    `<optgroup label="${o.n}">${ZONES.filter(z => z.c === c).map(z => `<option value="${z.id}">${z.n}</option>`).join('')}</optgroup>`).join('');
  $('date').min = new Date().toLocaleDateString('sv-SE');
  $('f').onsubmit = addEvents;
  $('tabs').onclick = e => { const b = e.target.closest('[data-t]'); if (b) { tab = b.dataset.t; render(); } };
  $('list').onclick = e => {
    const s = e.target.closest('[data-series]'); if (s) return delSeries(s.dataset.series);
    const b = e.target.closest('[data-id]'); if (b) decide(b.dataset.id, b.dataset.to);
  };
  onUser(u => {
    $('login').hidden = !!u; $('app').hidden = !u; $('who').hidden = !u;
    if (u) { $('name').textContent = u.email; refresh(); }
  });
}

async function refresh() {
  $('info').textContent = 'Chargement…';
  try {
    const ev = collection(db, 'events');
    const [p, pub, us] = await Promise.all([
      getDocs(query(ev, where('status', '==', 'pending'))),
      getDocs(query(ev, where('status', '==', 'published'), where('startsAt', '>=', Timestamp.fromDate(new Date(new Date().setHours(0, 0, 0, 0)))), orderBy('startsAt'), limit(100))),
      getDocs(collection(db, 'users'))
    ]);
    scores = Object.fromEntries(us.docs.map(d => [d.id, d.data().score || 0]));
    const map = d => ({ id: d.id, ...d.data() });
    pending = p.docs.map(map).sort((a, b) => (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0));
    published = pub.docs.map(map);
    render();
  } catch (e) {
    console.error(e);
    $('info').textContent = e.code === 'permission-denied' ? 'Accès réservé : ce compte n’est pas administrateur.' : 'Chargement impossible.';
  }
}

const low = e => e.submittedBy && (scores[e.submittedBy] || 0) <= SEUIL;

function render() {
  const todo = pending.filter(e => !low(e)), bad = pending.filter(low);
  const labels = { todo: `À valider (${todo.length})`, low: `Peu fiables (${bad.length})`, pub: 'Publiés', add: 'Ajouter' };
  document.querySelectorAll('#tabs [data-t]').forEach(b => { b.textContent = labels[b.dataset.t]; b.setAttribute('aria-pressed', b.dataset.t === tab); });
  $('f').hidden = tab !== 'add'; $('info').hidden = $('list').hidden = tab === 'add';
  const list = tab === 'todo' ? todo : tab === 'low' ? bad : published;
  $('info').textContent = `Barème : validé ${POINTS_OK > 0 ? '+' : ''}${POINTS_OK}, refusé ${POINTS_KO}. Peu fiable à partir de ${SEUIL} points.`;
  $('list').innerHTML = list.length ? list.map(card).join('') : '<p class="note">Rien à traiter ici.</p>';
}

function card(e) {
  const d = e.startsAt.toDate(), z = ZONES.find(z => z.id === e.regionId), k = TYPES.includes(e.type) ? e.type : 'loisirs';
  const sc = scores[e.submittedBy] || 0;
  const who = e.submittedBy ? `${esc(e.submitterName || 'Compte sans nom')} <span class="score${low(e) ? ' low' : ''}">${sc}</span>` : 'Ajout manuel';
  const meta = [e.type && esc(e.type), e.ageMin != null && e.ageMax != null && `${esc(e.ageMin)}–${esc(e.ageMax)} ans`, typeof e.price === 'number' && (e.price ? `${esc(e.price)} ${esc(e.currency || '€')}` : 'Gratuit'), e.seriesId && 'récurrent'].filter(Boolean).join(' · ');
  const link = /^https?:\/\//.test(e.sourceUrl || '') ? ` <a href="${esc(e.sourceUrl)}" target="_blank" rel="noopener noreferrer">Annonce</a>` : '';
  const act = tab === 'pub'
    ? `<button class="btn ko" data-id="${e.id}" data-to="rejected" type="button">Dépublier</button>` + (e.seriesId ? `<button class="btn ko" data-series="${esc(e.seriesId)}" type="button">Supprimer la série</button>` : '')
    : `<button class="btn ok" data-id="${e.id}" data-to="published" type="button">Valider</button><button class="btn ko" data-id="${e.id}" data-to="rejected" type="button">Refuser</button>`;
  return `<article class="card t-${k}"><div class="when">${d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}<br>${d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }).replace(':', 'h')}</div><div class="body">
    <h3>${esc(e.title)}</h3><p class="place">${esc([e.place, e.city].filter(Boolean).join(', '))}${z ? ' (' + z.n + ')' : ''}</p>
    <p class="meta">${meta}${link}</p><p class="src">Proposé par : ${who}</p><div class="actions">${act}</div></div></article>`;
}

async function decide(id, to) {
  const e = [...pending, ...published].find(x => x.id === id); if (!e) return;
  const delta = e.status === 'published' ? POINTS_KO - POINTS_OK : to === 'published' ? POINTS_OK : POINTS_KO;
  const b = writeBatch(db);
  b.update(doc(db, 'events', id), { status: to, reviewedAt: serverTimestamp() });
  if (e.submittedBy) b.set(doc(db, 'users', e.submittedBy), { name: e.submitterName || '', score: increment(delta), updatedAt: serverTimestamp() }, { merge: true });
  try { await b.commit(); await refresh(); } catch (err) { console.error(err); $('info').textContent = 'Action impossible.'; }
}

// Ajout direct (publié sans validation), avec répétition : une fiche est créée par date, reliées par un seriesId.
async function addEvents(ev) {
  ev.preventDefault();
  const msg = t => { $('msg').textContent = t; };
  const v = Object.fromEntries(new FormData($('f')));
  const z = ZONES.find(z => z.id === v.zone), base = new Date(`${v.date}T${v.time}`);
  if (!z || isNaN(base)) return msg('Vérifiez la date, l’heure et la zone.');
  const step = v.repeat === 'weekly' ? 7 : v.repeat === 'biweekly' ? 14 : 0;
  const until = step ? new Date(`${v.until}T23:59`) : base;
  if (isNaN(until) || until < base) return msg('Choisissez la date de fin de la répétition.');
  const dates = [];
  for (let i = 0; i < 101; i++) {
    const d = new Date(base.getFullYear(), base.getMonth(), base.getDate() + i * step, base.getHours(), base.getMinutes());
    if (d > until) break;
    dates.push(d); if (!step) break;
  }
  if (dates.length > 100) return msg('100 dates maximum : raccourcissez la période.');
  const data = { title: v.title.trim(), country: z.c, regionId: z.id, city: v.city.trim(), status: 'published', createdAt: serverTimestamp() };
  if (v.place.trim()) data.place = v.place.trim();
  if (v.type) data.type = v.type;
  ['ageMin', 'ageMax', 'price'].forEach(k => { if (v[k] !== '' && !isNaN(Number(v[k]))) data[k] = Number(v[k]); });
  if (data.price !== undefined && z.c === 'CH') data.currency = 'CHF';
  if (/^https?:\/\//.test(v.sourceUrl)) data.sourceUrl = v.sourceUrl;
  if (v.sourceName.trim()) data.sourceName = v.sourceName.trim();
  if (step) data.seriesId = crypto.randomUUID ? crypto.randomUUID() : String(Date.now());
  $('send').disabled = true;
  try {
    const col = collection(db, 'events');
    for (let i = 0; i < dates.length; i += 400) {
      const b = writeBatch(db);
      dates.slice(i, i + 400).forEach(d => b.set(doc(col), { ...data, startsAt: Timestamp.fromDate(d) }));
      await b.commit();
    }
    $('f').reset(); msg(`${dates.length} événement${dates.length > 1 ? 's' : ''} publié${dates.length > 1 ? 's' : ''}.`); await refresh();
  } catch (err) { console.error(err); msg('Publication impossible.'); }
  $('send').disabled = false;
}

async function delSeries(id) {
  if (!confirm('Supprimer toutes les dates de cette série (passées et à venir) ?')) return;
  try {
    const snap = await getDocs(query(collection(db, 'events'), where('seriesId', '==', id)));
    for (let i = 0; i < snap.docs.length; i += 400) {
      const b = writeBatch(db); snap.docs.slice(i, i + 400).forEach(d => b.delete(d.ref)); await b.commit();
    }
    await refresh();
  } catch (err) { console.error(err); $('info').textContent = 'Suppression impossible.'; }
}
