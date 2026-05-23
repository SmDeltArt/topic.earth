const DEFAULT_YEARS = [1975, 2000, 2025, 2050, 2075, 2100, 2125];
const DEFAULT_SCENARIOS = ['best', 'objective', 'high'];
const DEFAULT_LANGUAGES = ['en', 'fr'];
const DEFAULT_PROFILES = ['short', 'normal', 'full'];

function cleanText(value = '') {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function normalizeSentence(value = '') {
  const text = cleanText(value);
  if (!text) return '';
  return /[.!?。؟।]$/.test(text) ? text : `${text}.`;
}

function firstSentence(value = '') {
  return cleanText(value).split(/(?<=[.!?。؟।])\s+/)[0] || '';
}

function appendUnique(parts, sentence) {
  const normalized = normalizeSentence(sentence);
  if (!normalized) return;
  if (parts.includes(normalized)) return;
  parts.push(normalized);
}

function primaryLanguage(lang = 'en') {
  return String(lang || 'en').toLowerCase().split(/[-_]/)[0] || 'en';
}

function speechCodeForLanguage(lg = 'en') {
  const language = primaryLanguage(lg);
  if (language === 'ar') return 'ar-SA';
  if (language === 'fr') return 'fr-FR';
  if (language === 'nl') return 'nl-NL';
  if (language === 'de') return 'de-DE';
  if (language === 'es') return 'es-ES';
  if (language === 'el') return 'el-GR';
  if (language === 'hi') return 'hi-IN';
  if (language === 'ja') return 'ja-JP';
  if (language === 'ru') return 'ru-RU';
  if (language === 'uk') return 'uk-UA';
  if (language === 'zh') return 'zh-CN';
  return 'en-US';
}

function voiceForLanguage(batch = {}, lg = 'en', fallbackVoice = 'alloy') {
  const language = primaryLanguage(lg);
  return batch.voiceByLanguage?.[language] || batch.voice || fallbackVoice;
}

export function getFeverSpeedProfile(speed = 2 / 3) {
  const numericSpeed = Number(speed);
  if (Number.isFinite(numericSpeed) && numericSpeed >= 0.99) return 'short';
  if (Number.isFinite(numericSpeed) && numericSpeed >= 0.6) return 'normal';
  return 'full';
}

const FEVER_AUDIO_COPY = {
  ar: {
    signalPrefix: 'تقرأ الإشارة:',
    warming: value => `الاحترار زائد ${value} درجة`,
    amoc: value => `قوة دوران AMOC هي ${value} بالمئة`,
    tipping: value => `خطر نقاط التحول هو ${value} بالمئة`,
    nextStep: 'تستمر الإشارة إلى خطوة الخمس والعشرين سنة التالية.'
  },
  de: {
    signalPrefix: 'Das Signal zeigt:',
    warming: value => `Erwaermung plus ${value} Grad`,
    amoc: value => `AMOC-Staerke ${value} Prozent`,
    tipping: value => `Kipprisiko ${value} Prozent`,
    nextStep: 'Das Signal geht in den naechsten Schritt von fuenfundzwanzig Jahren ueber.'
  },
  el: {
    signalPrefix: 'Το σήμα δείχνει:',
    warming: value => `η θέρμανση είναι συν ${value} βαθμοί`,
    amoc: value => `η ισχύς του AMOC είναι ${value} τοις εκατό`,
    tipping: value => `ο κίνδυνος σημείων καμπής είναι ${value} τοις εκατό`,
    nextStep: 'Το σήμα συνεχίζεται στο επόμενο βήμα των είκοσι πέντε ετών.'
  },
  es: {
    signalPrefix: 'La senal indica:',
    warming: value => `calentamiento de mas ${value} grados`,
    amoc: value => `fuerza del AMOC ${value} por ciento`,
    tipping: value => `riesgo de puntos de inflexion ${value} por ciento`,
    nextStep: 'La senal continua hacia el siguiente paso de veinticinco anos.'
  },
  fr: {
    signalPrefix: 'Le signal indique :',
    warming: value => `rechauffement de plus ${value} degres`,
    amoc: value => `force de l AMOC ${value} pour cent`,
    tipping: value => `risque de bascule ${value} pour cent`,
    nextStep: 'Le signal continue vers la prochaine etape de vingt-cinq ans.'
  },
  hi: {
    signalPrefix: 'संकेत बताता है:',
    warming: value => `गर्माहट प्लस ${value} डिग्री है`,
    amoc: value => `AMOC की शक्ति ${value} प्रतिशत है`,
    tipping: value => `टिपिंग जोखिम ${value} प्रतिशत है`,
    nextStep: 'संकेत अगले पच्चीस-वर्षीय चरण में जारी रहता है.'
  },
  nl: {
    signalPrefix: 'Het signaal geeft aan:',
    warming: value => `opwarming is plus ${value} graden`,
    amoc: value => `AMOC-sterkte is ${value} procent`,
    tipping: value => `kantelrisico is ${value} procent`,
    nextStep: 'Het signaal gaat door naar de volgende stap van vijfentwintig jaar.'
  },
  ru: {
    signalPrefix: 'Сигнал показывает:',
    warming: value => `потепление плюс ${value} градуса`,
    amoc: value => `сила AMOC составляет ${value} процентов`,
    tipping: value => `риск точек перелома составляет ${value} процентов`,
    nextStep: 'Сигнал переходит к следующему шагу в двадцать пять лет.'
  },
  uk: {
    signalPrefix: 'Сигнал показує:',
    warming: value => `потепління плюс ${value} градуса`,
    amoc: value => `сила AMOC становить ${value} відсотків`,
    tipping: value => `ризик точок перелому становить ${value} відсотків`,
    nextStep: 'Сигнал переходить до наступного кроку у двадцять п’ять років.'
  },
  zh: {
    signalPrefix: '信号显示：',
    warming: value => `升温为正 ${value} 度`,
    amoc: value => `AMOC 强度为 ${value}%`,
    tipping: value => `临界点风险为 ${value}%`,
    nextStep: '信号继续进入下一个二十五年阶段。'
  }
};

function getFeverAudioCopy(lg = 'en') {
  return FEVER_AUDIO_COPY[primaryLanguage(lg)] || {
    signalPrefix: 'The signal reads:',
    warming: value => `warming is plus ${value} degrees`,
    amoc: value => `AMOC strength is ${value} percent`,
    tipping: value => `tipping risk is ${value} percent`,
    nextStep: 'The signal continues into the next twenty-five year step.'
  };
}

export function buildFeverMetricSentence(milestone = {}, lg = 'en') {
  const copy = getFeverAudioCopy(lg);
  const metrics = [];
  if (Number.isFinite(Number(milestone.temperatureDeltaC))) {
    metrics.push(copy.warming(Number(milestone.temperatureDeltaC).toFixed(1)));
  }
  if (Number.isFinite(Number(milestone.amocStrengthPct))) {
    metrics.push(copy.amoc(Math.round(Number(milestone.amocStrengthPct))));
  }
  if (Number.isFinite(Number(milestone.tippingRiskPct))) {
    metrics.push(copy.tipping(Math.round(Number(milestone.tippingRiskPct))));
  }
  return metrics.length ? `${copy.signalPrefix} ${metrics.join(', ')}.` : '';
}

export function buildFeverAudioText({ title = '', text = '', milestone = {}, speed, profile, lg = 'en' } = {}) {
  const speedProfile = profile || getFeverSpeedProfile(speed);
  const copy = getFeverAudioCopy(lg);
  const parts = [];
  const lead = title || firstSentence(text) || text;

  appendUnique(parts, lead);

  if (speedProfile === 'short') {
    appendUnique(parts, buildFeverMetricSentence(milestone, lg));
    return parts.join(' ');
  }

  appendUnique(parts, firstSentence(text));
  appendUnique(parts, buildFeverMetricSentence(milestone, lg));

  if (speedProfile === 'full') {
    appendUnique(parts, text);
    appendUnique(parts, copy.nextStep);
  }

  return parts.join(' ');
}

function getLocalizedMilestone(milestone = {}, lg = 'en') {
  const language = primaryLanguage(lg);
  const translated = milestone.warningTranslations?.[language];
  return {
    title: translated?.warningTitle || milestone.warningTitle || '',
    text: translated?.warningText || milestone.warningText || ''
  };
}

export function expandFeverAudioMessages(manifest = {}, feverScenarioData = {}) {
  const batches = Array.isArray(manifest.generatedBatches) ? manifest.generatedBatches : [];
  const messages = [];

  batches
    .filter(batch => batch.type === 'fever-scenario-milestones')
    .forEach(batch => {
      const scenarios = batch.scenarios || DEFAULT_SCENARIOS;
      const years = batch.years || feverScenarioData.years?.filter(year => year !== 1950) || DEFAULT_YEARS;
      const languages = batch.languages || DEFAULT_LANGUAGES;
      const profiles = batch.speedProfiles || DEFAULT_PROFILES;
      const tags = Array.isArray(batch.tags) ? batch.tags : [];

      scenarios.forEach(scenario => {
        const milestones = feverScenarioData.scenarios?.[scenario]?.milestones || {};
        years.forEach(year => {
          const milestone = milestones[String(year)] || milestones[year];
          if (!milestone) return;

          languages.forEach(lg => {
            const localized = getLocalizedMilestone(milestone, lg);
            if (!localized.title && !localized.text) return;

            profiles.forEach(profile => {
              const id = `${batch.id || 'fever-loop'}-${scenario}-${year}-${profile}-${primaryLanguage(lg)}`;
              messages.push({
                id,
                lang: speechCodeForLanguage(lg),
                lg: primaryLanguage(lg),
                voice: voiceForLanguage(batch, lg, 'shimmer'),
                tags: [...tags, `fever-${scenario}`, `fever-${profile}`],
                text: buildFeverAudioText({
                  title: localized.title,
                  text: localized.text,
                  milestone,
                  profile,
                  lg
                }),
                mp3: `${id}.mp3`,
                webm: `${id}.webm`,
                generated: true,
                source: batch.source || 'fever-scenarios.json',
                scenario,
                year,
                speedProfile: profile
              });
            });
          });
        });
      });
    });

  return messages;
}

export function expandTutorialAudioMessages(manifest = {}) {
  const batches = Array.isArray(manifest.generatedBatches) ? manifest.generatedBatches : [];
  const messages = [];

  batches
    .filter(batch => batch.type === 'tutorial-steps')
    .forEach(batch => {
      const languages = batch.languages || DEFAULT_LANGUAGES;
      const tags = Array.isArray(batch.tags) ? batch.tags : ['tutorial-step'];
      const steps = Array.isArray(batch.steps) ? batch.steps : [];

      steps.forEach(step => {
        if (!step?.id || !step.titleKey || !step.bodyKey) return;

        languages.forEach(lg => {
          const language = primaryLanguage(lg);
          const id = `${batch.id || 'tutorial'}-${step.id}-${language}`;
          messages.push({
            id,
            lang: speechCodeForLanguage(language),
            lg: language,
            voice: step.voiceByLanguage?.[language] || step.voice || voiceForLanguage(batch, language, 'alloy'),
            tags: [...tags, `tutorial-${step.level || 'all'}`],
            csvKeys: [step.titleKey, step.bodyKey],
            mp3: `${id}.mp3`,
            webm: `${id}.webm`,
            generated: true,
            source: 'lib/tutorial-guide.js',
            tutorialStep: step.id,
            tutorialLevel: step.level || ''
          });
        });
      });
    });

  return messages;
}

function keyToId(value = '') {
  return String(value || '')
    .trim()
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
}

export function expandUiTextAudioMessages(manifest = {}) {
  const batches = Array.isArray(manifest.generatedBatches) ? manifest.generatedBatches : [];
  const messages = [];

  batches
    .filter(batch => batch.type === 'ui-text')
    .forEach(batch => {
      const languages = batch.languages || DEFAULT_LANGUAGES;
      const tags = Array.isArray(batch.tags) ? batch.tags : ['ui-text'];
      const keys = Array.isArray(batch.keys) ? batch.keys : [];

      keys.forEach(key => {
        if (!key) return;

        languages.forEach(lg => {
          const language = primaryLanguage(lg);
          const id = `${batch.id || 'ui-text'}-${keyToId(key)}-${language}`;
          messages.push({
            id,
            lang: speechCodeForLanguage(language),
            lg: language,
            voice: voiceForLanguage(batch, language, 'alloy'),
            tags,
            csvKey: key,
            mp3: `${id}.mp3`,
            webm: `${id}.webm`,
            generated: true,
            source: 'shared/topic-earth-ui.csv',
            uiKey: key
          });
        });
      });
    });

  return messages;
}
