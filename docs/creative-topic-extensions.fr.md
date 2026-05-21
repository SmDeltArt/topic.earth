# Extensions creatives de topic.earth

Cette note rassemble des pistes pour faire evoluer topic.earth: passer de l'observation des signaux de la Terre a l'explication, l'imagination et la proposition de futurs pratiques. L'objectif est d'ajouter une couche creative sans affaiblir le caractere evidence-first de l'app.

## Recommandation

Construire cela en quatre couches, dans cet ordre:

1. **Carte narrative de topic**: permettre a un brouillon de topic d'inclure une carte HTML/SVG generee ou collee, affichee dans une iframe sandboxee et exportee avec le ZIP du topic.
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

Ce n'est pas trop ambitieux si cela commence comme un seul style de carte narrative. Cela devient trop lourd si topic.earth essaie d'integrer tout l'editeur d'animation dans le dashboard principal.

## Placement UI

Pour le composeur de topic:

- Ajouter un onglet `Story` ou `Live Card` apres media/evidence.
- Boutons: `Paste HTML`, `AI Create`, `Preview`, `Add to ZIP`.
- Selecteur de style: `Croquis`, `Illustrated`, `Comic`, `Infographic`, `Presentation`, `Educational`.
- Pre-remplir le lieu depuis Settings et le contexte Regional.
- Garder la preview dans une iframe contrainte avec reset/clear.

Pour Regional:

- Ajouter `Jardinage regional` comme couche ou sous-couche.
- Reutiliser les outils de points/chemins pour corridors et plans de site.
- Laisser un topic stocker une geometrie de carte plus une carte narrative.
- Ajouter des suggestions meteo pour semer, planter, arroser, recolter et proteger.

Pour les exports:

- Inclure la carte narrative dans les packages admin review.
- Inclure un resume texte pour les outils qui ne rendent pas le HTML.

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

## Meilleur Premier Build

Implementer d'abord:

- Modele d'attachement `Topic Story`.
- Preview iframe sanitizee.
- Generateur IA structure.
- Renderer HTML avec 3 templates: croquis, brief illustre, comic strip.
- Un template educatif base sur les concepts timeline/export du SVG editor comme pont futur.
- Support export ZIP.

Ensuite ajouter `Visions regeneratives` et `Jardinage regional` quand le flux d'attachement est stable.
