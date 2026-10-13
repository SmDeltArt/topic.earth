const LABELS = {
  "topic.story.media": {"en":"Story media","fr":"Médias du document"},
  "topic.story.mediaSelect": {"en":"Edit / add","fr":"Modifier / ajouter"},
  "topic.story.mediaNew": {"en":"New media","fr":"Nouveau média"},
  "topic.story.mediaImport": {"en":"Import a file","fr":"Importer un fichier"},
  "topic.story.mediaKind": {"en":"Type","fr":"Type"},
  "topic.story.mediaParagraph": {"en":"After paragraph (0 = end)","fr":"Après le paragraphe (0 = fin)"},
  "topic.story.mediaWidth": {"en":"Width (%)","fr":"Largeur (%)"},
  "topic.story.mediaAlign": {"en":"Position","fr":"Position"},
  "topic.story.mediaCaption": {"en":"Caption / image description","fr":"Légende / description de l’image"},
  "topic.story.mediaPlayer": {"en":"Player","fr":"Lecteur"},
  "topic.story.mediaAutoplay": {"en":"Autoplay (muted)","fr":"Lecture auto (muette)"},
  "topic.story.mediaLoop": {"en":"Loop","fr":"Boucle"},
  "topic.story.mediaHint": {"en":"URL or imported assets/. Images, SVG, video and audio. Autoplay follows browser policy. Apply document style to keep these changes.","fr":"URL ou fichier assets/ importé. Images, SVG, vidéo et audio. Lecture automatique selon le navigateur. Appliquer le style du document pour conserver ces changements."},
  "topic.story.mediaUpdated": {"en":"Preview updated — apply to keep.","fr":"Aperçu actualisé — appliquer pour conserver."},
  "topic.story.readTranslate": {"en":"Read / Translate HTML","fr":"Lire / Traduire le HTML"},
  "topic.story.aiCreate": {
    "en": "AI Create",
    "fr": "Creation IA",
    "nl": "AI Create",
    "de": "KI erstellen"
  },
  "topic.story.aiCreateFailed": {
    "en": "AI Create failed",
    "fr": "Creation IA echouee",
    "nl": "AI Create failed",
    "de": "AI Create failed"
  },
  "topic.story.aiCreateNotReady": {
    "en": "Linked AI text is not ready. Open API Settings, save a text model, then try AI Create again.",
    "fr": "Le texte IA lie n'est pas pret. Ouvrez les reglages API, enregistrez un modele texte, puis relancez Creation IA.",
    "nl": "Linked AI text is not ready. Open API Settings, save a text model, then try AI Create again.",
    "de": "Verknüpfter KI-Text ist nicht bereit. Öffne die API-Einstellungen, speichere ein Textmodell und versuche dann AI Create erneut."
  },
  "topic.story.aiCreateNeedsDraft": {
    "en": "Add a title or summary first, then create the story card.",
    "fr": "Ajoutez d'abord un titre ou un resume, puis creez la carte narrative.",
    "nl": "Add a title or summary first, then create the story card.",
    "de": "Füge zuerst einen Titel oder eine Zusammenfassung hinzu und erstelle dann die Story-Karte."
  },
  "topic.story.aiCreateStatus": {
    "en": "Creating structured story JSON from linked AI...",
    "fr": "Creation du JSON structure depuis l'IA liee...",
    "nl": "Creating structured story JSON from linked AI...",
    "de": "Creating structured story JSON from linked AI..."
  },
  "topic.story.aiCreateWrites": {
    "en": "AI Create writes structured JSON first, then renders safe HTML/SVG from the template.",
    "fr": "Creation IA ecrit d'abord un JSON structure, puis rend un HTML/SVG sur depuis le template.",
    "nl": "AI Create writes structured JSON first, then renders safe HTML/SVG from the template.",
    "de": "AI Create schreibt zuerst strukturiertes JSON und rendert dann sicheres HTML/SVG aus der Vorlage."
  },
  "topic.story.attach": {
    "en": "Attach",
    "fr": "Attacher",
    "nl": "Attach",
    "de": "Attach"
  },
  "topic.story.bridgeJson": {
    "en": "Bridge JSON",
    "fr": "JSON pont",
    "nl": "Bridge JSON",
    "de": "Bridge JSON"
  },
  "topic.story.clear": {
    "en": "Clear",
    "fr": "Effacer",
    "nl": "Clear",
    "de": "Clear"
  },
  "topic.story.clearConfirm": {
    "en": "Clear the embedded HTML story from this draft?",
    "fr": "Effacer l'histoire HTML integree de ce brouillon ?",
    "nl": "Clear the embedded HTML story from this draft?",
    "de": "Clear the embedded HTML story from this draft?"
  },
  "topic.story.educationalScene": {
    "en": "Educational scene",
    "fr": "Scene educative",
    "nl": "Educational scene",
    "de": "Educational scene"
  },
  "topic.story.embeddedHtmlStory": {
    "en": "Embedded HTML Story",
    "fr": "Histoire HTML integree",
    "nl": "Embedded HTML Story",
    "de": "Embedded HTML Story"
  },
  "topic.story.embedLiveCard": {
    "en": "Embed a live card",
    "fr": "Integrer une carte vivante",
    "nl": "Embed a live card",
    "de": "Embed a live card"
  },
  "topic.story.externalWidget": {
    "en": "External widget",
    "fr": "Widget externe",
    "nl": "External widget",
    "de": "External widget"
  },
  "topic.story.interactiveCroquis": {
    "en": "Interactive croquis",
    "fr": "Croquis interactif",
    "nl": "Interactive croquis",
    "de": "Interactive croquis"
  },
  "topic.story.liveCardHelp": {
    "en": "Attach one sandboxed HTML/SVG story card to this topic. Scripts stay blocked in the first version.",
    "fr": "Attachez une carte narrative HTML/SVG sandboxee a ce sujet. Les scripts restent bloques dans la premiere version.",
    "nl": "Attach one sandboxed HTML/SVG story card to this topic. Scripts stay blocked in the first version.",
    "de": "Füge diesem Thema eine sandboxed HTML-/SVG-Story-Card hinzu. Skripte bleiben in der ersten Version blockiert."
  },
  "topic.story.microGame": {
    "en": "Micro-game",
    "fr": "Micro-jeu",
    "nl": "Micro-game",
    "de": "Micro-game"
  },
  "topic.story.pasteHelp": {
    "en": "Paste HTML/SVG, preview it in a sandbox, then save it with this topic.",
    "fr": "Collez du HTML/SVG, previsualisez-le dans une sandbox, puis sauvegardez-le avec ce sujet.",
    "nl": "Paste HTML/SVG, preview it in a sandbox, then save it with this topic.",
    "de": "HTML/SVG einfügen, in einer Sandbox in der Vorschau ansehen und dann mit diesem Thema speichern."
  },
  "topic.story.placeholder": {
    "en": "<section>Paste a safe HTML/SVG story card here...</section>",
    "fr": "<section>Collez ici une carte narrative HTML/SVG sure...</section>",
    "nl": "<section>Paste a safe HTML/SVG story card here...</section>",
    "de": "<section>Paste a safe HTML/SVG story card here...</section>"
  },
  "topic.story.preview": {
    "en": "Preview",
    "fr": "Previsualiser",
    "nl": "Preview",
    "de": "Vorschau"
  },
  "topic.story.sandboxPreview": {
    "en": "Sandbox preview",
    "fr": "Preview sandbox",
    "nl": "Sandbox preview",
    "de": "Sandbox-Vorschau"
  },
  "topic.story.scriptsBlocked": {
    "en": "scripts blocked",
    "fr": "scripts bloques",
    "nl": "scripts blocked",
    "de": "Skripte blockiert"
  },
  "topic.story.storyCard": {
    "en": "Story card",
    "fr": "Carte narrative",
    "nl": "Story card",
    "de": "Story-Karte"
  },
  "topic.story.storyCardOptional": {
    "en": "Story card",
    "fr": "Carte narrative",
    "nl": "Story card",
    "de": "Story card"
  },
  "topic.story.storyTitle": {
    "en": "Story title",
    "fr": "Titre de l'histoire",
    "nl": "Story title",
    "de": "Story title"
  },
  "topic.story.starterHtml": {
    "en": "Starter HTML",
    "fr": "HTML de depart",
    "nl": "Starter HTML",
    "de": "Starter HTML"
  },
  "topic.story.titlePlaceholder": {
    "en": "Short story card title",
    "fr": "Titre court de la carte narrative",
    "nl": "Short story card title",
    "de": "Short story card title"
  },
  "topic.story.type": {
    "en": "Type",
    "fr": "Type",
    "nl": "Type",
    "de": "Type"
  },
  "topic.story.waitingForHtml": {
    "en": "waiting for HTML",
    "fr": "en attente du HTML",
    "nl": "waiting for HTML",
    "de": "waiting for HTML"
  },
  "topic.story.fullView": {
    "en": "Full view",
    "fr": "Pleine page"
  },
  "topic.story.closeView": {
    "en": "Close presentation",
    "fr": "Fermer la présentation"
  },
  "topic.story.orientation": {
    "en": "AI direction: audience, HTML, CSS, SVG and JavaScript requests",
    "fr": "Orientation IA : public, demandes HTML, CSS, SVG et JavaScript"
  },
  "topic.story.orientationHint": {
    "en": "Review the request first. Generate only after checking the review. Existing layout and CSS are retained.",
    "fr": "Analysez d’abord la demande, puis créez après lecture du résultat. La mise en page et le CSS existants sont conservés."
  },
  "topic.story.toggleOrientation": {
    "en": "Show or hide AI direction",
    "fr": "Afficher ou masquer l’orientation IA"
  },
  "topic.story.reviewRequest": {
    "en": "1 · AI review",
    "fr": "1 · Analyse IA"
  },
  "topic.story.generateReviewed": {
    "en": "2 · Generate reviewed content",
    "fr": "2 · Créer le contenu analysé"
  },
  "topic.story.reviewNeeded": {
    "en": "Review this request with AI before generating.",
    "fr": "Analysez cette demande avec l’IA avant de créer."
  },
  "topic.story.reviewReady": {
    "en": "Review ready. Read it, then generate.",
    "fr": "Analyse prête. Lisez-la, puis créez."
  },
  "topic.story.reviewChanged": {
    "en": "The draft changed. Review the request again.",
    "fr": "Le brouillon a changé. Relancez l’analyse."
  },
  "topic.story.contentStyle": {
    "en": "Content layout and theme",
    "fr": "Mise en page et thème du contenu"
  },
  "topic.story.mobileHint": {
    "en": "Mobile reading: full view, readable text and compact margins. Content styling never changes the app.",
    "fr": "Lecture mobile : pleine page, texte lisible et marges réduites. Le style du contenu ne modifie jamais l’application."
  },
  "topic.story.fontSize": {
    "en": "Text size (px)",
    "fr": "Taille du texte (px)"
  },
  "topic.story.margin": {
    "en": "Margins (px)",
    "fr": "Marges (px)"
  },
  "topic.story.lineHeight": {
    "en": "Line spacing",
    "fr": "Interligne"
  },
  "topic.story.width": {
    "en": "Maximum width (px)",
    "fr": "Largeur maximale (px)"
  },
  "topic.story.appearance": {
    "en": "Page appearance",
    "fr": "Aspect de la page"
  },
  "topic.story.preserve": {
    "en": "Keep supplied theme",
    "fr": "Conserver le thème fourni"
  },
  "topic.story.light": {
    "en": "Light",
    "fr": "Clair"
  },
  "topic.story.dark": {
    "en": "Dark",
    "fr": "Sombre"
  },
  "topic.story.mobileOptimized": {
    "en": "Optimise mobile reading",
    "fr": "Optimiser la lecture mobile"
  },
  "topic.story.applyContentStyle": {
    "en": "Apply to HTML only",
    "fr": "Appliquer au HTML uniquement"
  },
  "topic.story.styleScope": {
    "en": "These controls edit the supplied HTML only. Original CSS is kept; overrides travel with saved topics and exports.",
    "fr": "Ces réglages modifient uniquement le HTML fourni. Le CSS original reste conservé ; les réglages suivent les sujets et leurs exports."
  },
  "topic.story.reviewing": {
    "en": "Reviewing…",
    "fr": "Analyse en cours…"
  },
  "topic.story.background": {
    "en": "Document background",
    "fr": "Fond du document"
  },
  "topic.story.panels": {
    "en": "Document panels",
    "fr": "Panneaux du document"
  },
  "topic.story.pickColour": {
    "en": "Colour / gradient",
    "fr": "Couleur / dégradé"
  },
  "topic.story.useColour": {
    "en": "Use this colour",
    "fr": "Utiliser cette couleur"
  },
  "topic.story.keepOriginal": {
    "en": "Keep original styling",
    "fr": "Conserver le style original"
  },
  "topic.story.cancel": {
    "en": "Cancel",
    "fr": "Annuler"
  },
"topic.story.textColour": {"en": "Text", "fr": "Texte"},
"topic.story.links": {"en": "Links", "fr": "Liens"},
"topic.story.desktopPreview": {"en": "Desktop preview", "fr": "Aperçu ordinateur"},
"topic.story.mobilePreview": {"en": "Mobile preview", "fr": "Aperçu mobile"},
"topic.story.clickToStyle": {"en": "Tap a part to style it", "fr": "Touchez une zone pour la modifier"},
"topic.story.presets": {"en": "Document presets", "fr": "Préréglages du document"},
"topic.story.savePreset": {"en": "Save this tab’s preset on this device", "fr": "Enregistrer le préréglage de cet onglet sur cet appareil"},
"topic.story.loadPreset": {"en": "Load this tab’s saved preset", "fr": "Charger le préréglage enregistré de cet onglet"},
"topic.story.presetSaved": {"en": "Saved", "fr": "Enregistré"},
"topic.story.presetLoaded": {"en": "Loaded", "fr": "Chargé"},
"topic.story.noPreset": {"en": "No saved preset", "fr": "Aucun préréglage enregistré"},
"topic.story.presetUnavailable": {"en": "Device storage unavailable", "fr": "Stockage local indisponible"},
"topic.story.indent": {"en": "Indent (em)", "fr": "Retrait (em)"},
"topic.story.numbering": {"en": "Headings", "fr": "Titres numérotés"},
"topic.story.lists": {"en": "Lists", "fr": "Listes"},
"topic.story.previewText": {"en": "Share skills and meet around local initiatives.", "fr": "Partager des savoirs et se rencontrer autour d’initiatives locales."},
"topic.story.previewAction": {"en": "Organise a local action", "fr": "Organiser une action locale"},
"topic.story.previewShare": {"en": "Share the results", "fr": "Partager les résultats"}
};
export function topicStoryLabel(key, language = "en") { return LABELS[key]?.[language.split("-")[0]] || LABELS[key]?.en || key; }
