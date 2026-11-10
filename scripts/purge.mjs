// Supprime les événements commencés il y a plus de RETENTION_DAYS jours (7 par défaut), tous statuts confondus.
// DRY_RUN=true : compte seulement, sans rien supprimer.
// Identifiants : GOOGLE_APPLICATION_CREDENTIALS (chemin d’une clé de compte de service).
import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';

const DAYS = Number(process.env.RETENTION_DAYS || 7);
const DRY = process.env.DRY_RUN === 'true';

initializeApp({ credential: applicationDefault() });
const db = getFirestore();
const limite = Timestamp.fromDate(new Date(Date.now() - DAYS * 864e5));
const q = db.collection('events').where('startsAt', '<', limite);

if (DRY) {
  const { count } = (await q.count().get()).data();
  console.log(`[simulation] ${count} événement(s) commencé(s) il y a plus de ${DAYS} jours seraient supprimé(s).`);
} else {
  let total = 0;
  for (;;) {
    const snap = await q.limit(400).get();
    if (snap.empty) break;
    const batch = db.batch();
    snap.docs.forEach(d => batch.delete(d.ref));
    await batch.commit();
    total += snap.size;
  }
  console.log(`${total} événement(s) supprimé(s) (commencés il y a plus de ${DAYS} jours).`);
}
