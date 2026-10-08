// Shared social-brand palettes for generated topic HTML. Layer accents come
// from the selected Data Layers entry and never from AI-generated CSS.
export const TOPIC_THEMES = Object.freeze({
  world: { topic: '#00d4ff', earth: '#9ff5ff', light: '#f4feff', secondary: '#7cffd6' },
  regional: { topic: '#39ff88', earth: '#d8ff7a', light: '#f6ffe6', secondary: '#f9d85d' },
  space: { topic: '#7aa8ff', earth: '#00d4ff', light: '#f2f7ff', secondary: '#f9d85d' },
  fever: { topic: '#ff3030', earth: '#f9d85d', light: '#fff0dc', secondary: '#00d4ff' }
});

export function getTopicStoryTheme(layer = {}, requestedMode = '') {
  const mode = [requestedMode, ...(layer.modeTabs || [])].find(value => Object.hasOwn(TOPIC_THEMES, value)) || 'world';
  const palette = TOPIC_THEMES[mode];
  const accent = /^#[0-9a-f]{6}$/i.test(layer.color || '') ? layer.color : palette.topic;
  return { mode, ...palette, accent, background: '#071019', panel: '#141824', text: '#e8eaed', muted: '#9aa0a6' };
}

export function topicStoryThemeCss(theme) {
  return `:root { --topic:${theme.topic}; --earth:${theme.earth}; --title-light:${theme.light}; --line-b:${theme.secondary}; --layer-color:${theme.accent}; --bg:${theme.background}; --panel:${theme.panel}; --text-primary:${theme.text}; --text-secondary:${theme.muted}; --border:${theme.accent}33; }
    body { background:var(--bg); color:var(--text-primary); }
    a { color:var(--topic); }
    .topic-story-brand { background:linear-gradient(90deg,var(--topic),var(--title-light) 42%,var(--earth) 72%,var(--line-b)); background-clip:text; -webkit-background-clip:text; color:transparent; }
    .layer-item { border-bottom:1px solid var(--border); }
    .layer-header { display:flex; align-items:center; justify-content:space-between; padding:12px 6px 12px 8px; gap:16px; }
    .layer-info { display:flex; align-items:center; gap:16px; flex:1; }
    .layer-icon { width:32px; height:32px; border-radius:6px; display:flex; align-items:center; justify-content:center; color:var(--layer-color); }
    .layer-name { font-size:13px; color:var(--text-primary); }
    .news-item { display:flex; gap:12px; padding:8px 12px; margin:4px 0; background:#ffffff08; border-radius:4px; border-left:3px solid var(--layer-color); }
    .news-date { font-size:10px; color:var(--text-secondary); }`;
}
