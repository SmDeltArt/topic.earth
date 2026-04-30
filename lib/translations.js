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
  { code: 'ru', name: 'Russian', nativeName: 'Русский', speechCode: 'ru-RU', textDirection: 'ltr' },
  { code: 'hi', name: 'Hindi / India', nativeName: 'हिन्दी', speechCode: 'hi-IN', textDirection: 'ltr' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', speechCode: 'ar-SA', textDirection: 'rtl' },
  { code: 'zh', name: 'Chinese', nativeName: '中文', speechCode: 'zh-CN', textDirection: 'ltr' }
];

export const TRANSLATION_COLUMNS = ['en', 'fr', 'nl', 'de', 'es', 'ar', 'zh', 'hi', 'ja', 'ru', 'uk'];
export const UI_TRANSLATIONS = {};
export const UI_TEXT_TRANSLATIONS = {
  exact: {},
  patterns: {}
};

const FALLBACK_UI_TRANSLATION_CSV = `key,en,fr,nl,de,es,ar,zh,hi,ja,ru,uk
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
detail.collapseShort,Short view,Vue courte,,,,,,,,,
detail.expandFull,Full view,Vue complete,,,,,,,,,
detail.expandTop,Top view,Vue haute,,,,,,,,,
detail.restoreMiddle,Middle view,Vue moyenne,,,,,,,,,
fever.climateDataForScenario,Climate data for {year} - {scenario} scenario,Donnees climatiques pour {year} - scenario {scenario},,,,,,,,,
regional.toolDrag,Drag map,Deplacer carte,,,,,,,,,
regional.toolAddPoint,Add point,Ajouter un point,,,,,,,,,
regional.toolTracePath,Trace path,Tracer chemin,,,,,,,,,
regional.toolFinishPath,Finish path,Terminer chemin,,,,,,,,,
regional.toolClearPath,Clear,Effacer,,,,,,,,,
regional.dragStatus,Drag the map to explore.,Deplacez la carte pour explorer.,,,,,,,,,
regional.pointStatus,Tap the map to add a point.,Touchez la carte pour ajouter un point.,,,,,,,,,
regional.pathStarted,Tap the map to trace a path.,Touchez la carte pour tracer un chemin.,,,,,,,,,
regional.pathPointAdded,{count} path point(s).,{count} point(s) de chemin.,,,,,,,,,
regional.pathFinished,Path highlighted with {count} points.,Chemin surligne avec {count} points.,,,,,,,,,
regional.pathNeedTwo,Add at least 2 points for a path.,Ajoutez au moins 2 points pour un chemin.,,,,,,,,,
regional.pathCleared,Path cleared.,Chemin efface.,,,,,,,,,
regional.pointReady,"Point ready at {lat}, {lon}.","Point pret a {lat}, {lon}.",,,,,,,,,
regional.newPoint,New map point,Nouveau point carte,,,,,,,,,
regional.proposeHere,Propose here,Proposer ici,,,,,,,,,
regional.toolsLabel,Regional map tools,Outils carte regionale,,,,,,,,,
regional.collapseTools,Collapse map tools,Replier les outils carte,,,,,,,,,
regional.expandTools,Expand map tools,Afficher les outils carte,,,,,,,,,
regional.toolRoute,Route,Itineraire,,,,,,,,,
regional.toolUndo,Undo,Annuler,,,,,,,,,
regional.toolRedo,Redo,Retablir,,,,,,,,,
regional.toolClearRoute,Clear route,Effacer l'itineraire,,,,,,,,,
regional.pointCleared,Point cleared.,Point efface.,,,,,,,,,
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
regional.routeHint,"Choose route, click a start point, then a destination.","Choisissez Itineraire, cliquez le depart puis la destination.",,,,,,,,,
regional.routePickStart,Click the start point for the route.,Cliquez le point de depart de l'itineraire.,,,,,,,,,
regional.routePickEnd,Click the destination point for the route.,Cliquez la destination de l'itineraire.,,,,,,,,,
regional.routeStart,Start,Depart,,,,,,,,,
regional.routeEnd,Destination,Destination,,,,,,,,,
regional.routeFetching,Finding a route on OpenStreetMap...,Recherche d'un itineraire OpenStreetMap...,,,,,,,,,
regional.routeReady,"Route ready: {distance} km, about {duration} min by {mode}.","Itineraire pret : {distance} km, environ {duration} min en {mode}.",,,,,,,,,
regional.routeFallback,Routing service unavailable; direct guide line shown.,Service d'itineraire indisponible; ligne directe affichee.,,,,,,,,,
regional.routeCleared,Route cleared.,Itineraire efface.,,,,,,,,,
map.search,Map search,Recherche carte,,,,,,,,,
auto.componentsRegionalmap.openMapSearch,Open map search,Ouvrir la recherche carte,,,,,,,,,
auto.componentsRegionalmap.find,Find,Trouver,,,,,,,,,
auto.componentsRegionalmap.topicAddressCityOr50854,"Topic, address, city, or 50.85, 4.35","Sujet, adresse, ville ou 50.85, 4.35",,,,,,,,,
nav.interaction,Interaction,Interaction,,,,,,,,,
nav.regional,Regional,Régional,,,,,,,,,
nav.main,Main,Principal,,,,,,,,,
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
