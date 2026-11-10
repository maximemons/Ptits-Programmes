import { db, configured, onUser, login, logout, esc } from './firebase.js';
import { collection, addDoc, getDocs, doc, deleteDoc, updateDoc, deleteField, query, where, limit, serverTimestamp, Timestamp } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';
import { COUNTRIES, ZONES, defaultZone } from './regions.js';

const $ = id => document.getElementById(id);
let user = null, editing = null, myEvents = [];

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
  // Modifier (propositions en attente) et supprimer (tous états) : les règles Firestore appliquent les mêmes limites.
  $('mine').onclick = async e => {
    const ed = e.target.closest('[data-edit]');
    if (ed) return startEdit(ed.dataset.edit);
    const b = e.target.closest('[data-del]'); if (!b) return;
    const ev = myEvents.find(x => x.id === b.dataset.del);
    if (!confirm(ev?.status === 'published' ? 'Cet événement est publié : le supprimer le retire du site. Continuer ?' : 'Supprimer cette proposition ?')) return;
    try { await deleteDoc(doc(db, 'events', b.dataset.del)); if (editing?.id === b.dataset.del) stopEdit(); } catch (err) { console.error(err); }
    loadMine();
  };
  $('cancel').onclick = stopEdit;
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
  const n = k => v[k] !== '' && !isNaN(Number(v[k])) ? Number(v[k]) : undefined, price = n('price');
  // Champs facultatifs : undefined = vide (retiré de la fiche en cas de modification).
  const opt = {
    place: v.place.trim() || undefined, address: v.address.trim() || undefined, type: v.type || undefined,
    ageMin: n('ageMin'), ageMax: n('ageMax'), price, currency: price !== undefined && z.c === 'CH' ? 'CHF' : undefined,
    sourceUrl: /^https?:\/\//.test(v.sourceUrl) ? v.sourceUrl : undefined, sourceName: v.sourceName.trim() || undefined,
    endsAt: undefined, repeat: undefined, until: undefined
  };
  if (v.endTime) {
    const end = new Date(`${v.date}T${v.endTime}`);
    if (!(end > start)) return msg('L’heure de fin doit être après l’heure de début.');
    opt.endsAt = Timestamp.fromDate(end);
  }
  if (v.repeat) {
    const until = new Date(`${v.until}T23:59`);
    if (isNaN(until) || until < start) return msg('Choisissez la date de fin de la répétition.');
    if (until - start > 366 * 864e5) return msg('La répétition ne peut pas dépasser un an.');
    opt.repeat = v.repeat; opt.until = Timestamp.fromDate(until);
  }
  const core = { title: v.title.trim(), startsAt: Timestamp.fromDate(start), country: z.c, regionId: z.id, city: v.city.trim() };
  $('send').disabled = true;
  try {
    if (editing) {
      const upd = Object.fromEntries(Object.entries(opt).map(([k, x]) => [k, x === undefined ? deleteField() : x]));
      await updateDoc(doc(db, 'events', editing.id), { ...core, ...upd });
      stopEdit(); msg('Modifications enregistrées.');
    } else {
      const set = Object.fromEntries(Object.entries(opt).filter(([, x]) => x !== undefined));
      await addDoc(collection(db, 'events'), { ...core, ...set, status: 'pending', submittedBy: user.uid, submitterName: user.displayName || '', createdAt: serverTimestamp() });
      $('f').reset(); msg('Merci ! Votre proposition est en attente de relecture.'); presetZone();
    }
    loadMine();
  } catch (err) { console.error(err); msg('Envoi impossible. Vérifiez les champs et réessayez.'); }
  $('send').disabled = false;
}

function startEdit(id) {
  const e = myEvents.find(x => x.id === id); if (!e || e.status !== 'pending') return;
  editing = e;
  const f = $('f').elements, d = e.startsAt.toDate(), t = x => x.toTimeString().slice(0, 5);
  Object.entries({
    title: e.title, date: d.toLocaleDateString('sv-SE'), time: t(d), endTime: e.endsAt ? t(e.endsAt.toDate()) : '', city: e.city,
    place: e.place || '', address: e.address || '', type: e.type || '', zone: e.regionId, ageMin: e.ageMin ?? '', ageMax: e.ageMax ?? '',
    price: e.price ?? '', sourceUrl: e.sourceUrl || '', sourceName: e.sourceName || '',
    repeat: e.repeat && e.repeat !== 'none' ? e.repeat : '', until: e.until ? e.until.toDate().toLocaleDateString('sv-SE') : ''
  }).forEach(([k, x]) => { f[k].value = x; });
  setMode(true); $('f').scrollIntoView({ behavior: 'smooth' });
}
function setMode(on) {
  $('send').textContent = on ? 'Enregistrer les modifications' : 'Envoyer ma proposition';
  $('cancel').hidden = !on; $('date').min = on ? '' : new Date().toLocaleDateString('sv-SE');
}
function stopEdit() { editing = null; $('f').reset(); setMode(false); presetZone(); }

async function loadMine() {
  try {
    const s = await getDocs(query(collection(db, 'events'), where('submittedBy', '==', user.uid)));
    const L = { pending: 'En attente', published: 'Publié', rejected: 'Refusé' };
    myEvents = s.docs.map(x => ({ id: x.id, ...x.data() })).sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
    $('mine').innerHTML = myEvents.length ? myEvents.map(e => `<p class="mine"><span class="pill ${esc(e.status)}">${L[e.status] || esc(e.status)}</span> ${esc(e.title)} <span class="note">${e.startsAt.toDate().toLocaleDateString('fr-FR')}</span>` +
      `${e.status === 'pending' ? ` <button class="chip" type="button" data-edit="${e.id}">Modifier</button>` : ''} <button class="chip" type="button" data-del="${e.id}">Supprimer</button></p>`).join('')
      : '<p class="note">Aucune proposition pour l’instant.</p>';
  } catch (e) { console.error(e); }
}
