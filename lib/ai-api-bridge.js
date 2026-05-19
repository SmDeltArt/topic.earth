import { Settings } from './settings.js';

export const AiApiBridge = globalThis.SmartAiApiBridge || null;

export function installAiApiBridge(options = {}) {
  if (window.ourEarthAI) return window.ourEarthAI;

  if (!window.SmartAiApiBridge) {
    throw new Error('SmartAiApiBridge is not loaded. Include shared/smart-ai-api-bridge.js before app.js.');
  }

  const bridge = new window.SmartAiApiBridge({
    appName: options.appName || 'topic-earth',
    eventName: 'aiApiSettingsChanged',
    getRuntimeSettings: () => Settings.get(),
    onSummary: (summary) => {
      const current = Settings.get();
      const linkedOpenAiTts = summary.ttsActiveMode === 'external'
        && summary.ttsProvider === 'openai-tts'
        && summary.ttsHasKey;
      const nonOpenAiTtsSelected = Boolean(summary.ttsActiveMode && summary.ttsActiveMode !== 'websim' && !linkedOpenAiTts);
      const openAiVoice = summary.ttsProvider === 'openai-tts' ? summary.ttsVoice : '';

      Settings.set({
        aiApiLinked: summary.linked,
        aiApiLastSyncedAt: summary.lastSyncedAt,
        aiApiTextProvider: summary.textProvider || '',
        aiApiTextModel: summary.textModel || '',
        aiApiTextMaxModel: summary.textMaxModel || current.aiApiTextMaxModel || '',
        aiApiTextMaxDetectedAt: summary.textMaxDetectedAt || current.aiApiTextMaxDetectedAt || null,
        aiApiImageProvider: summary.imageProvider || '',
        aiApiImageModel: summary.imageModel || '',
        aiVoiceEnabled: linkedOpenAiTts ? true : nonOpenAiTtsSelected ? false : current.aiVoiceEnabled,
        aiVoiceProvider: summary.ttsProvider === 'openai-tts' ? summary.ttsProvider : current.aiVoiceProvider || 'openai-tts',
        aiVoiceModel: summary.ttsModel || current.aiVoiceModel || 'tts-1',
        aiVoiceVoice: openAiVoice || current.aiVoiceVoice || current.preferredAIVoice || 'alloy',
        preferredAIVoice: openAiVoice || current.preferredAIVoice || 'alloy'
      });
    }
  });

  window.ourEarthAI = bridge;
  return bridge;
}
