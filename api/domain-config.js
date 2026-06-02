/**
 * SmΔrt API — Domain & CDN Guard Configuration
 * Edit this file to adjust which hosts are allowed per deployment.
 * Loaded BEFORE api-settings.html body scripts.
 *
 * Current deployment: api.caddeltai.com  (Vercel project: rename-safe)
 */
window.SMART_DOMAIN_GUARD_CONFIG = {
  enabled: true,
  allowedHosts: [
    // caddeltai.com ecosystem
    "api-caddeltai.vercel.app", // Vercel project URL (api)
    "media-caddeltai.vercel.app", // Vercel project URL (media-forge)
    "studio-caddeltai.vercel.app", // Vercel project URL (streaming studio)
    "caddeltai.com",
    "www.caddeltai.com",
    "api.caddeltai.com",
    "media.caddeltai.com",
    "studio.caddeltai.com", // Streaming studio
    "caddeltart.com",
    // smdeltart.com ecosystem
    "smdeltart.vercel.app",
    "smdeltart.com",
    "api.smdeltart.com",
    "widgets.smdeltart.com",
    // Vercel hosting (any *.vercel.app via allowSubdomains)
    "vercel.app",
    // topic.earth
    "topic.earth",
    // Local development
    "localhost",
    "127.0.0.1",
  ],
  allowSubdomains: true,
  allowFileProtocol: true,
  officialUrl: "https://api.caddeltai.com/api-settings",
};

window.SMART_CDN_POLICY = {
  enabled: true,
  allowedScriptHosts: ["cdn.jsdelivr.net"],
};
