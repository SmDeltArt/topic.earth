# App Trust And Store Publishing

This note explains how topic.earth can present itself as a trustworthy web app, then move toward Android and iOS distribution without pretending to have a fake "virus-free certificate".

## Trust Goal

The realistic goal is:

- Clear privacy and cookie disclosure.
- Minimal tracking by default.
- No intrusive cookies unless the user explicitly enables a feature that needs them.
- Public security posture based on repeatable checks.
- Store-ready privacy declarations for Android and iOS.
- A clear contact path for security and privacy reports.

There is no universal certificate that proves a web app is virus-free forever. A better public claim is:

> topic.earth is a static-first web app with documented privacy behavior, limited local storage, no advertising trackers by default, dependency scanning, and repeatable security checks.

## Privacy And Cookies

For topic.earth, the preferred posture is:

- Use strictly necessary local storage only for settings, drafts, and user-selected API configuration.
- Avoid advertising cookies, cross-site tracking pixels, and hidden analytics by default.
- If analytics are added later, use a privacy-preserving option and document it before enabling it.
- Keep third-party services visible: Cloudinary for media delivery, OpenAI or other AI providers only when the user configures or triggers linked AI features.
- Add a short in-app Privacy panel linked from Settings and footer/social pages.

Recommended public pages:

- `privacy.html`
- `security.html`
- `cookies.html`
- `terms.html` or `about.html`

Cookie text should distinguish:

- **Required storage**: app settings, language, interface preferences, local drafts.
- **Optional storage**: linked AI settings, imported media references, user-created topic packages.
- **External requests**: CDN assets, map/search providers, AI APIs when enabled.

If the app does not use intrusive cookies, say that plainly. Do not show a heavy cookie banner unless there is a real consent choice.

## Security Checks

Use a repeatable checklist rather than a vague badge.

Minimum checks:

- Run dependency audit for the chosen package manager when dependencies exist.
- Keep third-party scripts local or pinned where possible.
- Add a Content Security Policy once the active external domains are stable.
- Avoid inline scripts for user-generated story cards; keep them sandboxed.
- Sanitize pasted HTML before preview/export.
- Keep API keys out of public files, URLs, logs, and shared domains.
- Review local storage keys so encrypted values are never sent to unrelated subdomains.
- Keep admin mode local and deliberate.

Useful public standards:

- OWASP ASVS for web app security review.
- OWASP MASVS if a mobile wrapper is built.

Important wording:

> Security self-check aligned with OWASP ASVS/MASVS.

Avoid:

> OWASP certified.

OWASP standards can guide assessment, but OWASP itself warns that using MASVS should not be presented as official OWASP certification.

## Public Trust Badges

Good badges for the website or README:

- `Privacy-first`
- `No ad tracking by default`
- `Static-first app`
- `Sandboxed story cards`
- `Open-source reviewable`
- `OWASP-guided security checklist`
- `User-controlled AI keys`

Avoid badges that imply a third party certified the app unless that third party actually did:

- `Virus free certified`
- `GDPR certified`
- `Apple certified`
- `Google certified`
- `OWASP certified`

## Android Path

The simplest Android path is a Progressive Web App first, then a store wrapper only when needed.

### Option A: PWA

- Keep `site.webmanifest` complete.
- Add app icons, screenshots, theme color, and offline fallback if useful.
- Make install prompt work from Chrome/Android.
- This is fastest and does not require a store review.

### Option B: Google Play

Use this when you want Play Store discovery, reviews, and a trusted install channel.

Steps:

1. Create a Google Play Developer account.
2. Build an Android wrapper with Trusted Web Activity or Capacitor.
3. Publish as an Android App Bundle (`.aab`).
4. Configure Play App Signing.
5. Complete the Google Play Data safety section.
6. Add privacy policy URL.
7. Provide screenshots, app description, contact email, and category.
8. Test with internal testing before production.

For topic.earth, the Data safety section should be filled from real behavior:

- Does the app collect location?
- Is location precise or approximate?
- Is user content stored locally only, uploaded, or shared?
- Are API keys user-provided?
- Are AI requests sent to third-party providers?
- Can users delete local data?

## iOS Path

Apple is stricter about apps that are only a website in a wrapper. The iOS version should add native value or be presented as a high-quality web app with strong metadata.

### Option A: PWA

- Make the web app installable from Safari.
- Provide Apple touch icons and mobile layout polish.
- This is the fastest path and avoids App Store review.

### Option B: App Store

Steps:

1. Join the Apple Developer Program.
2. Build an iOS wrapper with Capacitor or native WebView plus native value.
3. Add in-app privacy policy access.
4. Complete App Privacy details in App Store Connect.
5. Prepare screenshots, app preview, description, support URL, and review notes.
6. Make sure the app does not expose secret keys or hidden tracking.
7. Submit for App Review.

Apple requires privacy policy links and accurate privacy metadata. App Store product pages show developer-reported privacy details, so the app behavior and privacy declaration must match.

## Better Mobile Strategy For topic.earth

Best sequence:

1. **PWA first**: make the installed web app excellent on Android and iOS.
2. **Trust pages**: add privacy, security, cookies, and contact pages.
3. **Security checklist**: document checks in `docs/security-checklist.md`.
4. **Android wrapper**: publish a Trusted Web Activity or Capacitor wrapper.
5. **iOS wrapper later**: only after the app has enough native-quality value and stable privacy declarations.

## Privacy Policy Draft Outline

Sections:

- What topic.earth is.
- What data stays on the device.
- What data may be sent to external services.
- AI provider behavior.
- Local drafts and exports.
- Cookies and local storage.
- Children and educational content.
- Security practices.
- User controls and deletion.
- Contact: `info@topic.earth` or `contact@topic.earth`.

## Store Description Direction

Short description:

> topic.earth is an interactive Earth intelligence dashboard for climate signals, regional topics, space context, Fever scenarios, and AI-assisted research.

Trust line:

> Static-first, privacy-conscious, and open-source, with user-controlled AI configuration and local-first topic drafting.

## Sources To Keep Current

- Apple App Review Guidelines: https://developer.apple.com/app-store/review/guidelines/
- Apple App Privacy Details: https://developer.apple.com/app-store/app-privacy-details/
- Google Play Data safety: https://support.google.com/googleplay/android-developer/answer/10787469
- OWASP ASVS: https://owasp.org/www-project-application-security-verification-standard/
- OWASP MASVS: https://mas.owasp.org/MASVS/
