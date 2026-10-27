# Scénario « Vladivostok » — fiche animateur

Bad buzz : accusation de racisme à l'aéroport de Nantes. Reconstitué à partir du
support PowerPoint « plan B » (session de Fès, client Vinci Airports) et du dossier
d'assets d'origine. Contenus fictifs, réservés à l'exercice.

- **Modèle** : `supabase/seed_vladivostok.sql` (12 étapes, 107 min de jeu, 28 médias).
- **Format d'origine** : 4 équipes (Madrid, Lisbonne, Berlin, Londres), animation
  synchronisée — toutes les étapes sont réglées en « fin du temps : attente de l'animateur ».
  Pour laisser chaque équipe avancer à son rythme, passer les étapes en « auto » ou
  cocher « passage à la validation » dans l'éditeur de la variante.
- **Compter** ~2 h 15 avec le brief (10 min) et le débrief (30 min, hors plateforme).

## Mise en place (une fois)

1. **Médias** : dans Supabase → Storage → compartiment `media`, glisser le dossier
   `vladivostok/` fourni (28 fichiers, 53 Mo). Ne pas renommer les fichiers.
2. **Modèle** : coller `supabase/seed_vladivostok.sql` dans l'éditeur SQL et l'exécuter
   (rejouable sans doublon). Il crée aussi le client « Vinci Airports ».
3. **Variante** : depuis l'interface, créer la variante du modèle pour le client.
4. **Étape 6 (OSINT Change.org)** : renseigner dans la variante la réponse type
   (coordonnées professionnelles de référence) avant la session.
5. **Session** : créer les 4 équipes, projeter les codes et le QR code.

## Déroulé et relances

Les contenus « auto » apparaissent seuls (T+ indiqué) ; les contenus « manuel » sont des
relances que l'animateur diffuse depuis la console, à toutes les équipes ou à une seule.

| # | Étape | Durée | Contenus auto | Relances manuelles |
|---|---|---|---|---|
| 1 | Story de l'influenceur | 10 min | consigne, story vidéo + 2 écrans | mail de réclamation dans la boîte Vinci |
| 2 | Page Instagram @vinciairports | 10 min | commentaires, MP (T+1), tweets (T+3) | vidéos « flood » Instagram et X |
| 3 | Pétition Change.org | 10 min | pétition, post FB SOS Racisme (T+2), mail SOS Racisme (T+4) | post Instagram SOS Racisme |
| 4 | Article de presse | 7 min | article Business News, relais FB (T+1), mail Mediapart (T+2) | relais Instagram, **vidéo de la scène** |
| 5 | Décision urgente ! (DG) | 3 min | mail de l'assistante de direction | — |
| 6 | OSINT — contacter Change.org | 15 min | consigne | — |
| 7 | Service client | 15 min | mail du responsable service client | — |
| 8 | Communiqué de presse | 10 min | mail de la dircom | — |
| 9 | OSINT — vérifier un tweet | 7 min | tweet « bazar à Nantes » | **vidéo Snapchat (geste physique)** |
| 10 | Question du DG (Tunisie) | 5 min | mail du DG, mail du député (T+1 min 30) | forum actionnaires (ESG) |
| 11 | Mail des syndicats | 5 min | mail CGT Nantes Atlantique | — |
| 12 | Julien Courbet en direct | 10 min | message vocal | — |

Conseils de relance :
- **Étape 2** : diffuser les vidéos « flood » si les équipes envisagent de supprimer ou de
  fermer les commentaires.
- **Étape 4** : la vidéo de la scène donne corps à la sollicitation de Mediapart ; à
  diffuser vers la fin de l'étape pour tester la prudence.
- **Étape 9** : la vidéo Snapchat ne doit pas être jugée sur pièce ; la seconde question
  de l'étape (facultative) porte sur elle.
- **Étape 10** : le forum actionnaires élargit l'enjeu (ESG, cours de bourse) pour les
  équipes en avance.

## Chronologie fictive

| Date | Événement |
|---|---|
| jeu. 18/06, 19 h 42 | Réclamation de Youssef Jebali (voyages@ et communication@) |
| sam. 20/06 | Story de @yassinematue · pétition Change.org (14 h 32) · article Business News (16 h 12) · Mediapart (18 h 47) · SOS Racisme (20 h 58) |
| dim. 21/06 | Mail CGT (09 h 30) · forum Boursorama (12 h 27) |
| lun. 22/06 | Député Mehdi Sassi (10 h 40) · assistante de direction (11 h 05) · service client (11 h 20) · dircom (11 h 35) · DG en Tunisie (11 h 50) · Julien Courbet en direct |

## Personnages

- **Youssef Jebali** — voyageur, auteur de la réclamation.
- **@yassinematue** — influenceur franco-tunisien, cousin de Youssef (300 k abonnés).
- **Collectif Justice & Dignité** — lanceur de la pétition.
- **Caroline Vasseur** (assistante de direction), **Karim Belaïd** (service client),
  **Frédérique Barthelemy** (dircom), **Philippe Aubry** (DG) — Vinci Airports.
- **Camille Berthier** (Mediapart), **Mehdi Sassi** (député), **SOS Racisme**,
  **section CGT Nantes Atlantique**, **Julien Courbet** (RTL).

## Écarts avec le support d'origine

- Le DG s'appelle **Philippe Aubry** (mails créés pour le plan B). Le vocal d'origine
  `vocal_pdg_tunisie.mp3`, qui fait parler le président réel du groupe, n'a pas été repris
  pour rester cohérent ; il peut être ajouté à l'étape 10 dans une variante si besoin.
- Les doublons du dossier d'origine (captures Gmail de la réclamation, article Planète
  Business en HTML) ne sont pas utilisés : la story et la capture Business News portent le
  même contenu.
- Le mail de la dircom cite une adresse d'agence : la consigne de l'étape 8 précise
  qu'aucun envoi réel n'est effectué, le communiqué se rédige dans la plateforme.
- Les réponses du « doc challenge » deviennent des questions notées (sur 8, avec réponse
  type et barème visibles de l'animateur seul).
