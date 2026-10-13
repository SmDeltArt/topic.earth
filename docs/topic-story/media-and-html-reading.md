# Story media and HTML reading

Document settings affect the story only. The topic.earth application theme is unchanged.

## Manual media

Open **🎨 beside the narrative-card type**, then **Story media**. Supply a direct HTTP(S) media URL or import a file. Supported files: SVG, PNG, JPEG, WebP, GIF, AVIF, WebM, MP4, MP3 and WAV. A WebM file can also be selected as audio.

Choose the width in percent, left/centre/right alignment, a caption and the paragraph position. Paragraphs are numbered from 1; 0 means append at the end. Select an existing image, video or audio item to modify or remove it. Apply the document style to save the changes; closing settings discards them.

Imported files are checked locally, retained under `assets/` in the story and packaged beside its HTML in the topic ZIP. ZIP imports restore those files for the preview. A ZIP with hand-written HTML such as `<img src="assets/garden.webp">` and that file at the archive root also works. Remote URLs stay remote; their host must permit loading. The importer checks files, not the contents of remote URLs.

The picker is a local, transparent, full-viewport iframe in a transparent browser top-layer surface. It has no extra host buttons, border, background or repository link. The native picker owns dragging, gradients and close. Its contract was compared with `SmDeltArt/private/widgets/src/smart-svg-editor.js` and `widgets/color/smart-color-picker.html`; this integration retains the local origin/source checks and mobile scrolling fixes.

Import limits: 10 MB of encoded story assets per document; the existing ZIP scanner also checks file signatures, passive SVG, archive size and paths. Use URLs for larger media. Autoplay is muted and depends on browser policy. Video uses `playsinline`; a player is retained when autoplay is off. Supplied story JavaScript remains disabled.

## Optional AI placement

Use **+ 🧭** to enter, for example:

> Add the image from https://example.org/garden.webp after paragraph 2, 70% wide, centred, with the caption “Shared garden”.

Or refer to an imported file: `assets/garden.webp`. Review the request first, then generate. The AI returns indexed text changes and `mediaInsertions` with a source, type, paragraph, width, alignment and playback choices. Only sources explicitly present in your request or imported asset list are accepted. The renderer builds the media HTML; the AI cannot replace CSS or inject HTML/JavaScript. Changes to the draft invalidate the review.

## Read, translate and save HTML

Open the story in full view and choose **🌐 ▷ Read / Translate HTML**. The topic's Read button also uses its attached story when no text is selected. The target language comes from topic.earth translation settings, and the translation service uses the existing browser / linked AI / free fallback configuration.

Translation replaces text fragments, including text inside links and SVG labels, while keeping markup, media and stylesheet bytes. The popup shows an HTML preview and offers **HTML**, JSON and available MP3 exports. The HTML filename is `<topic-id>-<language>-v001.html`. Imported assets are embedded in the downloaded HTML; site-local media becomes an absolute URL and remote media retains its URL. HTML reading text is read-only to preserve the correspondence between document fragments and markup. The existing selection-text popup remains editable.

If some fragments cannot be translated, the popup reports how many remain in the original language. If translation is entirely unavailable, the original document is kept and downloaded with its source language. Close or Stop cancels pending work. Documents are limited to 250 text fragments / 50,000 characters for this operation.

The HTML download is a separate portable document. Adding an arbitrary HTML, JSON or MP3 file to a ZIP does not automatically make it a saved translation or narration; the existing topic manifest determines those associations.

## En français

Dans **🎨**, ajouter une URL ou importer un média, choisir le paragraphe, la largeur, l’alignement, la légende et les options du lecteur. **Appliquer** conserve les changements dans le document ; fermer annule les modifications temporaires. Les fichiers importés restent dans `assets/` et suivent le document lors de l’export/import ZIP.

**+ 🧭** accepte par exemple « Ajouter l’image https://example.org/jardin.webp après le paragraphe 2 ». Relire la demande avec l’IA avant de générer. La mise en page et les CSS existants sont conservés.

Dans la vue complète, **Lire / Traduire le HTML** traduit le texte en conservant la structure et les médias. Le bouton **HTML** télécharge `<identifiant>-<langue>-v001.html`. Le popup signale les fragments non traduits. Les fichiers importés sont intégrés au HTML téléchargé ; les URL distantes restent des URL. La lecture automatique des médias est muette et dépend du navigateur.
