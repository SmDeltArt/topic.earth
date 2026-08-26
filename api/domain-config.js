/**
 * CAD-DELTAI API — Domain & CDN Guard Configuration
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

window.DOMAIN_CONFIG = window.SMART_DOMAIN_GUARD_CONFIG;

/* sync:begin developer-admin */
// Read a `dev=1` flag from any query-string-like source (search or hash).
function _smartDevFlagFrom(search) {
  try {
    return new URLSearchParams(search || "").get("dev") === "1";
  } catch {
    return false;
  }
}

// Detect developer mode across the sources a widget can be loaded from:
//   • own URL search      → ?dev=1  and  ?app=api&dev=1
//   • own URL hash        → #dev=1  and  #app=api&dev=1
//   • parent/top window   → SPA host at /?app=api&dev=1 embedding this page
//   • document.referrer   → opener carried the dev flag
// Once seen, the flag is remembered for the tab so SPA navigation keeps it.
window.DOMAIN_CONFIG.showDeveloperUI = function showDeveloperUI() {
  const hostname = window.location.hostname || "";

  let devFlag =
    _smartDevFlagFrom(window.location.search) ||
    _smartDevFlagFrom((window.location.hash || "").replace(/^#/, "?"));

  if (!devFlag) {
    try {
      if (window.top && window.top !== window) {
        devFlag = _smartDevFlagFrom(window.top.location.search);
      }
    } catch {
      /* cross-origin top — ignore */
    }
  }

  if (!devFlag && document.referrer) {
    try {
      devFlag = _smartDevFlagFrom(new URL(document.referrer).search);
    } catch {
      /* malformed referrer — ignore */
    }
  }

  if (devFlag) {
    try {
      sessionStorage.setItem("smdeltartDevUi", "1");
    } catch {
      /* storage blocked — ignore */
    }
    return true;
  }

  try {
    if (sessionStorage.getItem("smdeltartDevUi") === "1") {
      return true;
    }
  } catch {
    /* storage blocked — ignore */
  }

  if (hostname === "localhost" || hostname === "127.0.0.1") {
    return true;
  }

  // Production domains do not imply developer access. Developer UI is
  // activated only by an explicit dev=1 signal remembered for this tab.
  return false;
};
/* sync:end developer-admin */
