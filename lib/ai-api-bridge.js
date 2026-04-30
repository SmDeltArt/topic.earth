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
      Settings.set({
        aiApiLinked: summary.linked,
        aiApiLastSyncedAt: summary.lastSyncedAt,
        aiApiTextProvider: summary.textProvider || '',
        aiApiTextModel: summary.textModel || '',
        aiApiImageProvider: summary.imageProvider || '',
        aiApiImageModel: summary.imageModel || ''
      });
    }
  });

  window.ourEarthAI = bridge;
  return bridge;
}
