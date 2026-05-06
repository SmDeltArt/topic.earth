(() => {
  const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);
  const STOP_DURATIONS_MS = [3000, 4000, 5000];
  const FRAME_MS = 500;
  const isLocal = LOCAL_HOSTS.has(location.hostname);
  const FRAME_GROUP_IDS = ["g1", "g10", "g13", "g17", "g21", "g25"];

  const state = window.__topicLogoClockState || {
    startTime: performance.now(),
    stopAfterMs:
      STOP_DURATIONS_MS[Math.floor(Math.random() * STOP_DURATIONS_MS.length)],
    stopped: false,
    managing: true,
    tick: 0,
    latestFrame: "",
    frameUrls: [],
    timer: null,
  };
  window.__topicLogoClockState = state;
  state.managing = true;

  function withCacheBust(href) {
    const url = new URL(href, location.href);
    if (isLocal) url.searchParams.set("dev_favicon", Date.now().toString());
    return url.href;
  }

  function getIcon() {
    return (
      document.querySelector("link[data-topic-favicon]") ||
      document.getElementById("dynamicFavicon") ||
      document.querySelector('link[rel~="icon"]')
    );
  }

  function setPrimaryHref(icon) {
    if (!icon) return "";

    const cloudHref = icon.dataset.cloudHref || icon.href;
    icon.href = cloudHref;

    const probe = new Image();
    probe.onerror = () => {
      if (icon.dataset.localHref) {
        icon.href = withCacheBust(icon.dataset.localHref);
      }
    };
    probe.src = cloudHref;
    return icon.href;
  }

  function drawImageFrame(source, size) {
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) return "";

    ctx.clearRect(0, 0, size, size);
    ctx.drawImage(source, 0, 0, size, size);
    return canvas.toDataURL("image/png");
  }

  function stripInlineSvgAnimation(svgText) {
    return svgText
      .replace(/<animateTransform\b[^>]*>[\s\S]*?<\/animateTransform>/gi, "")
      .replace(/<animate\b[^>]*>[\s\S]*?<\/animate>/gi, "")
      .replace(/<animate(?:Transform)?\b[^>]*\/>/gi, "");
  }

  function setGroupOpacity(tag, opacity) {
    if (/\sopacity="[^"]*"/i.test(tag)) {
      return tag.replace(/\sopacity="[^"]*"/i, ` opacity="${opacity}"`);
    }
    return tag.replace(/>$/, ` opacity="${opacity}">`);
  }

  function makeGroupFrameSvg(svgText, activeIndex) {
    let frameSvg = stripInlineSvgAnimation(svgText);
    FRAME_GROUP_IDS.forEach((groupId, index) => {
      const groupPattern = new RegExp(`<g\\b(?=[^>]*id="${groupId}")[^>]*>`, "i");
      frameSvg = frameSvg.replace(groupPattern, (tag) =>
        setGroupOpacity(tag, index === activeIndex ? "1" : "0"),
      );
    });
    return frameSvg;
  }

  function renderSvgFrame(svgText, activeIndex, size = 64) {
    return new Promise((resolve) => {
      const frameSvg = makeGroupFrameSvg(svgText, activeIndex);
      const blobUrl = URL.createObjectURL(
        new Blob([frameSvg], { type: "image/svg+xml" }),
      );
      const source = new Image();
      source.decoding = "async";
      source.onload = () => {
        let frame = "";
        try {
          frame = drawImageFrame(source, size);
        } catch (error) {
          console.warn("[TopicFavicon] SVG frame render failed.", error);
        }
        URL.revokeObjectURL(blobUrl);
        resolve(frame);
      };
      source.onerror = () => {
        URL.revokeObjectURL(blobUrl);
        resolve("");
      };
      source.src = blobUrl;
    });
  }

  async function fetchSvgText(sourceHrefs) {
    for (const sourceHref of sourceHrefs) {
      try {
        const response = await fetch(sourceHref, { cache: "force-cache" });
        if (response.ok) return await response.text();
      } catch (error) {
        console.warn("[TopicFavicon] SVG source fetch failed.", error);
      }
    }
    return "";
  }

  async function buildGroupFrames(sourceHrefs) {
    if (state.frameUrls.length) return state.frameUrls;

    const svgText = await fetchSvgText(sourceHrefs);
    if (!svgText) return [];

    const frames = await Promise.all(
      FRAME_GROUP_IDS.map((_, index) => renderSvgFrame(svgText, index)),
    );
    state.frameUrls = frames.filter(Boolean);
    return state.frameUrls;
  }

  function getAnimationSources(primaryHref) {
    const icon = getIcon();
    const cloudHref = icon?.dataset.cloudHref || primaryHref || icon?.href || "";
    const localHref = icon?.dataset.localHref
      ? withCacheBust(icon.dataset.localHref)
      : "";
    const ordered = isLocal ? [localHref, cloudHref] : [cloudHref, localHref];
    return ordered.filter(Boolean).filter((href, index, list) => {
      return list.indexOf(href) === index;
    });
  }

  function applyFrame(frameHref) {
    if (!frameHref) return;
    const icon = getIcon();
    if (icon) {
      icon.dataset.topicClockManaged = "true";
      icon.href = frameHref;
    }
    state.latestFrame = frameHref;
  }

  function stopOnCurrentFrame(frameHref) {
    state.stopped = true;
    if (state.timer) {
      clearInterval(state.timer);
      state.timer = null;
    }
    applyFrame(frameHref || state.latestFrame);
  }

  function stopWithStaticFavicon() {
    state.stopped = true;
    if (state.timer) {
      clearInterval(state.timer);
      state.timer = null;
    }
    if (state.latestFrame) applyFrame(state.latestFrame);
  }

  function startSyncedAnimation(sourceHrefs) {
    const sources = Array.isArray(sourceHrefs)
      ? sourceHrefs.filter(Boolean)
      : [sourceHrefs].filter(Boolean);
    if (!sources.length) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    if (state.timer || state.stopped) {
      if (state.latestFrame) applyFrame(state.latestFrame);
      return;
    }

    buildGroupFrames(sources).then((frames) => {
      if (state.stopped || state.timer) return;
      if (!frames.length) {
        window.setTimeout(stopWithStaticFavicon, state.stopAfterMs);
        return;
      }

      const startFrameLoop = () => {
        const render = () => {
          const elapsed = performance.now() - state.startTime;
          const frame = frames[state.tick % frames.length];

          applyFrame(frame);

          if (elapsed >= state.stopAfterMs) {
            stopOnCurrentFrame(frame);
            return;
          }

          state.tick = (state.tick + 1) % 60;
        };

        render();
        if (!state.stopped && !state.timer) {
          state.timer = setInterval(render, FRAME_MS);
        }
      };

      startFrameLoop();
    });
  }

  function init() {
    const icon = getIcon();
    const href = setPrimaryHref(icon);
    startSyncedAnimation(getAnimationSources(href));
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }

  window.TopicFavicon = {
    init,
    isManaging: () => state.managing === true,
    getState: () => ({
      startTime: state.startTime,
      stopAfterMs: state.stopAfterMs,
      stopped: state.stopped,
      managing: state.managing,
      tick: state.tick,
      frameCount: state.frameUrls.length,
      hasLatestFrame: Boolean(state.latestFrame),
    }),
  };
})();
