// Browser workspace preferences, never authorization or published source data.
const KEY = 'topic-earth-local-workspace-v1';
const ids = value => Array.isArray(value) ? [...new Set(value.filter(id => typeof id === 'string' && id.length <= 200))].slice(0, 10000) : [];
export const LocalWorkspace = {
  read() {
    try {
      const value = JSON.parse(localStorage.getItem(KEY)) || {};
      return Object.fromEntries(['layers', 'topics', 'hiddenLayers', 'hiddenTopics'].map(key => [key, ids(value[key])]));
    } catch { return { layers: [], topics: [], hiddenLayers: [], hiddenTopics: [] }; }
  },
  save(value) { localStorage.setItem(KEY, JSON.stringify(value)); },
  sort(items, kind) {
    const ranks = new Map(this.read()[kind].map((id, index) => [id, index]));
    return [...items].sort((a, b) => (ranks.get(String(a.id)) ?? Infinity) - (ranks.get(String(b.id)) ?? Infinity));
  },
  move(kind, id, direction, siblings) {
    const value = this.read();
    const ordered = siblings.map(item => String(item.id));
    const from = ordered.indexOf(String(id)); const to = from + direction;
    if (from < 0 || to < 0 || to >= ordered.length || ![-1, 1].includes(direction)) return;
    [ordered[from], ordered[to]] = [ordered[to], ordered[from]];
    value[kind] = [...ordered, ...value[kind].filter(item => !ordered.includes(item))];
    this.save(value);
  },
  hide(kind, id) {
    const value = this.read(); const key = kind === 'layers' ? 'hiddenLayers' : 'hiddenTopics';
    value[key] = [...new Set([...value[key], String(id)])]; this.save(value);
  },
  visibleLayers(layers) {
    const hidden = new Set(this.read().hiddenLayers);
    // Removing a group locally also hides its descendants.
    for (let pass = 0; pass < layers.length; pass++) {
      let changed = false;
      for (const layer of layers) if (hidden.has(String(layer.parentLayerId)) && !hidden.has(String(layer.id))) {
        hidden.add(String(layer.id)); changed = true;
      }
      if (!changed) break;
    }
    return this.sort(layers.filter(layer => !hidden.has(String(layer.id))), 'layers');
  },
  visibleTopics(points, layers) {
    const hidden = new Set(this.read().hiddenTopics);
    const categories = new Set(layers.map(layer => String(layer.id)));
    return points.filter(point => !hidden.has(String(point.id)) && categories.has(String(point.category)));
  },
  reset() { localStorage.removeItem(KEY); }
};
