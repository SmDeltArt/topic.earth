export function onlineSeverityRank(severity = '') {
  return { severe: 4, warning: 3, notable: 2, watch: 1, info: 0 }[String(severity || '').toLowerCase()] ?? 0;
}

export function onlineSeverityColor(severity = '') {
  const colors = {
    severe: '#ff2d55',
    warning: '#ff8f00',
    notable: '#ffd166',
    watch: '#4fc3f7',
    info: '#7dd3fc'
  };
  return colors[String(severity || '').toLowerCase()] || colors.info;
}

export function normalizeOnlineSignal(signal = {}) {
  const updatedAt = signal.updatedAt || new Date().toISOString();
  const severity = signal.severity || 'info';

  return {
    ...signal,
    date: signal.date || String(updatedAt).slice(0, 10),
    updatedAt,
    validFrom: signal.validFrom || updatedAt,
    validTo: signal.validTo || '',
    sourceType: signal.sourceType || 'database',
    confidence: signal.confidence || 'needs-review',
    reviewState: signal.reviewState || 'runtime',
    severity,
    markerColor: signal.markerColor || onlineSeverityColor(severity),
    markerPriority: signal.markerPriority ?? (50 + onlineSeverityRank(severity) * 10),
    onlineLayerSignal: true
  };
}

export function createOnlineSignalSnapshot({ id, layerId, sourceStatus = 'fallback', sourceUrl = '', sourceName = '', fetchedAt = new Date().toISOString(), signals = [] } = {}) {
  const points = signals
    .map(signal => normalizeOnlineSignal({ ...signal, category: signal.category || layerId }))
    .sort((a, b) => {
      const priorityDelta = (Number(b.markerPriority) || 0) - (Number(a.markerPriority) || 0);
      if (priorityDelta !== 0) return priorityDelta;
      return new Date(b.updatedAt || b.date || 0) - new Date(a.updatedAt || a.date || 0);
    });

  return {
    id,
    layerId,
    sourceStatus,
    sourceUrl,
    sourceName,
    fetchedAt,
    updatedAt: fetchedAt,
    points
  };
}
