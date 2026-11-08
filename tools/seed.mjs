// Importe les événements d’exemple dans Firestore (SDK Admin : les règles publiques interdisent l’écriture).
//   cd tools && npm install firebase-admin
//   GOOGLE_APPLICATION_CREDENTIALS=cle.json node seed.mjs              ajoute les exemples
//   GOOGLE_APPLICATION_CREDENTIALS=cle.json node seed.mjs --supprimer  retire les exemples
// La clé : console Firebase > Paramètres du projet > Comptes de service > Générer une clé privée. Ne jamais la publier.
import { readFileSync } from 'node:fs';
import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';

const src = readFileSync(new URL('../js/exemples.js', import.meta.url), 'utf8');
const { exemples } = await import('data:text/javascript;base64,' + Buffer.from(src).toString('base64'));

initializeApp({ credential: applicationDefault() });
const db = getFirestore();

if (process.argv[2] === '--supprimer') {
  const snap = await db.collection('events').where('isExample', '==', true).get();
  for (let i = 0; i < snap.docs.length; i += 400) {
    const b = db.batch(); snap.docs.slice(i, i + 400).forEach(d => b.delete(d.ref)); await b.commit();
  }
  console.log(`${snap.size} événements d’exemple supprimés.`);
} else {
  const list = exemples();
  for (let i = 0; i < list.length; i += 400) {
    const b = db.batch();
    list.slice(i, i + 400).forEach(e => b.set(db.collection('events').doc(),
      { ...e, startsAt: Timestamp.fromDate(e.startsAt), createdAt: Timestamp.now(), isExample: true }));
    await b.commit();
  }
  console.log(`${list.length} événements d’exemple ajoutés.`);
}
