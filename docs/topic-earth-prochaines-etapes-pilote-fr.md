# topic.earth — Prochaines étapes du projet pilote

Préparé le : 12 octobre 2026  
Source : *topic-earth-audit-commune-pilot.pdf*, 9 octobre 2026, notamment les pages 5 à 9.

> Ce document résume le PDF ; il ne constitue pas un nouvel audit technique. Les constats doivent être vérifiés à nouveau avant leur mise en œuvre. Les tâches ci-dessous sont proposées et restent à réaliser.

## Objectif

Préparer une plateforme claire et fiable pour les initiatives citoyennes dans une commune belge. Aider les habitants à découvrir des projets, à contribuer selon leurs possibilités, à se rencontrer et à documenter les résultats. Garder l’IA facultative et utiliser les vues climatiques mondiales comme contexte éducatif.

Anthisnes est la commune envisagée pour le projet pilote. L’audit n’a confirmé ni accord communal, ni organisateur, ni lieu, ni projet actif.

## 1. Fiabiliser l’application — jours 1 à 14

- [ ] Réparer les scripts, la feuille de style et les éléments d’identité visuelle d’API Settings qui renvoyaient des erreurs 500 ou 404.
- [ ] Aligner les routes API et la configuration des origines autorisées sur le mode de fonctionnement retenu ; réparer `/mcp` avant de promouvoir cette intégration.
- [ ] Résoudre l’échec du test de traduction/narration et vérifier le comportement attendu de Fever.
- [ ] Faire fonctionner la liste et la carte 2D du mode Régional sans WebGL ni IA.
- [ ] Vérifier le fonctionnement hors ligne souhaité ; le cache existant ne couvre qu’une partie de l’application.
- [ ] Tester Ollama en local sur l’ordinateur de Ben avec un modèle installé et `http://localhost:11434`. Désactiver les services d’IA externes de secours pour un traitement exclusivement local.
- [ ] Vérifier la couverture des enregistrements et maintenir la cohérence des manifestes de l’application et des fichiers audio.

**Critères de validation :** le mode Régional fonctionne, les indications de vérification sont fidèles à la réalité et le fonctionnement de l’IA locale a été testé sur l’ordinateur prévu.

## 2. Simplifier le mode Régional

Prévoir cinq rubriques faciles à comprendre :

| Rubrique | Objectif du visiteur |
|---|---|
| Vue d’ensemble de la commune | Trouver les initiatives proches, les rencontres et les besoins d’aide |
| Initiatives | Parcourir les projets par thème, dans une liste ou sur la carte |
| Je peux aider | Proposer du temps, des compétences, des outils, un terrain, du transport ou un lieu d’accueil |
| Apprendre et reproduire | Trouver des méthodes vérifiées et des ressources éducatives |
| Communauté et transparence | Comprendre les rôles des ambassadeurs, les décisions, les financements et les corrections |

Distinguer le **lieu**, le **thème de l’initiative** et les **rôles des participants**. La météo, le relief et les itinéraires cyclables sont des couches de contexte. World et Fever expliquent le contexte global ; Space reste facultatif pour le projet pilote.

## 3. Préparer le lancement communal — jours 15 à 30

- [ ] Confirmer la commune, un coordinateur et des contacts locaux prêts à participer.
- [ ] Organiser une première rencontre accessible aux habitants.
- [ ] Préparer une proposition de jardin partagé et de compostage, clairement identifiée comme telle.
- [ ] Préparer une proposition de partage d’outils et de réparation, clairement identifiée comme telle.
- [ ] Préparer une proposition de trajets partagés ou de covoiturage, clairement identifiée comme telle.
- [ ] Convenir des autorisations, de la propriété, de l’entretien, des coûts et d’un partage équitable des bénéfices.
- [ ] Permettre à chacun de choisir des contributions souples, selon son temps et ses capacités.
- [ ] Publier une courte charte et un véritable canal de dépôt des propositions.

Les projets solaires collectifs, les batteries, le stockage thermique et la géothermie doivent commencer par des démarches d’apprentissage ou des études de faisabilité avec des partenaires compétents.

**Critères de validation :** trois propositions, un coordinateur identifié, une rencontre et un canal de dépôt fonctionnel existent. Ne pas laisser entendre que la commune soutient le projet sans accord.

## 4. Créer une fiche claire pour chaque initiative

Indiquer la localité, le besoin, l’action proposée, l’organisateur, les contributions recherchées, l’accessibilité, les ressources, les coûts, les éléments de preuve, la date de révision et la prochaine étape.

Utiliser des statuts explicites : **idée → recherche d’aide → phase pilote → active**, avec les options **en pause**, **terminée** et **retirée**. Distinguer l’état d’avancement de l’activité du niveau de vérification des informations.

Circuit de publication :

**Brouillon local → dossier transmis → premier examen → vérification des informations et des consentements → proposition publiée → mises à jour → bilan des résultats.**

Commencer par le mécanisme existant d’export/import des dossiers et un destinataire désigné. Un brouillon enregistré dans le navigateur n’est pas automatiquement reçu par un ambassadeur ; ne jamais l’indiquer comme « transmis » tant que le transfert n’a pas réussi.

## 5. Établir la confiance et une gestion à but non lucratif

- [ ] Commencer avec un ambassadeur local, un suppléant et des personnes chargées d’une vérification indépendante.
- [ ] Définir les mandats, leur durée, la déclaration des conflits d’intérêts, l’abstention en cas de conflit et une procédure de recours ou de révocation.
- [ ] Séparer l’organisation des activités, la modération, l’administration technique et l’approbation des dépenses.
- [ ] Exiger un examen indépendant lorsqu’une personne présente son propre projet ou possède un intérêt financier.
- [ ] Publier les décisions pertinentes et des synthèses des financements, tout en protégeant les informations des participants.
- [ ] Veiller à ce que les dons ne permettent pas d’acheter une meilleure visibilité, des votes ou une mention « vérifié ».
- [ ] Confirmer la constitution juridique avant de présenter le statut d’ASBL comme acquis.
- [ ] Garder les comptes, les finances et les communications de topic.earth distincts de ceux de CAD-AI-Support SPRL et des activités personnelles SmDeltArt.

Ajouter une coordination régionale lorsque plusieurs communes sont actives. La représentation nationale, continentale et mondiale doit se développer à partir d’un réseau réel de participants.

## 6. Agir, mesurer et partager — jours 31 à 90

**Jours 31 à 60 :** réaliser une petite activité dans chacun des thèmes retenus. Documenter la participation, les ressources, le temps, les coûts, les résultats et les retours des participants. Corriger publiquement les erreurs.

**Jours 61 à 90 :** décider des activités à poursuivre et partager un dossier d’initiative réutilisable avec une ou deux communes voisines, à condition de disposer des capacités locales nécessaires.

Mesurer les activités réalisées, la participation régulière, les prêts et réparations d’outils, les productions du jardin et les possibilités de contribution accessibles. Présenter les bénéfices en matière de carbone ou d’eau uniquement avec une méthode et une situation de référence explicites.

## Nettoyer les contenus avant la promotion

Classer les contenus existants en **CONSERVER / VÉRIFIER / TRANSFORMER EN EXEMPLE / SUPPRIMER**. Préserver les dépendances nécessaires au fonctionnement, les ressources de secours, les informations de licence et les contenus éducatifs vérifiés. Identifier clairement les exemples hypothétiques.

Ne pas supprimer tout le fichier `data/points.js` : il contient aussi des données sur les seuils de bascule et un sujet documenté sur le glacier Thwaites. Vérifier les références et les manifestes avant de supprimer des ressources ; conserver un point de retour Git sans ajouter une nouvelle archive interne.

## Objectif de la première démonstration

Montrer un mode Régional fonctionnel, une proposition locale clairement identifiée, une possibilité de contribuer et le véritable circuit de transmission et de vérification. Relier les tutoriels de programmation, Inkscape et Blender à cet objectif concret. La participation doit rester possible sans connaissances en programmation ni IA.
