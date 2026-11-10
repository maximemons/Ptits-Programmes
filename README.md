# Les P’tits Programmes — L’agenda des familles

Un agenda qui réunit au même endroit les événements pour enfants : mairies, cafés pour enfants, associations, pages Facebook. Les données sont stockées dans Cloud Firestore ; le site est statique (HTML, CSS, JavaScript), sans étape de build, et s’héberge par exemple sur GitHub Pages ou Firebase Hosting.

## Choisir sa zone

- Au premier chargement, le site propose la géolocalisation et affiche l’agenda de la zone détectée. Le titre s’adapte (« L’agenda des familles de Bretagne », « … des Hauts-de-France », etc.).
- Le sélecteur « Où ? » permet de choisir à la main : Partout, un pays entier ou une zone précise.
- Le bouton « Autour de moi » relance la localisation à tout moment.
- La zone choisie est mémorisée sur l’appareil. La position elle-même n’est jamais enregistrée.

Zones disponibles :

- France : les 13 régions métropolitaines et les 5 régions d’outre-mer.
- Belgique : Bruxelles-Capitale et les 10 provinces.
- Suisse : les 26 cantons.

## Parcourir les événements

- Les événements des 60 prochains jours sont regroupés par jour, dans l’ordre chronologique.
- Une guirlande de 60 fanions, calculée à partir de la date du jour (rien n’est écrit en dur), permet de n’afficher qu’un seul jour. Un second clic revient à la vue complète. Les noms de mois s’affichent entre les fanions.
- Les flèches ‹ › font défiler la guirlande, et « Aujourd’hui » revient au début.
- Le sélecteur « Aller à une date » permet de viser n’importe quel jour à venir : si la date est au-delà des 60 jours chargés, la guirlande et les événements repartent de cette date. La durée affichée se règle avec `WINDOW` dans `js/app.js`.
- Les filtres combinables : âge (0–3, 3–6, 6–12 ans), type (atelier, spectacle, sortie nature, éveil et contes, loisirs) et gratuit.
- Si rien ne correspond, un bouton « Tout réafficher » réinitialise les filtres.

## Proposer un événement

- Le lien « Proposer un événement » ouvre `proposer.html` dans un nouvel onglet. Aucune connexion n’apparaît sur la page d’accueil.
- Le visiteur se connecte avec Google, ou est directement reconnu s’il s’est déjà connecté sur cet appareil.
- Le formulaire crée un événement avec `status: "pending"` : il reste invisible tant qu’il n’est pas validé.
- La page affiche les propositions du compte avec leur état (en attente, publié, refusé) et propose par défaut sa zone (celle mémorisée sur la page d’accueil, sinon sa position). Le score de fiabilité n’est jamais visible par le proposant.
- Chaque proposition a un bouton « Supprimer », quel que soit son état (supprimer une proposition publiée la retire du site). Les propositions encore en attente ont aussi un bouton « Modifier » ; une fois publiées, seule l’administration peut les modifier.
- On peut indiquer une heure de début et de fin, et une fréquence (toutes les semaines ou toutes les 2 semaines jusqu’à une date, un an maximum). Une proposition récurrente reste une seule fiche en attente : toutes les dates sont créées quand elle est validée.
- L’administrateur voit un bouton « Page admin » ; il est détecté par la lecture de la collection `users`, réservée à l’administrateur.

## Administration

- `admin.html` est réservée au compte Google dont l’adresse figure dans les règles Firestore (`isAdmin`). Toute autre personne reçoit « Accès réservé ».
- Quatre onglets : **À valider**, **Pas fiables** et **Publiés** (pour dépublier).
- **Valider** publie l’événement et ajoute des points au proposant ; **Refuser** en retire. Le barème se règle en haut de `js/admin.js` : un nouveau compte démarre à 50 points, validé +5, refusé −15, plafond 200, plancher −50, et « pas fiable » à 0 ou moins.
- Un compte sous le seuil voit ses nouvelles propositions arriver dans l’onglet **Pas fiables**, pour ne pas encombrer la file principale.
- L’onglet **Ajouter** publie directement un événement, sans validation ni score. Il peut se répéter toutes les semaines (par exemple tous les jeudis) ou toutes les 2 semaines jusqu’à une date de fin, 100 dates au maximum : une fiche est créée par date, reliées par un `seriesId`.
- Dans **Publiés** (les 100 prochaines dates), « Supprimer la série » retire toutes les dates d’un événement répété.
- « Supprimer » efface définitivement un événement publié, sans effet sur le score ; « Dépublier » le refuse, avec la pénalité.
- « Éditer » (sur les événements à valider et publiés) ouvre le formulaire pré-rempli : titre, date, heures, lieu, adresse, zone, âges, prix et source sont modifiables, et un champ vidé est retiré de la fiche. Pour un événement répété, une case permet d’appliquer les changements communs aux autres dates de la série ; les dates et heures ne se modifient que sur la fiche éditée.
- Dépublier un événement déjà validé annule le gain et applique la pénalité.
- Les scores sont dans la collection `users`, modifiable uniquement par l’administrateur.

## Les cartes d’événement

Chaque carte affiche :

- l’heure de début, sur un bandeau de la couleur du type d’événement ;
- le titre, le lieu et la ville ;
- le type, la tranche d’âge et le prix (ou « Gratuit ») ;
- la provenance de l’information et un lien vers l’annonce d’origine ;
- un lien « Itinéraire » quand l’événement a une adresse : il ouvre Apple Plans sur iPhone, l’application GPS par défaut sur Android et Google Maps sur ordinateur (adresse + ville).

L’âge, le prix et le lien sont facultatifs : un champ absent n’est tout simplement pas affiché.

## Confort d’utilisation

- Le site s’adapte aux écrans de téléphone, de tablette et d’ordinateur, avec des zones tactiles d’au moins 44 px et le respect des encoches d’écran.
- Les thèmes clair et sombre suivent le réglage de l’appareil.
- Le contenu venant de la base est toujours échappé avant affichage, et seuls les liens `http` et `https` sont acceptés.

## Structure du dépôt

```
index.html
proposer.html           formulaire de proposition (connexion Google)
admin.html              validation des propositions (administrateur)
favicon.ico
README.md
css/style.css
js/app.js               affichage, filtres, géolocalisation, lecture Firestore
js/regions.js           pays et zones (France, Belgique, Suisse)
js/firebase-config.js   configuration du projet Firebase
js/firebase.js          initialisation partagée (Firestore, connexion Google)
js/maps.js              lien d’itinéraire (GPS ou Google Maps)
js/proposer.js          formulaire et suivi des propositions
js/admin.js             file de validation et score de fiabilité
```

## Mise en place de Firebase

1. Créer un projet sur https://console.firebase.google.com et activer **Firestore Database**.
2. Ajouter une application Web et copier sa configuration dans `js/firebase-config.js`. Ces valeurs ne sont pas secrètes : la sécurité repose sur les règles ci-dessous.
3. Dans Firestore > Règles, coller ceci en remplaçant `VOTRE_EMAIL@gmail.com` par l’adresse Google de l’administrateur :

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    function isAdmin() {
      return request.auth != null
        && request.auth.token.email == 'VOTRE_EMAIL@gmail.com'
        && request.auth.token.email_verified == true;
    }

    // Contenu autorisé pour une proposition de visiteur (création ou modification).
    function validProposal() {
      let d = request.resource.data;
      return d.keys().hasAll(['title', 'startsAt', 'country', 'regionId', 'city'])
        && d.keys().hasOnly(['title', 'startsAt', 'endsAt', 'country', 'regionId', 'city', 'place', 'address',
            'ageMin', 'ageMax', 'type', 'price', 'currency', 'sourceName', 'sourceUrl',
            'repeat', 'until', 'status', 'submittedBy', 'submitterName', 'createdAt'])
        && d.get('repeat', 'none') in ['none', 'weekly', 'biweekly']
        && d.title is string && d.title.size() > 2 && d.title.size() < 140
        && d.startsAt is timestamp
        && d.status == 'pending'
        && d.submittedBy == request.auth.uid;
    }

    match /events/{id} {
      allow read: if resource.data.status == 'published'
        || isAdmin()
        || (request.auth != null && resource.data.submittedBy == request.auth.uid);

      allow create: if isAdmin()
        || (request.auth != null && validProposal() && request.resource.data.createdAt == request.time);

      // Un visiteur ne modifie que ses propositions encore en attente.
      allow update: if isAdmin()
        || (request.auth != null && resource.data.submittedBy == request.auth.uid
            && resource.data.status == 'pending' && validProposal()
            && request.resource.data.createdAt == resource.data.createdAt);

      // Un visiteur peut supprimer ses propositions, quel que soit leur état.
      allow delete: if isAdmin()
        || (request.auth != null && resource.data.submittedBy == request.auth.uid);
    }

    // Scores de fiabilité : jamais visibles par les utilisateurs.
    match /users/{uid} {
      allow read, write: if isAdmin();
    }
  }
}
```

4. Dans Firestore > Index, créer trois index composites sur la collection `events` (tous en ordre croissant) :
   - `status`, `startsAt`
   - `status`, `country`, `startsAt`
   - `status`, `regionId`, `startsAt`

   Si un index manque, la console du navigateur affiche un lien qui le crée en un clic.
5. Dans **Authentication** > Sign-in method, activer le fournisseur **Google**, puis dans Paramètres > Domaines autorisés, ajouter le domaine du site (par exemple `utilisateur.github.io`).
6. Ajouter les événements dans la collection `events` depuis la console Firebase (ou avec le SDK Admin pour des imports).

## Modèle de données

Collection `events` :

| Champ | Type | Exemple |
|---|---|---|
| title | texte | Heure du conte |
| place, city | texte | Médiathèque, Quimper |
| address | texte, facultatif | 12 rue des Lilas |
| country | `FR`, `BE` ou `CH` | FR |
| regionId | texte (voir `js/regions.js`) | fr-bre |
| startsAt, endsAt | horodatage (endsAt facultatif) | 14 nov. 2026, 10:30 |
| repeat, until | `weekly` ou `biweekly` et date de fin (propositions en attente) | weekly |
| ageMin, ageMax | nombre | 3, 7 |
| type | `atelier`, `spectacle`, `nature`, `eveil`, `loisirs` | eveil |
| price | nombre (0 = gratuit) | 0 |
| currency | texte, facultatif (€ par défaut) | CHF |
| sourceName, sourceUrl | texte | Ville de Quimper, https://… |
| seriesId | texte, présent sur les événements répétés | 3f2a… |
| status | `published`, `pending` ou `rejected` | published |
| submittedBy, submitterName | texte (rempli par le formulaire) | uid Google, Camille |
| createdAt, reviewedAt | horodatage (remplis par le site) | |

Les identifiants de zone sont de la forme `<pays>-<code>` : `fr-bre` (Bretagne), `fr-hdf` (Hauts-de-France), `be-bru` (Bruxelles-Capitale), `ch-ge` (Genève).

Collection `users/{uid}` (lecture et écriture réservées à l’administrateur) : `name` et `score` de fiabilité (50 par défaut), créée automatiquement à la première décision de l’administrateur.

## Ajouter un pays ou un niveau plus fin

Ajouter une entrée dans `COUNTRIES` et dans `RAW` (`js/regions.js`) : chaque zone se décrit par un code, un nom, la forme « de … » pour le titre et les coordonnées de son centre. Rien d’autre à modifier.

## Géolocalisation : à savoir

Pour retrouver la région à partir de la position, le site interroge le service gratuit Nominatim (OpenStreetMap) avec des coordonnées arrondies à environ 1 km. Ce service convient à un faible trafic ; en production, prévoir un service de géocodage dédié.
