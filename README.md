# Espace Nordique du Barioz — site + espace équipe

Refonte complète de espacenordiquedubarioz.fr : site public (10 pages) et **espace équipe** (`/admin`) où le dameur, l'équipe du foyer et les bénévoles mettent à jour l'état des pistes, la neige, les événements, etc., chacun selon ses droits.

Aucune dépendance npm (Node ≥ 22). Hébergement prévu : Vercel (pages statiques + 1 fonction `/api`).

## Lancer en local
```bash
npm run dev          # build + http://localhost:3000
npm run demo         # (autre terminal) données d'hiver fictives
npm test             # tests API (19 groupes)
SHOTS=./shots node tests/e2e.mjs   # tests navigateur (nécessite Playwright)
```
Comptes démo (local uniquement) : `admin@`, `foyer@`, `dameur@`, `benevole@`, `visiteur@barioz.local` — mot de passe `barioz-demo-2026`.

## Structure
- `src/pages/*.html` : pages ; `src/partials/` : en-tête, pied de page ; `src/assets/` : CSS/JS/images
- `build.mjs` : assemble `src/` → `dist/` (sitemap, robots inclus)
- `lib/api.js` : toute l'API ; `lib/perms.js` : **table des autorisations** ; `lib/store.js` : stockage
- `api/index.js` : fonction Vercel ; `server.mjs` : serveur local

## Photos et documents
Les photos du site sont dans `src/assets/img/photos/` (`hero`, `foyer`, `refuge`, `pistes`, `soirees`, `association`, `plan-acces`, `plan-pistes`) ; remplacez un fichier du même nom (.jpg/.webp/.png) pour changer l'image, sans toucher au code. Sans fichier, une illustration vectorielle prend la place (c'est le cas de la photo « scolaires », à ajouter si vous en avez une). Le cadrage de chaque photo se règle dans `build.mjs` (`FOCUS`). L'image de partage (réseaux, messageries) est `src/assets/img/og.jpg` (1200×630).
Les PDF (plan des pistes, parcours raquette) sont dans `src/assets/docs/` ; leurs adresses se changent dans l'admin > Infos du site.

## Déploiement Vercel
1. Importer le dépôt GitHub dans Vercel (build/output déjà définis dans `vercel.json`).
2. **Base de données** : Vercel → Storage → Marketplace → *Upstash Redis* (gratuit), connecter au projet (variables `KV_REST_API_URL` / `KV_REST_API_TOKEN` ajoutées automatiquement). Sans cela, les données ne sont PAS conservées (`/api/health` → `"persistent": false`).
3. Variables d'environnement : `SESSION_SECRET` (longue chaîne aléatoire), `SETUP_TOKEN` (jeton temporaire).
4. Créer le premier administrateur (une seule fois) :
```bash
curl -X POST https://VOTRE-SITE/api/setup -H "Content-Type: application/json" \
  -d '{"setupToken":"<SETUP_TOKEN>","name":"Prénom Nom","email":"vous@exemple.fr","password":"10 caractères minimum"}'
```
Puis supprimer `SETUP_TOKEN`. Les autres comptes se créent dans `/admin` → Équipe & droits.

## Damage automatique
`/admin` → Équipe & droits → *Accès automatiques* : crée un jeton aux droits limités (ex. « damage seulement »). Un raccourci téléphone, un script ou un capteur envoie ensuite :
```bash
curl -X POST https://VOTRE-SITE/api/ingest/grooming -H "Authorization: Bearer bzd_..." \
  -H "Content-Type: application/json" -d '{"all":true}'      # ou {"ids":["s1","s2"]}
```
`/api/ingest/conditions` accepte températures / neige selon les droits du jeton.

## Autorisations par défaut (modifiables dans l'admin)
| Droit | Admin | Équipe foyer | Dameur | Bénévole refuge |
|---|:-:|:-:|:-:|:-:|
| Ouvrir/fermer la saison | ✓ | ✓ | | |
| Neige au foyer | ✓ | ✓ | ✓ | |
| Neige au refuge | ✓ | ✓ | ✓ | ✓ |
| Températures, humidité, état neige | ✓ | ✓ | ✓ | |
| Risque d'avalanche | ✓ | ✓ | | |
| Message d'information | ✓ | ✓ | | |
| Ouvrir/fermer une piste | ✓ | ✓ | ✓ | |
| Déclarer un damage | ✓ | ✓ | ✓ | |
| Événements et soirées | ✓ | ✓ | | ✓ |
| Horaires, téléphone, liens | ✓ | ✓ | | |
| Tarifs | ✓ | | | |
| Comptes, autorisations, accès auto, journal | ✓ | | | |

Sécurité : mots de passe hachés (scrypt), session HttpOnly, droits revérifiés côté serveur, journal de toutes les modifications, limitation des tentatives de connexion, en-têtes CSP.

## Points à vérifier avant ouverture publique
- Tarifs et dates repris de l'ancien site (relevé le 20/11/2026) : les relire dans `/admin` → Tarifs. Les cellules « 62 / 80 » du tableau forfaits (prévente / tarif normal) sont une interprétation de l'ancien tableau.
- PDF des plans de pistes : liens encore vers l'ancien site ; à copier dans le projet avant de couper l'ancien site.


## Nouveautés v2

- **Boutons ouvrir/fermer/damée instantanés** : l'écran change tout de suite, l'envoi part en arrière-plan (file d'attente, un seul changement à la fois par piste, retour arrière + message en cas d'échec). L'admin lit `/api/public?fresh=1` (jamais mis en cache) ; le public garde un cache CDN de 10 s.
- **Météo de secours** (Open-Meteo, gratuit, sans clé) : un champ neige/température/humidité laissé vide, ou saisi il y a plus de 30 h, est complété par une estimation de modèle, affichée « estimation météo ». Coordonnées modifiables dans Infos du site ; `WEATHER_DISABLED=1` désactive. Estimation grossière : la saisie du dameur reste la référence.
- **Webcam intégrée** (accueil + conditions) : rafraîchie chaque minute, clic = agrandir, lien conservé (`webcamPageUrl`), message clair si indisponible.
- **Plan des pistes** intégré sur /pistes (clic = agrandir), boutons PDF conservés. L'image pointe encore vers l'ancien hébergement : avant de couper l'ancien site, déposez `plan-pistes.jpg`/PDF dans ce dépôt et changez les URL dans Infos du site.
- **Carte OpenStreetMap** intégrée sur /acces (repère au col du Barioz, coordonnées modifiables).
- **Compte « Visiteur (démo)»** : voit tous les écrans comme un admin, e-mails masqués, aucune écriture possible (refus serveur 403). Créez-le dans Équipe & droits > Comptes avec le rôle « Visiteur (démo) ».


## Nouveautés v6 (refonte visuelle et technique)

- **Direction artistique** : photo pleine page à l'accueil, « tableau d'affichage » des conditions (neige, pistes ouvertes, dernier damage) en bas du premier écran, tuiles de tailles différentes, événements en lignes à filets, motif « traces de damage » (deux filets parallèles). Thème clair/sombre automatique.
- **Polices libres (OFL), auto-hébergées** dans `src/assets/fonts/` : Bitter (titres) et DM Sans (texte), 62 Ko au total. Pour en changer : remplacer les `.woff` et ajuster `--serif` / `--sans` dans `site.css`.
- **Images** : chaque photo existe en `.jpg` (repli) et en `.webp` de plusieurs largeurs (`nom-480.webp`…). Si vous remplacez une photo, régénérez les `.webp` (ou supprimez-les : le site utilisera alors le `.jpg` seul). Le plan des pistes passe de 1,5 Mo à 180–880 Ko selon l'écran.
- **Réseau faible** : `/api/public` limité à 6 s puis dernière version connue (localStorage), service worker (`src/sw.js`) qui garde pages, styles, polices et dernières conditions en cache. Désactivé automatiquement sous Playwright (`navigator.webdriver`).
- **Application installable** : `manifest.webmanifest` + icônes (le dameur peut « ajouter à l'écran d'accueil »).
- **SEO** : titre d'accueil avec le nom du lieu, JSON-LD `SportsActivityLocation` (généré au build depuis `lib/seed.js`) et `Event` (généré côté navigateur depuis l'API), `og:image:alt`.
- **CSP stricte** : plus aucun `style=""` ni `'unsafe-inline'`. Le serveur local envoie la même CSP que Vercel (`vercel.json`), donc les tests la vérifient.
- **Cache Vercel** : CSS/JS versionnés (`?v=empreinte`) et polices en `immutable` 1 an ; images 1 jour.
- **Espace équipe** : bug « null » corrigé, boutons ≥ 52 px, thème sombre (travail de nuit), champs non autorisés masqués, remarques repliées, onglets accessibles (flèches), bandeau « pas de connexion », bouton Enregistrer toujours visible, liste des pistes avant les mesures.
- Le README ci-dessus mentionnant l'ancien hébergement du plan est obsolète : plan et PDF sont maintenant dans `src/assets`.
