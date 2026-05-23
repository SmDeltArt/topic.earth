# Extensions creatives de topic.earth

Cette note rassemble des pistes pour faire evoluer topic.earth: passer de l'observation des signaux de la Terre a l'explication, l'imagination et la proposition de futurs pratiques. L'objectif est d'ajouter une couche creative sans affaiblir le caractere evidence-first de l'app.

## Recommandation

Construire cela en quatre couches, dans cet ordre:

1. **Carte narrative / HTML heberge**: permettre a un brouillon de topic d'inclure une carte HTML/SVG generee, collee ou liee, affichee dans une iframe sandboxee et exportee avec le ZIP du topic.
2. **Couche Visions regeneratives**: ajouter un espace de proposition creative dans la structure des modes, centre sur des futurs durables plausibles lies a un topic, un lieu ou un jeu de preuves.
3. **Couche Jardinage regional**: ajouter une couche locale pratique pour jardins, resilience alimentaire, corridors de biodiversite, compost, recuperation d'eau, timing meteo et croquis annote.
4. **Profil Animateur educatif**: connecter un profil d'histoire pour enfants/adultes au format de timeline du Smart SVG Editor, sans transformer topic.earth en studio d'animation complet.

La bonne premiere etape reste petite et utile: une carte narrative attachee a un topic. Les couches plus imaginatives viennent ensuite, avec un cadre clair.

## Carte Narrative De Topic

Le meilleur premier mouvement est une piece jointe HTML/SVG au niveau du topic, pas un systeme complet de publication.

Les utilisateurs pourraient:

- Coller du HTML personnalise dans une iframe de preview sandboxee.
- Demander a l'IA liee de creer une carte depuis le topic courant.
- Choisir un style visuel: croquis, illustre, comic, note de terrain, infographie, panneau de presentation ou educatif.
- Utiliser les reglages regionaux de l'app comme contexte de localisation par defaut.
- Ajouter la carte au ZIP du topic comme `story/index.html`.
- Relier la carte aux preuves, images, URLs sources ou fichiers de presentation.
- Lier optionnellement une carte hebergee depuis `widgets.smdeltart.com` ou une autre origine de confiance si le contenu demande un outil plus riche.

La preview devrait utiliser une iframe sandboxee sans scripts par defaut. Pour les SVG animes, preferer le SVG/CSS inline a JavaScript. Un mode script futur devrait rester admin-only et clairement indique.

Structure d'export suggeree:

```text
topic-package.zip
  topic.json
  sources.json
  media/
  story/
    index.html
    assets/
  presentation/
```

## Generation IA

L'action IA devrait produire une sortie structuree d'abord, puis l'app rend le HTML depuis cette structure. C'est plus sur que de laisser le modele posseder tout le markup.

Forme de sortie recommandee:

```json
{
  "style": "croquis",
  "title": "Urban shade garden corridor",
  "summary": "A practical local planting plan for heat reduction and biodiversity.",
  "locationContext": {
    "source": "settings",
    "label": "Current Regional default",
    "precision": "region"
  },
  "sections": [
    {
      "label": "Context",
      "body": "Why this topic matters here."
    }
  ],
  "visuals": [
    {
      "type": "annotated-svg",
      "caption": "Garden corridor sketch",
      "svgPlan": {
        "layers": ["trees", "water", "paths", "pollinator beds"]
      }
    }
  ],
  "evidenceLinks": []
}
```

Le renderer cree ensuite une carte HTML coherente avec des templates approuves.

## Multivers HTML Heberge

Cela peut devenir ton multivers de topics, mais la premiere version devrait garder chaque univers comme une piece jointe bornee. Un topic peut heberger une carte narrative, une animation educative, un SVG interactif ou meme une petite experience de jeu, tant que le contenu reste emballe avec metadata, contexte de preuves et limites de sandbox.

Types d'attachements suggeres:

- `story-card`: HTML/SVG statique ou legerement anime.
- `educational-scene`: lecon guidee avec personnage, expression, TTS et court exercice.
- `interactive-croquis`: plan SVG annote avec notes cliquables.
- `micro-game`: petit jeu ou simulation connecte a un objectif de topic.
- `external-widget`: app hebergee de confiance ouverte via bridge.

Pour un jeu comme `TetrAIs-3d.html`, ne pas le traiter comme du HTML colle ordinaire. Il devrait utiliser un profil plus strict:

- Iframe sandboxee.
- Aucun acces aux cles API ni au vault.
- Aucune ecriture dans le stockage parent sauf bridge explicite.
- Dimensions fixes et fallback mobile.
- Objectif de topic clair: puzzle, equilibre energetique, plan d'adaptation ou compromis de ressources.
- Export comme `story/game/index.html` avec `story/game/manifest.json`.

Cela permet aux utilisateurs de poster du contenu ludique ou interactif sans affaiblir le flux evidence-first.

## Contrat De Bridge SVG / Widget

Le bridge doit etre du vrai JSON d'abord, puis rendu en HTML/SVG. Ainsi topic.earth, `widgets.smdeltart.com` et le SVG editor prive peuvent echanger une intention sans copier du markup brut non sur entre apps.

Forme recommandee:

```json
{
  "bridge": true,
  "bridgeVersion": "topic-story-1",
  "origin": "topic.earth",
  "target": "smart-svg-editor",
  "sourceTopicId": "topic-123",
  "style": "educational-scene",
  "preset": "kid-9-12",
  "locationContext": {
    "source": "settings",
    "label": "Regional default"
  },
  "scene": {
    "title": "Why a rain garden helps after storms",
    "objective": "Explain runoff and soil absorption",
    "character": {
      "type": "robot",
      "expression": "curious",
      "focus": "eye-contact",
      "movement": "point-and-wave"
    },
    "timeline": [
      {
        "time": 0,
        "action": "speak",
        "text": "Rain gardens slow water and help soil drink."
      }
    ],
    "svg": {
      "mode": "inline-svg",
      "expressions": ["curious", "happy", "thinking"],
      "rasterParts": [
        {
          "role": "face-texture",
          "source": "embedded-data-uri",
          "animatedBy": "svg-bone"
        }
      ]
    }
  },
  "limits": {
    "allowScripts": false,
    "maxDurationSeconds": 45,
    "maxTokens": 1200
  }
}
```

La generation par defaut devrait partir d'un preset simple, puis laisser les utilisateurs avances ouvrir la scene dans le SVG editor. Le SVG reste une base forte: il peut animer expressions, focus du curseur/des yeux, bones, labels et morceaux raster couches tout en restant inspectable. Si des parties raster IA sont necessaires, les integrer comme assets dans le dossier SVG/story et les animer avec des transforms SVG plutot que transformer toute la scene en video plate.

## Memoire De Traduction CSV

L'internationalisation devrait rester extensible par l'utilisateur. Une memoire de traduction CSV simple permettrait d'ameliorer les traductions UI et topic sans modifier le code.

Workflow recommande:

- Quand l'app detecte un label UI, texte de tutoriel, label de couche, champ de topic ou phrase de story-card manquant, elle peut ajouter une ligne en attente dans un CSV de traduction.
- Les utilisateurs peuvent exporter, modifier et reimporter le CSV.
- Le mode read/transcribe lie peut aider a remplir les lignes: lire le texte source, capturer la traduction par voix, puis sauvegarder comme brouillon.
- L'IA liee peut proposer des traductions, mais chaque ligne doit garder un champ `status` pour ne jamais ecraser les textes deja valides par l'utilisateur.
- La traduction devrait etre lancee sur trigger par defaut, pas en continu, pour eviter les surprises de cout ou de capture vocale.

Colonnes CSV suggerees:

```csv
key,scope,source_language,target_language,source_text,translated_text,status,origin,updated_at,notes
tutorial.settingsAi.title,ui,en,fr,AI Settings,Parametres IA,reviewed,user,2026-05-21,
topic.story.summary,topic,en,fr,Urban shade corridor,Corridor d'ombre urbain,draft,ai,2026-05-21,
```

Triggers utiles:

- `Collect missing strings`: scanner l'UI/topic courant et ajouter les lignes manquantes.
- `Translate selected`: traduire seulement le topic, la story card ou le panneau courant.
- `Read + transcribe`: parler une traduction et l'enregistrer dans la ligne CSV selectionnee.
- `Validate current language`: afficher les lignes non traduites ou obsoletes de la langue active.
- `Export language pack`: ajouter `i18n/<language>.csv` au ZIP du topic.

L'app doit garder une cle stable pour chaque texte UI. Les textes de topic/story peuvent utiliser des cles generees depuis l'id du topic et le chemin du champ. Cela rend la traduction portable entre packages ZIP, GitHub, Discord et futures cartes hebergees.

## Couche Visions Regeneratives

`Imagine` est comprehensible, mais peut sembler trop detache des preuves. Un meilleur nom pour cette app est:

- **Visions regeneratives**

Autres noms possibles:

- **Futurs communs**
- **Futurs vivants**
- **Idees d'adaptation**
- **Futurs durables**

Sens recommande: propositions utilisateurs pour un monde plus durable, toujours ancrees dans un topic reel, un lieu, une source ou une contrainte connue.

Regles de la couche:

- Doit etre reliee a au moins un topic, lieu, source ou contexte regional.
- Peut etre imaginee, mais doit separer hypotheses et faits connus.
- Devrait indiquer benefices attendus, risques, besoins d'entretien et acteurs possibles.
- Devrait etre locale d'abord quand c'est possible, puis reutilisable globalement comme motif.

Cela accueille l'imagination sans transformer le tableau de bord en fiction libre.

## Couche Jardinage Regional

Cette couche devrait d'abord vivre sous Regional. Elle colle tres bien a topic.earth: le jardinage relie adaptation climatique, alimentation, eau, biodiversite, sol et action collective.

Nom candidat:

- **Jardinage regional**

Types de topics possibles:

- Corridor pollinisateur
- Plantation d'ombre urbaine
- Jardin nourricier
- Jardin de pluie
- Boucle de compost
- Jardin d'ecole
- Restauration des sols
- Verger collectif
- Haie native
- Parcours de refroidissement urbain

Le style croquis/SVG annote est particulierement adapte. L'utilisateur peut esquisser un plan, puis l'IA le convertit en panneau annote propre, avec labels, symboles simples et recommandations liees a des sources.

La meteo doit faire partie de cette couche. L'app peut utiliser la localisation regionale choisie et la meteo live/previsionnelle pour suggerer des fenetres de semis, plantation, arrosage, paillage, recolte et protection contre gel/chaleur. Ces sorties doivent rester des indications, pas des certitudes agricoles.

Champs meteo utiles:

- Temperature recente et prevue.
- Pluie et jours secs.
- Risque de gel.
- Risque de canicule.
- Exposition au vent.
- Proxy d'humidite du sol si disponible.

Exemples:

- "Meilleure fenetre de plantation: du 18 mars au 2 avril si aucune alerte gel n'apparait."
- "Recolte probable: de fin juin a mi-juillet, a ajuster selon pluie et chaleur."
- "Reporter le repiquage pendant un pic de chaleur; arroser tot le matin."

Ainsi, le jardinage regional devient pratique, pas seulement illustratif.

## Profil Animateur Educatif

Il y a une vraie opportunite, mais elle doit etre cadree. Le fichier prive `smart-svg-editor.html` contient deja plusieurs briques que topic.earth ne devrait pas reconstruire: outils metadata SVG, wizard IA, presets d'animation, timeline, actions TTS, expressions et squelettes humains, robot, chien, chat, oiseau, poisson, etc.

Le meilleur mouvement est de creer un profil **Animateur educatif** pour les cartes narratives. Il genererait une scene d'apprentissage contrainte, ouvrable ou raffinable dans le SVG editor, puis reintegrable dans le ZIP/story card du topic.

Bons usages:

- Expliquer un topic climat a un enfant.
- Expliquer le meme topic a un adulte debutant.
- Construire un court exercice apres l'explication.
- Utiliser un guide simple, humain, robot ou animal, qui parle, pointe et reagit.
- Exporter un SVG anime transparent ou une carte HTML.
- Demarrer depuis un preset par defaut, puis bridger vers le SVG editor pour les expressions, mouvements ou timelines avancees.

Profils proposes:

- `kid-6-8`: mots simples, une idee par scene, guide rassurant, pas de cadrage anxiogene.
- `kid-9-12`: cause/effet, petit quiz, action locale.
- `teen`: pensee systemique, compromis, liens vers preuves.
- `adult-simple`: vulgarisation claire, pas de ton enfantin.
- `adult-deep`: explication sourcee avec sidebar technique optionnelle.

Garde-fous:

- L'utilisateur ou le parent choisit l'age.
- L'IA doit annoncer l'objectif pedagogique et le niveau de vocabulaire.
- Pas de persuasion ouverte dirigee vers les enfants.
- Les risques climatiques doivent etre honnetes mais non effrayants pour les plus jeunes.
- Exercices courts et faciles a relire.
- Limites fixes de tokens/cout, avec estimation avant generation.

Premier passage implemente:

- Topic Story stocke maintenant un profil `audience` et un drapeau `under16Only` avec le HTML genere.
- L'onglet Story expose des presets d'age (`6-8`, `9-12`, `Teen`, `Adult`) qui reutilisent les champs deja remplis et appellent le generateur IA securise.
- Les profils moins de 16 ans forcent le template educatif, la metadata de review adulte, un vocabulaire doux et pas de cadrage anxiogene ou manipulateur.
- Les cartes generees affichent le profil d'age, le niveau de vocabulaire et l'objectif pedagogique dans la preview HTML sandboxee.

Ce n'est pas trop ambitieux si cela commence comme un seul style de carte narrative. Cela devient trop lourd si topic.earth essaie d'integrer tout l'editeur d'animation dans le dashboard principal.

## Placement UI

Pour le composeur de topic:

- Ajouter un onglet `Story` ou `Live Card` apres media/evidence.
- Boutons: `Paste HTML`, `AI Create`, `Preview`, `Add to ZIP`.
- Selecteur de style: `Croquis`, `Illustrated`, `Comic`, `Infographic`, `Presentation`, `Educational`.
- Selecteur avance d'attachement: `Story`, `SVG Scene`, `Micro-game`, `External Widget`.
- Pre-remplir le lieu depuis Settings et le contexte Regional.
- Garder la preview dans une iframe contrainte avec reset/clear.
- Ajouter un outil de traduction avec `Collect missing strings`, `Translate selected`, `Read + transcribe` et `Export CSV`.

Pour Regional:

- Ajouter `Jardinage regional` comme couche ou sous-couche.
- Reutiliser les outils de points/chemins pour corridors et plans de site.
- Laisser un topic stocker une geometrie de carte plus une carte narrative.
- Ajouter des suggestions meteo pour semer, planter, arroser, recolter et proteger.

Pour les exports:

- Inclure la carte narrative dans les packages admin review.
- Inclure un resume texte pour les outils qui ne rendent pas le HTML.
- Inclure le bridge JSON et les manifests a cote du HTML genere pour que les futurs outils puissent reouvrir et modifier l'attachement.
- Inclure les fichiers optionnels `i18n/*.csv` quand l'utilisateur exporte des traductions avec un package topic.

## Securite Et Qualite

Le risque principal est de laisser le HTML genere devenir un probleme de securite ou de qualite. Garder ces limites:

- Preview en iframe sandboxee.
- Pas de JavaScript pour les story cards utilisateur dans la premiere version.
- Sanitizer le HTML colle.
- Stocker le contenu comme piece structuree de topic, pas seulement HTML brut.
- Garder les preuves separees des affirmations imaginatives.
- Marquer les visuels generes comme brouillons jusqu'a review.
- Pour le contenu enfant, exiger age, objectif pedagogique et etat de review adulte.
- Pour meteo/jardinage, indiquer l'incertitude et eviter les promesses agricoles professionnelles.
- Pour les jeux et widgets, les separer des API settings, du vault, du storage sync et de l'etat admin sauf permission de bridge explicite et revue.
- Pour la traduction, ne jamais ecraser automatiquement les lignes validees par l'utilisateur; les propositions IA et voix doivent rester en brouillon jusqu'a acceptation.

## Meilleur Premier Build

Implementer d'abord:

- Modele d'attachement `Topic Story`.
- Preview iframe sanitizee.
- Generateur IA structure.
- Renderer HTML avec 3 templates: croquis, brief illustre, comic strip.
- Un template educatif base sur les concepts timeline/export du SVG editor avec contrat JSON de bridge.
- Un profil `micro-game` avec iframe stricte et manifest dedie.
- Memoire de traduction CSV pour textes UI/topic/story, avec brouillons assistes par read/transcribe.
- Support export ZIP.

Ensuite ajouter `Visions regeneratives` et `Jardinage regional` quand le flux d'attachement est stable.
