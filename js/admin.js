import { db, configured, onUser, login, logout, esc } from './firebase.js';
import { collection, getDocs, doc, query, where, orderBy, limit, writeBatch, serverTimestamp, Timestamp } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';
import { COUNTRIES, ZONES } from './regions.js';

// Fiabilité : un nouveau compte démarre à START, les points restent entre MIN et MAX, et SEUIL ou moins = « peu fiable ».
const START = 50, MAX = 200, MIN = -50, SEUIL = 0, POINTS_OK = 5, POINTS_KO = -15;
const TYPES = ['atelier', 'spectacle', 'nature', 'eveil', 'loisirs'];
const $ = id => document.getElementById(id);
const uid = () => crypto.randomUUID ? crypto.randomUUID() : String(Date.now());
const hm = d => d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }).replace(':', 'h');
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
    const ev = collection(db, 'events'), today = new Date(new Date().setHours(0, 0, 0, 0));
    const [p, pub, us] = await Promise.all([
      getDocs(query(ev, where('status', '==', 'pending'))),
      getDocs(query(ev, where('status', '==', 'published'), where('startsAt', '>=', Timestamp.fromDate(today)), orderBy('startsAt'), limit(100))),
      getDocs(collection(db, 'users'))
    ]);
    scores = Object.fromEntries(us.docs.map(d => [d.id, d.data().score ?? START]));
    const map = d => ({ id: d.id, ...d.data() });
    pending = p.docs.map(map).sort((a, b) => (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0));
    published = pub.docs.map(map);
    render();
  } catch (e) {
    console.error(e);
    $('info').textContent = e.code === 'permission-denied' ? 'Accès réservé : ce compte n’est pas administrateur.' : 'Chargement impossible.';
  }
}

const score = e => scores[e.submittedBy] ?? START;
const low = e => e.submittedBy && score(e) <= SEUIL;

function render() {
  const todo = pending.filter(e => !low(e)), bad = pending.filter(low);
  const labels = { todo: `À valider (${todo.length})`, low: `Pas fiables (${bad.length})`, pub: 'Publiés', add: 'Ajouter' };
  document.querySelectorAll('#tabs [data-t]').forEach(b => { b.textContent = labels[b.dataset.t]; b.setAttribute('aria-pressed', b.dataset.t === tab); });
  $('f').hidden = tab !== 'add'; $('info').hidden = $('list').hidden = tab === 'add';
  const list = tab === 'todo' ? todo : tab === 'low' ? bad : published;
  $('info').textContent = `Nouveau compte : ${START} points (entre ${MIN} et ${MAX}). Validé +${POINTS_OK}, refusé ${POINTS_KO}. Pas fiable à ${SEUIL} ou moins.`;
  $('list').innerHTML = list.length ? list.map(card).join('') : '<p class="note">Rien à traiter ici.</p>';
}

function card(e) {
  const d = e.startsAt.toDate(), z = ZONES.find(z => z.id === e.regionId), k = TYPES.includes(e.type) ? e.type : 'loisirs';
  const who = e.submittedBy ? `${esc(e.submitterName || 'Compte sans nom')} <span class="score${low(e) ? ' low' : ''}">${score(e)}</span>` : 'Ajout manuel';
  const rep = e.repeat && e.repeat !== 'none' && e.until ? `répété ${e.repeat === 'biweekly' ? 'toutes les 2 semaines' : 'chaque semaine'} jusqu’au ${e.until.toDate().toLocaleDateString('fr-FR')}` : e.seriesId && 'récurrent';
  const meta = [e.type && esc(e.type), e.ageMin != null && e.ageMax != null && `${esc(e.ageMin)}–${esc(e.ageMax)} ans`, typeof e.price === 'number' && (e.price ? `${esc(e.price)} ${esc(e.currency || '€')}` : 'Gratuit'), rep].filter(Boolean).join(' · ');
  const link = /^https?:\/\//.test(e.sourceUrl || '') ? ` <a href="${esc(e.sourceUrl)}" target="_blank" rel="noopener noreferrer">Annonce</a>` : '';
  const act = tab === 'pub'
    ? `<button class="btn ko" data-id="${e.id}" data-to="rejected" type="button">Dépublier</button>` + (e.seriesId ? `<button class="btn ko" data-series="${esc(e.seriesId)}" type="button">Supprimer la série</button>` : '')
    : `<button class="btn ok" data-id="${e.id}" data-to="published" type="button">Valider</button><button class="btn ko" data-id="${e.id}" data-to="rejected" type="button">Refuser</button>`;
  return `<article class="card t-${k}"><div class="when"><span>${d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}<br>${hm(d)}${e.endsAt ? `<small>→ ${hm(e.endsAt.toDate())}</small>` : ''}</span></div><div class="body">
    <h3>${esc(e.title)}</h3><p class="place">${esc([e.place, e.address, e.city].filter(Boolean).join(', '))}${z ? ' (' + z.n + ')' : ''}</p>
    <p class="meta">${meta}${link}</p><p class="src">Proposé par : ${who}</p><div class="actions">${act}</div></div></article>`;
}

// Dates d’une répétition : step = 0 (une fois), 7 ou 14 jours ; même heure locale à chaque date.
function expand(base, step, until) {
  const out = [];
  for (let i = 0; i < 101; i++) {
    const d = new Date(base.getFullYear(), base.getMonth(), base.getDate() + i * step, base.getHours(), base.getMinutes());
    if (d > until) break;
    out.push(d); if (!step) break;
  }
  return out;
}

async function decide(id, to) {
  const e = [...pending, ...published].find(x => x.id === id); if (!e) return;
  const delta = e.status === 'published' ? POINTS_KO - POINTS_OK : to === 'published' ? POINTS_OK : POINTS_KO;
  const b = writeBatch(db), upd = { status: to, reviewedAt: serverTimestamp() };
  if (to === 'published' && e.repeat && e.repeat !== 'none' && e.until) {
    // Une proposition répétée devient une série : la 1re date est celle proposée, les suivantes sont créées ici.
    const start = e.startsAt.toDate(), dur = e.endsAt ? e.endsAt.toDate() - start : 0, sid = uid();
    const { id: _id, repeat, until, reviewedAt, submittedBy, submitterName, ...base } = e;
    upd.seriesId = sid;
    expand(start, repeat === 'biweekly' ? 14 : 7, until.toDate()).slice(1, 101).forEach(d =>
      b.set(doc(collection(db, 'events')), { ...base, status: 'published', seriesId: sid, createdAt: serverTimestamp(),
        startsAt: Timestamp.fromDate(d), ...(dur ? { endsAt: Timestamp.fromDate(new Date(d.getTime() + dur)) } : {}) }));
  }
  b.update(doc(db, 'events', id), upd);
  if (e.submittedBy) {
    const next = Math.min(MAX, Math.max(MIN, score(e) + delta));
    b.set(doc(db, 'users', e.submittedBy), { name: e.submitterName || '', score: next, updatedAt: serverTimestamp() }, { merge: true });
  }
  try { await b.commit(); await refresh(); } catch (err) { console.error(err); $('info').textContent = 'Action impossible.'; }
}

// Ajout direct (publié sans validation), éventuellement répété : une fiche par date, reliées par un seriesId.
async function addEvents(ev) {
  ev.preventDefault();
  const msg = t => { $('msg').textContent = t; };
  const v = Object.fromEntries(new FormData($('f')));
  const z = ZONES.find(z => z.id === v.zone), base = new Date(`${v.date}T${v.time}`);
  if (!z || isNaN(base)) return msg('Vérifiez la date, l’heure et la zone.');
  let dur = 0;
  if (v.endTime) { dur = new Date(`${v.date}T${v.endTime}`) - base; if (!(dur > 0)) return msg('L’heure de fin doit être après le début.'); }
  const step = v.repeat === 'weekly' ? 7 : v.repeat === 'biweekly' ? 14 : 0;
  const until = step ? new Date(`${v.until}T23:59`) : base;
  if (isNaN(until) || until < base) return msg('Choisissez la date de fin de la répétition.');
  const dates = expand(base, step, until);
  if (dates.length > 100) return msg('100 dates maximum : raccourcissez la période.');
  const data = { title: v.title.trim(), country: z.c, regionId: z.id, city: v.city.trim(), status: 'published', createdAt: serverTimestamp() };
  if (v.place.trim()) data.place = v.place.trim();
  if (v.address.trim()) data.address = v.address.trim();
  if (v.type) data.type = v.type;
  ['ageMin', 'ageMax', 'price'].forEach(k => { if (v[k] !== '' && !isNaN(Number(v[k]))) data[k] = Number(v[k]); });
  if (data.price !== undefined && z.c === 'CH') data.currency = 'CHF';
  if (/^https?:\/\//.test(v.sourceUrl)) data.sourceUrl = v.sourceUrl;
  if (v.sourceName.trim()) data.sourceName = v.sourceName.trim();
  if (step) data.seriesId = uid();
  $('send').disabled = true;
  try {
    const col = collection(db, 'events');
    for (let i = 0; i < dates.length; i += 400) {
      const b = writeBatch(db);
      dates.slice(i, i + 400).forEach(d => b.set(doc(col), { ...data, startsAt: Timestamp.fromDate(d), ...(dur ? { endsAt: Timestamp.fromDate(new Date(d.getTime() + dur)) } : {}) }));
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
