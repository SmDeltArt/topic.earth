/**
 * CSV-backed UI translation catalog.
 *
 * The editable source of truth is shared/topic-earth-ui.csv. This module keeps
 * a small fallback catalog so the app still renders if the CSV cannot be
 * fetched, then LanguageManager loads the full CSV before the UI initializes.
 */
export const SUPPORTED_UI_LANGUAGES = [
  { code: 'en', name: 'English', nativeName: 'English', speechCode: 'en-US', textDirection: 'ltr' },
  { code: 'fr', name: 'French', nativeName: 'Français', speechCode: 'fr-FR', textDirection: 'ltr' },
  { code: 'nl', name: 'Dutch', nativeName: 'Nederlands', speechCode: 'nl-NL', textDirection: 'ltr' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', speechCode: 'de-DE', textDirection: 'ltr' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', speechCode: 'es-ES', textDirection: 'ltr' },
  { code: 'el', name: 'Greek', nativeName: 'Ελληνικά', speechCode: 'el-GR', textDirection: 'ltr' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский', speechCode: 'ru-RU', textDirection: 'ltr' },
  { code: 'hi', name: 'Hindi / India', nativeName: 'हिन्दी', speechCode: 'hi-IN', textDirection: 'ltr' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', speechCode: 'ar-SA', textDirection: 'rtl' },
  { code: 'zh', name: 'Chinese', nativeName: '中文', speechCode: 'zh-CN', textDirection: 'ltr' }
];

export const TRANSLATION_COLUMNS = ['en', 'fr', 'nl', 'de', 'es', 'ar', 'zh', 'el', 'hi', 'ja', 'ru', 'uk'];
export const UI_TRANSLATIONS = {};
export const UI_TEXT_TRANSLATIONS = {
  exact: {},
  patterns: {}
};

const FALLBACK_UI_TRANSLATION_CSV = `key,en,fr,nl,de,es,ar,zh,el,hi,ja,ru,uk
common.settings,Settings,Paramètres,,,,,,,,,
common.close,Close,Fermer,,,,,,,,,
common.save,Save,Enregistrer,,,,,,,,,
common.saveSettings,Save Settings,Enregistrer les paramètres,,,,,,,,,
common.resetToDefaults,Reset to Defaults,Réinitialiser,,,,,,,,,
common.cancel,Cancel,Annuler,,,,,,,,,
common.readAloud,Read,Lire,,,,,,,,,
common.stop,Stop,Stop,,,,,,,,,
settings.language,Language,Langue,,,,,,,,,
settings.uiLanguage,UI Language,Langue de l'interface,,,,,,,,,
settings.languagePickerHint,Choose a language here. The active choice is saved immediately and filters browser voices below.,Choisissez une langue ici. Le choix actif est enregistre immediatement et filtre les voix navigateur ci-dessous.,,,,,,,,,
settings.tutorialTips,Interactive tutorial tips,Conseils interactifs,,,,,,,,,
settings.tutorialTipsHint,Show short usage hints across the interface. Turn off for a cleaner UI.,Affiche de courts conseils dans l'interface. Desactivez-les pour une interface plus calme.,,,,,,,,,
settings.tutorialLevel,Tutorial level,Niveau du tutoriel,,,,,,,,,
settings.tutorialLevelEssential,Essential,Essentiel,,,,,,,,,
settings.tutorialLevelGuided,Guided,Guide,,,,,,,,,
settings.tutorialLevelExpert,Expert / admin,Expert / admin,,,,,,,,,
settings.tutorialLevelHint,Essential shows first-visit help. Guided adds task tips. Expert adds admin cues.,Essentiel affiche l'aide de premiere visite. Guide ajoute les actions. Expert ajoute les reperes admin.,,,,,,,,,
settings.aboutBuild,About this build,A propos de cette version,,,,,,,,,
settings.developmentAssistant,Development assistant,Assistant de developpement,,,,,,,,,
settings.textToSpeech,Text-to-Speech,Lecture vocale,,,,,,,,,
settings.enableTts,Enable text-to-speech,Activer la lecture vocale,,,,,,,,,
settings.browserVoice,Browser Voice,Voix du navigateur,,,,,,,,,
settings.voiceAuto,Auto (best match for language),Auto (meilleure voix pour la langue),,,,,,,,,
settings.voiceFiltered,{count} browser voice(s) match {language}.,{count} voix navigateur correspondent à {language}.,,,,,,,,,
settings.voiceFallback,No browser voice is installed for {language}; Auto will still ask the browser to read in that language.,Aucune voix navigateur n'est installee pour {language}; Auto demandera quand meme au navigateur de lire dans cette langue.,,,,,,,,,
settings.speechRate,Speech Rate,Vitesse,,,,,,,,,
settings.speechPitch,Speech Pitch,Tonalité,,,,,,,,,
settings.showTranscriptReading,Show transcript when reading,Afficher le transcript pendant la lecture,,,,,,,,,
settings.resetConfirm,Reset all settings to defaults?,Réinitialiser tous les paramètres ?,,,,,,,,,
topic.dataLayers,Data Layers,Couches de données,,,,,,,,,
topic.search,Search,Recherche,,,,,,,,,
app.brand,topic.earth,topic.earth,,,,,,,,,
nav.rotate,Rotate,Rotation,,,,,,,,,
nav.drag,Drag,Deplacer,,,,,,,,,
nav.moveTopic,Move topic,Deplacer sujet,,,,,,,,,
detail.collapseShort,Short view,Vue courte,,,,,,,,,
detail.expandFull,Full view,Vue complete,,,,,,,,,
detail.expandTop,Top view,Vue haute,,,,,,,,,
detail.restoreMiddle,Middle view,Vue moyenne,,,,,,,,,
detail.previousTopic,Previous topic,Sujet précédent,,,,,,,,,
detail.nextTopic,Next topic,Sujet suivant,,,,,,,,,
detail.noPreviousTopic,No previous topic,Aucun sujet précédent,,,,,,,,,
detail.noNextTopic,No next topic,Aucun sujet suivant,,,,,,,,,
fever.climateDataForScenario,Climate data for {year} - {scenario} scenario,Donnees climatiques pour {year} - scenario {scenario},,,,,,,,,
regional.toolDrag,Drag map,Deplacer carte,,,,,,,,,
regional.toolMoveTopic,Move topic,Deplacer sujet,,,,,,,,,
regional.toolAddPoint,Add point,Ajouter un point,,,,,,,,,
regional.toolTracePath,Trace path,Tracer chemin,,,,,,,,,
regional.toolFinishPath,Finish path,Terminer chemin,,,,,,,,,
regional.toolAttachPath,Attach path to topic,Associer le chemin au sujet,,,,,,,,,
regional.toolClearPath,Clear,Effacer,,,,,,,,,
regional.dragStatus,Drag the map to explore.,Deplacez la carte pour explorer.,,,,,,,,,
regional.moveTopicStatus,Click the map to move the selected topic. Right-click or long tap works too.,Cliquez la carte pour deplacer le sujet selectionne. Clic droit ou appui long fonctionne aussi.,,,,,,,,,
regional.moveTopicNoTopic,Open a regional topic first, then choose where to move it.,Ouvrez d'abord un sujet regional, puis choisissez ou le deplacer.,,,,,,,,,
regional.moveTopicBlocked,This topic cannot be moved in the current access mode.,Ce sujet ne peut pas etre deplace dans le mode d'acces actuel.,,,,,,,,,
regional.topicMoved,"Topic moved to {lat}, {lon}.","Sujet deplace a {lat}, {lon}.",,,,,,,,,
regional.pointStatus,Tap the map to add a point.,Touchez la carte pour ajouter un point.,,,,,,,,,
regional.pathStarted,Tap the map to trace a path.,Touchez la carte pour tracer un chemin.,,,,,,,,,
regional.pathPointAdded,{count} path point(s).,{count} point(s) de chemin.,,,,,,,,,
regional.pathPointLabel,Path point,Point de chemin,,,,,,,,,
regional.pathPointMoved,Path point {index} moved.,Point de chemin {index} deplace.,,,,,,,,,
regional.pathPointDeleted,{count} path point(s) left.,{count} point(s) de chemin restant(s).,,,,,,,,,
regional.pathFinished,Path highlighted with {count} points.,Chemin surligne avec {count} points.,,,,,,,,,
regional.pathSaved,Path saved to this topic with {count} points.,Chemin enregistre dans ce sujet avec {count} points.,,,,,,,,,
regional.pathwayRecord,Pathway record,Trace enregistree,,,,,,,,,
regional.pathBrowserRecordReady,Finishing saves this path in the selected topic browser record.,Terminer enregistre ce chemin dans le sujet selectionne.,,,,,,,,,
regional.pathBrowserRecordNeedsTopic,Open a topic first to save the path in browser storage.,Ouvrez d'abord un sujet pour enregistrer le chemin.,,,,,,,,,
regional.pathNeedTwo,Add at least 2 points for a path.,Ajoutez au moins 2 points pour un chemin.,,,,,,,,,
regional.pathCleared,Path cleared.,Chemin efface.,,,,,,,,,
regional.pointReady,"Point ready at {lat}, {lon}.","Point pret a {lat}, {lon}.",,,,,,,,,
regional.newPoint,New map point,Nouveau point carte,,,,,,,,,
regional.proposeHere,Propose here,Proposer ici,,,,,,,,,
regional.toolsLabel,Regional map tools,Outils carte regionale,,,,,,,,,
regional.collapseTools,Collapse map tools,Replier les outils carte,,,,,,,,,
regional.expandTools,Expand map tools,Afficher les outils carte,,,,,,,,,
regional.dragPanel,Drag panel,Deplacer le panneau,,,,,,,,,
regional.toolRoute,Route,Itineraire,,,,,,,,,
regional.toolUndo,Undo,Annuler,,,,,,,,,
regional.toolRedo,Redo,Retablir,,,,,,,,,
regional.toolAttachRoute,Attach route to topic,Associer l'itineraire au sujet,,,,,,,,,
regional.toolEditRoutePath,Edit as path,Modifier en chemin,,,,,,,,,
regional.toolClearRoute,Clear route,Effacer l'itineraire,,,,,,,,,
regional.pointCleared,Point cleared.,Point efface.,,,,,,,,,
regional.dragPointHint,Drag this point to move it. Right-click or use Remove to delete it.,Deplacez ce point en le glissant. Clic droit ou Supprimer pour l'effacer.,,,,,,,,,
regional.removePoint,Remove point,Supprimer le point,,,,,,,,,
regional.pathPointRemoved,{count} path point(s) left.,{count} point(s) de chemin restant(s).,,,,,,,,,
regional.actionUndone,Action undone.,Action annulee.,,,,,,,,,
regional.noUndo,Nothing to undo.,Rien a annuler.,,,,,,,,,
regional.noRedo,Nothing to redo.,Rien a retablir.,,,,,,,,,
regional.routeOptions,Route options,Options d'itineraire,,,,,,,,,
regional.routeProfile,Mode,Mode,,,,,,,,,
regional.routeBike,Bike,Velo,,,,,,,,,
regional.routeWalk,Walk,Marche,,,,,,,,,
regional.routeRoad,Road,Route,,,,,,,,,
regional.routePreference,Choice,Choix,,,,,,,,,
regional.routeShortest,Shorter,Plus court,,,,,,,,,
regional.routeFastest,Faster,Plus rapide,,,,,,,,,
regional.routeDestinationLabel,Destination,Destination,,,,,,,,,
regional.routeDestinationPlaceholder,"Topic, address, city, or coordinates","Sujet, adresse, ville ou coordonnees",,,,,,,,,
regional.routeDestinationButton,Route,Itineraire,,,,,,,,,
regional.routePickDestinationButton,Click end,Cliquer arrivee,,,,,,,,,
regional.routeNeedStart,Open a regional topic or click a route start point first.,Ouvrez un sujet regional ou cliquez d'abord un point de depart.,,,,,,,,,
regional.routeDestinationEmpty,Type a destination or click the end point on the map.,Saisissez une destination ou cliquez le point d'arrivee sur la carte.,,,,,,,,,
regional.routeDestinationSearching,Finding destination...,Recherche de la destination...,,,,,,,,,
regional.routeDestinationNotFound,"No destination match found. Try a topic, address, or coordinates.","Aucune destination trouvee. Essayez un sujet, une adresse ou des coordonnees.",,,,,,,,,
regional.routeDestinationSame,Destination is too close to the route start.,La destination est trop proche du depart.,,,,,,,,,
regional.routeDestinationReady,Route destination set: {label}.,Destination de l'itineraire definie : {label}.,,,,,,,,,
regional.routePickDestinationStatus,Click the destination point for this route.,Cliquez le point d'arrivee de cet itineraire.,,,,,,,,,
regional.routeHint,"Choose route, click a start point, then a destination, or type the destination here.","Choisissez Itineraire, cliquez le depart puis la destination, ou saisissez la destination ici.",,,,,,,,,
regional.routePickStart,Click the start point for the route.,Cliquez le point de depart de l'itineraire.,,,,,,,,,
regional.routePickEnd,Click the destination point for the route.,Cliquez la destination de l'itineraire.,,,,,,,,,
regional.routeStart,Start,Depart,,,,,,,,,
regional.routeEnd,Destination,Destination,,,,,,,,,
regional.routePointMoved,{label} moved; recalculating route.,{label} deplace; recalcul de l'itineraire.,,,,,,,,,
regional.routePointDeleted,Route point removed.,Point d'itineraire supprime.,,,,,,,,,
regional.routeEditPathNoRoute,Create a route first, then edit it as a path.,Creez d'abord un itineraire, puis modifiez-le comme chemin.,,,,,,,,,
regional.routeEditedAsPath,{count} route points are now editable path points.,{count} points d'itineraire sont maintenant des points de chemin modifiables.,,,,,,,,,
regional.routeFetching,Finding a route on OpenStreetMap...,Recherche d'un itineraire OpenStreetMap...,,,,,,,,,
regional.routeReady,"Route ready: {distance} km, about {duration} min by {mode}.","Itineraire pret : {distance} km, environ {duration} min en {mode}.",,,,,,,,,
regional.routeSaved,Route saved to this topic.,Itineraire enregistre dans ce sujet.,,,,,,,,,
regional.routeFallback,Routing service unavailable; direct guide line shown.,Service d'itineraire indisponible; ligne directe affichee.,,,,,,,,,
regional.routeCleared,Route cleared.,Itineraire efface.,,,,,,,,,
regional.mobilityCheckStatus,Mobility check: {items},Verification mobilite : {items},,,,,,,,,
regional.mobilityNearestCharging,nearest charging {name} ({distance}),borne la plus proche {name} ({distance}),,,,,,,,,
regional.mobilityNearestBike,nearest bike way {name} ({distance}),voie velo la plus proche {name} ({distance}),,,,,,,,,
regional.mobilityRecordedTrip,recorded bike trip {name} ({distance}),trajet velo enregistre {name} ({distance}),,,,,,,,,
regional.meteoTopic,Topic,Sujet,,,,,,,,,
regional.meteoTopicTitle,Create a browser-local topic draft from this live meteo signal,Creer un brouillon local navigateur depuis ce signal meteo live,,,,,,,,,
regional.meteoHide,Hide,Masquer,,,,,,,,,
regional.meteoHideTitle,Hide meteo surface summary,Masquer le resume de surface meteo,,,,,,,,,
regional.meteoClouds,Clouds,Nuages,,,,,,,,,
regional.meteoCloudsTitle,Toggle regional cloud and rain surface,Basculer la surface regionale nuages et pluie,,,,,,,,,
regional.meteoWarnings,Warnings,Alertes,,,,,,,,,
regional.meteoWarningsTitle,Toggle regional warning circles,Basculer les cercles d'alerte regionaux,,,,,,,,,
regional.meteoCloudsOn,Meteo cloud surface shown,Surface meteo nuages affichee,,,,,,,,,
regional.meteoCloudsOff,Meteo cloud surface hidden,Surface meteo nuages masquee,,,,,,,,,
regional.meteoWarningsOn,Meteo warning circles shown,Cercles d'alerte meteo affiches,,,,,,,,,
regional.meteoWarningsOff,Meteo warning circles hidden,Cercles d'alerte meteo masques,,,,,,,,,
regional.meteoSurfaceBoth,clouds + warnings,nuages + alertes,,,,,,,,,
regional.meteoSurfaceCloudsOnly,clouds only,nuages seuls,,,,,,,,,
regional.meteoSurfaceWarningsOnly,warnings only,alertes seules,,,,,,,,,
regional.meteoSurfaceHidden,surface hidden,surface masquee,,,,,,,,,
tutorial.regionalMeteo.title,Live Meteo,Meteo live,,,,,,,,,
tutorial.regionalMeteo.body,"Use Topic to seed a browser-local draft from the warning, then add official links before validation.","Utilisez Sujet pour creer un brouillon local depuis l'alerte, puis ajoutez des liens officiels avant validation.",,,,,,,,,
tutorial.kicker,Guide,Guide,,,,,,,,,
tutorial.next,Got it,Compris,,,,,,,,,
tutorial.skip,Skip,Passer,,,,,,,,,
tutorial.turnOff,Turn off,Desactiver,,,,,,,,,
tutorial.globe.title,Explore Earth,Explorer Earth,,,,,,,,,
tutorial.globe.body,Spin the globe or choose a mode. Glowing points open topic cards.,Tournez le globe ou choisissez un mode. Les points lumineux ouvrent les sujets.,,,,,,,,,
tutorial.modes.title,Choose A View,Choisir une vue,,,,,,,,,
tutorial.modes.body,"Switch between Regional map, World globe, Space, and Fever views.","Passez entre carte regionale, globe monde, espace et fievre.",,,,,,,,,
tutorial.topic.title,Topic Card,Carte sujet,,,,,,,,,
tutorial.topic.body,This card is the active topic. Summary comes first; sources and media stay below.,Cette carte est le sujet actif. Resume d'abord; sources et medias dessous.,,,,,,,,,
tutorial.evidence.title,Evidence,Preuves,,,,,,,,,
tutorial.evidence.body,"Sources, images, videos, and notes stay attached to this topic.","Sources, images, videos et notes restent attaches a ce sujet.",,,,,,,,,
tutorial.composer.title,One Input,Une entree,,,,,,,,,
tutorial.composer.body,"Paste a note, source URL, image link, or local idea. Use in draft fills the card below.","Collez une note, un lien source, une image ou une idee locale. Utiliser dans le brouillon remplit la carte.",,,,,,,,,
tutorial.composerEvidence.title,Evidence Lane,Ligne de preuves,,,,,,,,,
tutorial.composerEvidence.body,"Links and media stay with this draft, so the topic keeps its proof when saved.","Les liens et medias restent avec ce brouillon, ainsi le sujet garde ses preuves a l'enregistrement.",,,,,,,,,
tutorial.evidenceEditor.title,Add Proof,Ajouter preuve,,,,,,,,,
tutorial.evidenceEditor.body,"Add one source name or URL. It can be checked later before publication.","Ajoutez un nom de source ou une URL. Cela pourra etre verifie plus tard avant publication.",,,,,,,,,
tutorial.mediaActions.title,Media,Medias,,,,,,,,,
tutorial.mediaActions.body,"Upload an image file or paste a direct image URL. Regular pages are kept as evidence links.","Ajoutez une image locale ou collez une URL directe d'image. Les pages normales restent des liens de preuve.",,,,,,,,,
tutorial.mediaUrl.title,Image URL,URL image,,,,,,,,,
tutorial.mediaUrl.body,"Paste a direct image URL here. If it is a page, it will be stored as evidence instead.","Collez ici une URL directe d'image. Si c'est une page, elle sera stockee comme preuve.",,,,,,,,,
tutorial.reviewSave.title,Review Save,Verifier sauver,,,,,,,,,
tutorial.reviewSave.body,"Check title, place, summary, and proof. Saving keeps the draft on this device.","Verifiez titre, lieu, resume et preuves. L'enregistrement garde le brouillon sur cet appareil.",,,,,,,,,
tutorial.regional.title,Regional Map,Carte regionale,,,,,,,,,
tutorial.regional.body,"Open Regional search to focus by auto-position, topic, place, address, city, or coordinates. Paths and routes stay editable.","Ouvrez la recherche regionale pour viser par position auto, sujet, lieu, adresse, ville ou coordonnees. Chemins et itineraires restent modifiables.",,,,,,,,,
tutorial.regionalPath.title,Trace Path,Tracer chemin,,,,,,,,,
tutorial.regionalPath.body,"Click to add points, then drag numbered handles to move them or remove a point from its popup. A path is a draft until attached to a topic.","Cliquez pour ajouter des points, puis glissez les numeros pour les deplacer ou supprimez un point depuis sa popup. Un chemin reste brouillon jusqu'a son association a un sujet.",,,,,,,,,
tutorial.regionalPathFinish.title,Attach Path,Associer chemin,,,,,,,,,
tutorial.regionalPathFinish.body,"Add at least two points. With a topic selected, Attach path saves it to that topic; without one it only stays on the map.","Ajoutez au moins deux points. Avec un sujet selectionne, Associer le chemin l'enregistre dans ce sujet; sans sujet, il reste seulement sur la carte.",,,,,,,,,
tutorial.regionalRoute.title,Route Mode,Mode itineraire,,,,,,,,,
tutorial.regionalRoute.body,"Click a start, then click or type a destination: topic, address, city, or coordinates. OpenStreetMap tries bike, walk, or road routing.","Cliquez un depart, puis cliquez ou saisissez une destination : sujet, adresse, ville ou coordonnees. OpenStreetMap essaie velo, marche ou route.",,,,,,,,,
tutorial.regionalRouteOptions.title,Route Options,Options itineraire,,,,,,,,,
tutorial.regionalRouteOptions.body,"Pick bike, walk, or road plus shorter or faster. Use Edit as path when an approximate route needs manual correction.","Choisissez velo, marche ou route, puis plus court ou plus rapide. Utilisez Modifier en chemin si un itineraire approximatif doit etre corrige.",,,,,,,,,
tutorial.regionalRouteDestination.title,Choose Destination,Choisir destination,,,,,,,,,
tutorial.regionalRouteDestination.body,"Click the end point or type a destination. Attach route saves to the selected topic; otherwise it stays a map draft.","Cliquez le point d'arrivee ou saisissez une destination. Associer l'itineraire l'enregistre dans le sujet selectionne; sinon il reste brouillon sur la carte.",,,,,,,,,
tutorial.regionalSearch.title,Find A Place,Trouver un lieu,,,,,,,,,
tutorial.regionalSearch.body,"Search accepts topic names, places, addresses, cities, or coordinates. Auto-locate respects Regional precision and only moves the map focus.","La recherche accepte sujets, lieux, adresses, villes ou coordonnees. La position auto respecte la precision regionale et deplace seulement le focus carte.",,,,,,,,,
tutorial.settings.title,Control Tips,Regler les conseils,,,,,,,,,
tutorial.settings.body,Use this switch to keep the app calm after the guide has helped.,Utilisez cet interrupteur pour calmer l'interface apres le guide.,,,,,,,,,
tutorial.settingsAccess.title,Access Mode,Mode d'acces,,,,,,,,,
tutorial.settingsAccess.body,User mode protects published data. Admin unlocks local editing and export tools only when deliberately enabled.,Le mode utilisateur protege les donnees publiees. Admin ouvre l'edition locale et l'export seulement quand il est active volontairement.,,,,,,,,,
tutorial.settingsLanguage.title,Language,Langue,,,,,,,,,
tutorial.settingsLanguage.body,"Language changes the interface and helps pick the matching browser voice.","La langue change l'interface et aide a choisir la voix navigateur correspondante.",,,,,,,,,
tutorial.settingsGuideLevel.title,Guide Level,Niveau guide,,,,,,,,,
tutorial.settingsGuideLevel.body,"Essential stays very light. Guided adds task help. Expert adds admin cues.","Essentiel reste tres leger. Guide ajoute l'aide d'action. Expert ajoute les reperes admin.",,,,,,,,,
tutorial.settingsTts.title,Voice Help,Aide vocale,,,,,,,,,
tutorial.settingsTts.body,"Text to speech powers Read in tutorial bubbles and topic listening. Browser voices are filtered by the chosen language.","La synthese vocale alimente Lire dans les bulles tutoriel et l'ecoute des sujets. Les voix navigateur sont filtrees par la langue choisie.",,,,,,,,,
tutorial.settingsCountry.title,Country Labels,Libelles pays,,,,,,,,,
tutorial.settingsCountry.body,"Country hover labels help orientation on the globe. Turn them off if you want a cleaner map.","Les libelles pays au survol aident a se reperer sur le globe. Desactivez-les pour une carte plus calme.",,,,,,,,,
tutorial.settingsTexture.title,Texture Quality,Qualite texture,,,,,,,,,
tutorial.settingsTexture.body,"Auto starts light and can upgrade globe texture on stronger WebGL2 desktops after reload.","Auto demarre leger et peut monter la texture du globe sur les bureaux WebGL2 apres recharge.",,,,,,,,,
tutorial.settingsFeverLoop.title,Fever Loop,Boucle Fievre,,,,,,,,,
tutorial.settingsFeverLoop.body,"Auto keeps Fever light on mobiles and can use sharper loops on stronger desktops.","Auto garde Fievre legere sur mobile et peut utiliser des boucles plus nettes sur les bureaux puissants.",,,,,,,,,
tutorial.settingsAi.title,AI Settings,Reglages IA,,,,,,,,,
tutorial.settingsAi.body,"Linked provider and model power AI tools. Public users can leave this off.","Le fournisseur et le modele lies alimentent les outils IA. Les utilisateurs publics peuvent laisser coupe.",,,,,,,,,
tutorial.settingsRegional.title,Regional Focus,Focus regional,,,,,,,,,
tutorial.settingsRegional.body,"Auto locate only focuses Regional. Precision sets the target scale and is clamped to available IP, browser, search, or map-click accuracy.","La position auto vise seulement Regional. La precision fixe l'echelle cible et se limite a la precision disponible par IP, navigateur, recherche ou clic carte.",,,,,,,,,
tutorial.settingsBuild.title,Build Info,Infos version,,,,,,,,,
tutorial.settingsBuild.body,"This shows the development assistant and build context. Runtime provider and model choices stay under AI settings.","Affiche l'assistant de developpement et le contexte de version. Les fournisseurs et modeles actifs restent dans les reglages IA.",,,,,,,,,
tutorial.read,Read,Lire,,,,,,,,,
tutorial.stopRead,Stop,Stop,,,,,,,,,
tutorial.admin.title,Admin View,Vue admin,,,,,,,,,
tutorial.admin.body,"Admin mode unlocks editing, source review, media checks, and export packages.","Le mode admin ouvre edition, sources, medias et packages.",,,,,,,,,
map.search,Map search,Recherche carte,,,,,,,,,
auto.componentsRegionalmap.openMapSearch,Open map search,Ouvrir la recherche carte,,,,,,,,,
auto.componentsRegionalmap.find,Find,Trouver,,,,,,,,,
auto.componentsRegionalmap.topicAddressCityOr50854,"Topic, address, city, or 50.85, 4.35","Sujet, adresse, ville ou 50.85, 4.35",,,,,,,,,
nav.interaction,Interaction,Interaction,,,,,,,,,
nav.regional,Regional,Régional,,,,,,,,,
nav.main,World,Monde,,,,,,,,,
nav.mainTitle,World layers,Couches monde,,,,,,,,,
nav.space,Space,Espace,,,,,,,,,
nav.fever,Fever,Fièvre,,,,,,,,,
`;

function normalizeCell(value = '') {
  return String(value ?? '').trim();
}

function parseCsvLine(line = '') {
  const cells = [];
  let cell = '';
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];

    if (quoted) {
      if (char === '"' && next === '"') {
        cell += '"';
        index += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        cell += char;
      }
      continue;
    }

    if (char === '"') {
      quoted = true;
    } else if (char === ',') {
      cells.push(cell);
      cell = '';
    } else {
      cell += char;
    }
  }

  cells.push(cell);
  return cells;
}

export function parseTranslationCsv(csvText = '') {
  const rows = [];
  let headers = null;

  String(csvText || '')
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .forEach(line => {
      if (!line.trim() || line.trimStart().startsWith('#')) return;

      const cells = parseCsvLine(line);
      if (!headers) {
        headers = cells.map(cell => normalizeCell(cell));
        return;
      }

      const row = {};
      headers.forEach((header, index) => {
        row[header] = normalizeCell(cells[index] || '');
      });

      if (row.key && row.en) {
        rows.push(row);
      }
    });

  return rows;
}

function escapeRegex(value = '') {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildPattern(sourceText, translatedText) {
  const placeholders = [];
  const pattern = escapeRegex(sourceText).replace(/\\\{([a-zA-Z0-9_]+)\\\}/g, (_, name) => {
    placeholders.push(name);
    return '(.+?)';
  });

  if (!placeholders.length) return null;

  return {
    regex: new RegExp(`^${pattern}$`),
    placeholders,
    template: translatedText
  };
}

export function buildTranslationCatalogFromCsv(csvText = '') {
  const catalog = {};
  const exactText = {};
  const patternText = {};

  parseTranslationCsv(csvText).forEach(row => {
    const key = row.key;
    const english = row.en;
    if (!catalog.en) catalog.en = {};
    catalog.en[key] = english;

    TRANSLATION_COLUMNS.forEach(langCode => {
      const value = row[langCode] || '';
      if (!value) return;

      if (!catalog[langCode]) catalog[langCode] = {};
      catalog[langCode][key] = value;

      if (langCode !== 'en' && value !== english) {
        if (english.includes('{') && value.includes('{')) {
          const pattern = buildPattern(english, value);
          if (pattern) {
            if (!patternText[langCode]) patternText[langCode] = [];
            patternText[langCode].push(pattern);
          }
        } else {
          if (!exactText[langCode]) exactText[langCode] = {};
          exactText[langCode][english] = value;
        }
      }
    });
  });

  return {
    catalog,
    textTranslations: {
      exact: exactText,
      patterns: patternText
    }
  };
}

export function replaceTranslationCatalog(nextCatalog = {}, nextTextTranslations = {}) {
  Object.keys(UI_TRANSLATIONS).forEach(langCode => {
    delete UI_TRANSLATIONS[langCode];
  });

  Object.entries(nextCatalog).forEach(([langCode, labels]) => {
    UI_TRANSLATIONS[langCode] = { ...labels };
  });

  UI_TEXT_TRANSLATIONS.exact = nextTextTranslations.exact || {};
  UI_TEXT_TRANSLATIONS.patterns = nextTextTranslations.patterns || {};
}

export function applyTranslationCsv(csvText = '') {
  const { catalog, textTranslations } = buildTranslationCatalogFromCsv(csvText);
  replaceTranslationCatalog(catalog, textTranslations);
  return catalog;
}

applyTranslationCsv(FALLBACK_UI_TRANSLATION_CSV);
