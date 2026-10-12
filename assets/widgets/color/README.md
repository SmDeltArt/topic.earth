# Local Smart Color Picker

Source: https://github.com/SmDeltArt/color

Pinned source commit: `1ff8265ff35e69fabb22814e967e52d4e91b63b7`.

Included: the single-file picker, bundled colour set and translation CSV. No CDN or professional-domain service is required to choose document colours.

Local adaptations: corrected GitHub project link; bridge accepts only the same-origin parent and replies to that origin; `scp:setGradient` accepts validated structured stops to restore the document's saved gradient. These adaptations do not change the upstream repository. Future upstream updates must retain the bridge and restoration behaviour.

The host validates message source, origin and paint values. It builds background CSS from numeric stops and hexadecimal colours, not arbitrary picker CSS strings. The trusted picker runs in its own UI iframe; user-provided story HTML keeps its script-free sandbox. Changes apply to document background/panels only after the user confirms the picker and applies content settings.
