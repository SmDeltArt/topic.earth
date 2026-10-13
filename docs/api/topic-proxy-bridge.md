# topic.earth API Settings bridge — 13 October 2026

The online Admin widget is hosted on `https://api.caddeltai.com/api-settings`. Each browser/profile has independent vault and storage state. Unlock the widget in that browser, choose Secure Proxy, save your providers, then use **Refresh linked models** in topic.earth.

Refresh requests a snapshot from the actual iframe and validates its source and origin. Current preferences override stale browser records. The widget sends preferences without provider keys; a separate trusted message carries the proxy token into tab-session storage. Provider keys remain on the API server. The token is not stored in local preferences or exported topics. Closing the tab or clearing the proxy session removes it.

Text and images use the canonical authenticated proxy routes; OpenAI and ElevenLabs speech use the selected provider's proxy route. ElevenLabs uses the public `server-default` alias, never a raw cloned voice ID. The selected `gpt-5.6 sol` label maps to `gpt-5.5` in the existing API Settings contract; the badge shows both labels where they differ. This is an alias, not a newly discovered model or account capability.

The API server must explicitly accept `https://topic.earth`, `https://www.topic.earth` and the stable `https://topic-earth.vercel.app` origin. This does not remove proxy-token authentication or admit arbitrary websites. The private widget's trusted session-parent list needs the same consumer origins.

Chrome/PWA vault behaviour is unchanged. Direct BYOK and Ollama routing remain separate from Secure Proxy. Actual paid-provider tests require the owner to unlock the vault in that browser. Automated tests use dummy tokens and mock upstream calls; no provider billing is triggered.

## Saved translation JSON and MP3 in ZIPs

The JSON button in Translate + Read downloads an **updated topic JSON**, including `readingSelections`. It also saves that reading selection locally, so exporting that topic to its review ZIP includes it automatically. Those selections match `originalText`, `language` and `sourceRevision`.

Whole-topic translations use `translations[language]` or `translationFiles[language] = {"url":"data/topics/.../topic-fr-v001.json","version":"v001"}`. The referenced JSON needs `language`, `sourceRevision`, `title`, `summary` and `insight`. A filename alone is not an association.

Simply adding `ambassador-pilot-eu-fr-v001.json` and its MP3 to an arbitrary ZIP folder does **not** automatically register them. Extra JSON is not discovered by basename. MP3 is accepted as a media file but is not automatically selected for reading, and the vignette's MP3 download does not create an audio-manifest entry. Use the saved topic record for its JSON and a supported read-audio manifest for recorded playback; the current review ZIP importer does not merge loose audio manifests into the global read-audio catalogue.

Do not rename the saved reading-selection JSON into a whole-topic translation record: they are different schemas. Keep the original topic ID and source revision when reusing it.
