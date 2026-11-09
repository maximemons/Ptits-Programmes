import { db, configured, onUser, login, logout, esc } from './firebase.js';
import { collection, addDoc, getDocs, getDoc, doc, query, where, serverTimestamp, Timestamp } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';
import { COUNTRIES, ZONES } from './regions.js';

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
  onUser(u => {
    user = u; $('login').hidden = !!u; $('app').hidden = !u; $('who').hidden = !u;
    if (u) { $('name').textContent = u.displayName || u.email; loadMine(); }
  });
}

async function submit(e) {
  e.preventDefault();
  const v = Object.fromEntries(new FormData($('f')));
  const z = ZONES.find(z => z.id === v.zone), d = new Date(`${v.date}T${v.time}`);
  if (!z || isNaN(d)) { $('msg').textContent = 'Vérifiez la date, l’heure et la zone.'; return; }
  const data = {
    title: v.title.trim(), startsAt: Timestamp.fromDate(d), country: z.c, regionId: z.id, city: v.city.trim(),
    status: 'pending', submittedBy: user.uid, submitterName: user.displayName || '', createdAt: serverTimestamp()
  };
  if (v.place.trim()) data.place = v.place.trim();
  if (v.type) data.type = v.type;
  ['ageMin', 'ageMax', 'price'].forEach(k => { if (v[k] !== '' && !isNaN(Number(v[k]))) data[k] = Number(v[k]); });
  if (data.price !== undefined && z.c === 'CH') data.currency = 'CHF';
  if (/^https?:\/\//.test(v.sourceUrl)) data.sourceUrl = v.sourceUrl;
  if (v.sourceName.trim()) data.sourceName = v.sourceName.trim();
  $('send').disabled = true;
  try {
    await addDoc(collection(db, 'events'), data);
    $('f').reset(); $('msg').textContent = 'Merci ! Votre proposition est en attente de relecture.'; loadMine();
  } catch (err) { console.error(err); $('msg').textContent = 'Envoi impossible. Vérifiez les champs et réessayez.'; }
  $('send').disabled = false;
}

async function loadMine() {
  try {
    const [s, u] = await Promise.all([getDocs(query(collection(db, 'events'), where('submittedBy', '==', user.uid))), getDoc(doc(db, 'users', user.uid))]);
    const sc = u.exists() ? u.data().score || 0 : 0;
    $('score').textContent = `Votre fiabilité : ${sc} point${Math.abs(sc) > 1 ? 's' : ''}.`;
    const L = { pending: 'En attente', published: 'Publié', rejected: 'Refusé' };
    const rows = s.docs.map(x => x.data()).sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
    $('mine').innerHTML = rows.length ? rows.map(e => `<p class="mine"><span class="pill ${esc(e.status)}">${L[e.status] || esc(e.status)}</span> ${esc(e.title)} <span class="note">${e.startsAt.toDate().toLocaleDateString('fr-FR')}</span></p>`).join('')
      : '<p class="note">Aucune proposition pour l’instant.</p>';
  } catch (e) { console.error(e); }
}
