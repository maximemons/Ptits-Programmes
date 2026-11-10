import { db, configured, onUser, login, logout, esc } from './firebase.js';
import { collection, addDoc, getDocs, doc, deleteDoc, query, where, limit, serverTimestamp, Timestamp } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';
import { COUNTRIES, ZONES, defaultZone } from './regions.js';

const $ = id => document.getElementById(id);
let user = null;

if (!configured) {
  $('login').hidden = false; $('go').hidden = true;
  $('err').textContent = 'Firebase n’est pas encore configuré (js/firebase-config.js).';
} else {
  $('zone').innerHTML = '<option value="">Choisir…</option>' + Object.entries(COUNTRIES).map(([c, o]) =>
    `<optgroup label="${o.n}">${ZONES.filter(z => z.c === c).map(z => `<option value="${z.id}">${z.n}</option>`).join('')}</optgroup>`).join('');
  $('date').min = new Date().toLocaleDateString('sv-SE');
  $('go').onclick = async () => {
    try { await login(); } catch (e) { $('err').textContent = e.code === 'auth/popup-closed-by-user' ? '' : 'Connexion impossible. Réessayez.'; }
  };
  $('out').onclick = logout;
  $('f').onsubmit = submit;
  // Suppression d’une proposition en attente ou refusée (les règles Firestore interdisent le reste).
  $('mine').onclick = async e => {
    const b = e.target.closest('[data-del]');
    if (!b || !confirm('Supprimer cette proposition ?')) return;
    try { await deleteDoc(doc(db, 'events', b.dataset.del)); } catch (err) { console.error(err); }
    loadMine();
  };
  onUser(u => {
    user = u; $('login').hidden = !!u; $('app').hidden = !u; $('who').hidden = !u;
    if (u) { $('name').textContent = u.displayName || u.email; loadMine(); checkAdmin(); presetZone(); }
  });
}

// Le bouton « Administration » n’apparaît que si les règles Firestore autorisent ce compte à lire les scores (donc l’administrateur).
async function checkAdmin() {
  try { await getDocs(query(collection(db, 'users'), limit(1))); $('adm').hidden = false; } catch { $('adm').hidden = true; }
}

// Zone par défaut : dernière zone choisie sur la page d’accueil, sinon position de la personne.
async function presetZone() {
  if ($('zone').value) return;
  const id = await defaultZone();
  if (id && !$('zone').value) $('zone').value = id;
}

async function submit(e) {
  e.preventDefault();
  const msg = t => { $('msg').textContent = t; };
  const v = Object.fromEntries(new FormData($('f')));
  const z = ZONES.find(z => z.id === v.zone), start = new Date(`${v.date}T${v.time}`);
  if (!z || isNaN(start)) return msg('Vérifiez la date, l’heure et la zone.');
  const data = {
    title: v.title.trim(), startsAt: Timestamp.fromDate(start), country: z.c, regionId: z.id, city: v.city.trim(),
    status: 'pending', submittedBy: user.uid, submitterName: user.displayName || '', createdAt: serverTimestamp()
  };
  if (v.endTime) {
    const end = new Date(`${v.date}T${v.endTime}`);
    if (!(end > start)) return msg('L’heure de fin doit être après l’heure de début.');
    data.endsAt = Timestamp.fromDate(end);
  }
  if (v.repeat) {
    const until = new Date(`${v.until}T23:59`);
    if (isNaN(until) || until < start) return msg('Choisissez la date de fin de la répétition.');
    if (until - start > 366 * 864e5) return msg('La répétition ne peut pas dépasser un an.');
    data.repeat = v.repeat; data.until = Timestamp.fromDate(until);
  }
  if (v.place.trim()) data.place = v.place.trim();
  if (v.address.trim()) data.address = v.address.trim();
  if (v.type) data.type = v.type;
  ['ageMin', 'ageMax', 'price'].forEach(k => { if (v[k] !== '' && !isNaN(Number(v[k]))) data[k] = Number(v[k]); });
  if (data.price !== undefined && z.c === 'CH') data.currency = 'CHF';
  if (/^https?:\/\//.test(v.sourceUrl)) data.sourceUrl = v.sourceUrl;
  if (v.sourceName.trim()) data.sourceName = v.sourceName.trim();
  $('send').disabled = true;
  try {
    await addDoc(collection(db, 'events'), data);
    $('f').reset(); msg('Merci ! Votre proposition est en attente de relecture.'); loadMine(); presetZone();
  } catch (err) { console.error(err); msg('Envoi impossible. Vérifiez les champs et réessayez.'); }
  $('send').disabled = false;
}

async function loadMine() {
  try {
    const s = await getDocs(query(collection(db, 'events'), where('submittedBy', '==', user.uid)));
    const L = { pending: 'En attente', published: 'Publié', rejected: 'Refusé' };
    const rows = s.docs.map(x => ({ id: x.id, ...x.data() })).sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
    $('mine').innerHTML = rows.length ? rows.map(e => `<p class="mine"><span class="pill ${esc(e.status)}">${L[e.status] || esc(e.status)}</span> ${esc(e.title)} <span class="note">${e.startsAt.toDate().toLocaleDateString('fr-FR')}</span>${e.status === 'published' ? '' : ` <button class="chip" type="button" data-del="${e.id}">Supprimer</button>`}</p>`).join('')
      : '<p class="note">Aucune proposition pour l’instant.</p>';
  } catch (e) { console.error(e); }
}
