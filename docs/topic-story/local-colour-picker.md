# Document colours and gradients

Open the admin Topic Story editor → 🎨 Content layout and theme. **Document background** and **Document panels** open the locally hosted Smart Color Picker.

Choose a solid colour, transparency, or a linear/radial gradient. **Use this colour** confirms the picker choice in the settings draft; **Apply to HTML only** commits the settings to the story draft. Cancel does not change the story. **Keep original styling** removes that paint override.

Original HTML/CSS is retained. Validated background/panel overrides and structured gradient stops are stored in `topicStory.contentSettings`; CSS is included in the HTML so it follows save and topic exports. Subsequent AI text updates preserve it. The palette defaults still come from World, Regional, Space or Fever. These controls do not recolour the app interface.

The picker is copied locally from [SmDeltArt/color](https://github.com/SmDeltArt/color), with its own GitHub credit/link. Its UI receives topic.earth's surface colours. No AI request or remote colour-picker domain is needed. Future upstream versions can be copied after checking the integration; this is a pinned local copy, not an automatic live update.

The picker assets are added to the PWA cache. This makes the picker available offline after the updated service worker installs; the rest of the app retains its existing offline limitations.
