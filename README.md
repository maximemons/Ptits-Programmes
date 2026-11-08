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

- Les événements des 7 prochains jours sont regroupés par jour, dans l’ordre chronologique.
- Une guirlande de fanions permet de n’afficher qu’un seul jour. Un second clic revient à toute la semaine.
- Les filtres combinables : âge (0–3, 3–6, 6–12 ans), type (atelier, spectacle, sortie nature, éveil et contes, loisirs) et gratuit.
- Si rien ne correspond, un bouton « Tout réafficher » réinitialise les filtres.

## Les cartes d’événement

Chaque carte affiche :

- l’heure de début, sur un bandeau de la couleur du type d’événement ;
- le titre, le lieu et la ville ;
- le type, la tranche d’âge et le prix (ou « Gratuit ») ;
- la provenance de l’information et un lien vers l’annonce d’origine.

L’âge, le prix et le lien sont facultatifs : un champ absent n’est tout simplement pas affiché.

## Confort d’utilisation

- Le site s’adapte aux écrans de téléphone, de tablette et d’ordinateur, avec des zones tactiles d’au moins 44 px et le respect des encoches d’écran.
- Les thèmes clair et sombre suivent le réglage de l’appareil.
- Le contenu venant de la base est toujours échappé avant affichage, et seuls les liens `http` et `https` sont acceptés.

## Structure du dépôt

```
index.html
favicon.ico
README.md
css/style.css
js/app.js               affichage, filtres, géolocalisation, lecture Firestore
js/regions.js           pays et zones (France, Belgique, Suisse)
js/firebase-config.js   configuration du projet Firebase
```

## Mise en place de Firebase

1. Créer un projet sur https://console.firebase.google.com et activer **Firestore Database**.
2. Ajouter une application Web et copier sa configuration dans `js/firebase-config.js`. Ces valeurs ne sont pas secrètes : la sécurité repose sur les règles ci-dessous.
3. Dans Firestore > Règles, coller :

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /events/{id} {
      allow read: if resource.data.status == 'published';
      allow write: if false;
    }
    match /submissions/{id} {
      allow create: if request.resource.data.keys().hasOnly(
          ['title', 'place', 'city', 'regionId', 'startsAt', 'sourceUrl', 'contactEmail', 'createdAt'])
        && request.resource.data.title is string
        && request.resource.data.title.size() > 2 && request.resource.data.title.size() < 140
        && request.resource.data.createdAt == request.time;
      allow read, update, delete: if false;
    }
  }
}
```

4. Dans Firestore > Index, créer trois index composites sur la collection `events` (tous en ordre croissant) :
   - `status`, `startsAt`
   - `status`, `country`, `startsAt`
   - `status`, `regionId`, `startsAt`

   Si un index manque, la console du navigateur affiche un lien qui le crée en un clic.
5. Ajouter les événements dans la collection `events` depuis la console Firebase (ou avec le SDK Admin pour des imports).

## Modèle de données

Collection `events` :

| Champ | Type | Exemple |
|---|---|---|
| title | texte | Heure du conte |
| place, city | texte | Médiathèque, Quimper |
| country | `FR`, `BE` ou `CH` | FR |
| regionId | texte (voir `js/regions.js`) | fr-bre |
| startsAt | horodatage | 14 nov. 2026, 10:30 |
| ageMin, ageMax | nombre | 3, 7 |
| type | `atelier`, `spectacle`, `nature`, `eveil`, `loisirs` | eveil |
| price | nombre (0 = gratuit) | 0 |
| sourceName, sourceUrl | texte | Ville de Quimper, https://… |
| status | `published` ou `pending` | published |

Les identifiants de zone sont de la forme `<pays>-<code>` : `fr-bre` (Bretagne), `fr-hdf` (Hauts-de-France), `be-bru` (Bruxelles-Capitale), `ch-ge` (Genève).

Collection `submissions` : propositions de visiteurs, en création seule, à modérer puis recopier dans `events`.

## Ajouter un pays ou un niveau plus fin

Ajouter une entrée dans `COUNTRIES` et dans `RAW` (`js/regions.js`) : chaque zone se décrit par un code, un nom, la forme « de … » pour le titre et les coordonnées de son centre. Rien d’autre à modifier.

## Géolocalisation : à savoir

Pour retrouver la région à partir de la position, le site interroge le service gratuit Nominatim (OpenStreetMap) avec des coordonnées arrondies à environ 1 km. Ce service convient à un faible trafic ; en production, prévoir un service de géocodage dédié.
