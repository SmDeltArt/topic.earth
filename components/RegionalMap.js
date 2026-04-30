import { Settings } from '../lib/settings.js';
import { LanguageManager } from '../lib/language.js?v=topic-earth-i18n-csv-20260428';

const EUROPE_BOUNDS = {
  minLat: 34,
  maxLat: 72,
  minLon: -25,
  maxLon: 45
};

const EUROPE_CENTER = [50.5, 10.5];
const LEAFLET_CSS_URL = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
const LEAFLET_JS_URL = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
const OSM_TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const NOMINATIM_SEARCH_URL = 'https://nominatim.openstreetmap.org/search';
const METEO_CLOUD_LAYER_ID = 'meteo-clouds';
const METEO_REALTIME_LAYER_ID = 'meteo-live';
const ROUTING_PROFILES = {
  bike: {
    endpoint: 'https://routing.openstreetmap.de/routed-bike',
    profile: 'bike'
  },
  foot: {
    endpoint: 'https://routing.openstreetmap.de/routed-foot',
    profile: 'foot'
  },
  driving: {
    endpoint: 'https://routing.openstreetmap.de/routed-car',
    profile: 'driving'
  }
};

const EXCLUDED_CATEGORIES = new Set([
  'space',
  'earths-fever',
  'tipping-points',
  'amoc-watch'
]);

const COUNTRY_FALLBACKS = {
  Belgium: { lat: 50.8503, lon: 4.3517 },
  France: { lat: 48.8566, lon: 2.3522 },
  Germany: { lat: 52.52, lon: 13.405 },
  Italy: { lat: 41.9028, lon: 12.4964 },
  Spain: { lat: 40.4168, lon: -3.7038 },
  Portugal: { lat: 38.7223, lon: -9.1393 },
  Netherlands: { lat: 52.3676, lon: 4.9041 },
  Luxembourg: { lat: 49.6116, lon: 6.1319 },
  Switzerland: { lat: 47.3769, lon: 8.5417 },
  Austria: { lat: 48.2082, lon: 16.3738 },
  Denmark: { lat: 55.6761, lon: 12.5683 },
  Sweden: { lat: 59.3293, lon: 18.0686 },
  Norway: { lat: 59.9139, lon: 10.7522 },
  Finland: { lat: 60.1699, lon: 24.9384 },
  Poland: { lat: 52.2297, lon: 21.0122 },
  Ireland: { lat: 53.3498, lon: -6.2603 },
  'United Kingdom': { lat: 51.5074, lon: -0.1278 },
  Greece: { lat: 37.9838, lon: 23.7275 }
};

export class RegionalMap {
  constructor(container, callbacks = {}) {
    this.container = container;
    this.callbacks = callbacks;
    this.visible = false;
    this.sourcePoints = [];
    this.points = [];
    this.layers = [];
    this.activeLayers = null;
    this.meteoOverlayLayer = null;
    this.meteoLegendControl = null;
    this.pendingView = null;
    this.markerByTopicId = new Map();
    this.activeTopicId = null;
    this.searchMarker = null;
    this.authorMode = 'drag';
    this.pathPoints = [];
    this.pathLayer = null;
    this.pathPointMarkers = [];
    this.draftPointMarker = null;
    this.draftPointContext = null;
    this.routePoints = [];
    this.routeMarkers = [];
    this.routeLayer = null;
    this.routeProfile = 'bike';
    this.routePreference = 'shortest';
    this.routeRequestId = 0;
    this.lastRouteRequestAt = 0;
    this.actionHistory = [];
    this.redoHistory = [];
    this.handleClick = this.handleClick.bind(this);
    this.handleChange = this.handleChange.bind(this);
    this.handleSearchSubmit = this.handleSearchSubmit.bind(this);
    this.handleDocumentClick = this.handleDocumentClick.bind(this);
    document.addEventListener('click', this.handleDocumentClick);
  }

  getCurrentLanguage() {
    const settings = Settings.get();
    const detectedLang = settings.detectedBrowserLanguage || LanguageManager.detectBrowserLanguage();
    return settings.autoDetectLanguage ? detectedLang : (settings.uiLanguage || detectedLang);
  }

  t(key, values = null) {
    const langCode = this.getCurrentLanguage();
    return values
      ? LanguageManager.formatLabel(key, langCode, values)
      : LanguageManager.getLabel(key, langCode);
  }

  show(points = [], layers = [], activeLayers = null, options = {}) {
    const shouldUpdateInPlace = !!options.preserveView && !!this.map && !!this.L && this.visible;
    const previousView = shouldUpdateInPlace ? this.getCurrentView() : null;
    this.layers = layers;
    this.activeLayers = activeLayers ? new Set(activeLayers) : null;
    this.sourcePoints = points;
    this.points = this.getRegionalPoints(points);
    this.pendingView = previousView;
    if (this.activeTopicId && !this.points.some(point => this.getTopicKey(point) === this.activeTopicId)) {
      this.activeTopicId = null;
    }
    this.ensureElement();

    if (shouldUpdateInPlace && this.refreshLeafletLayers(previousView)) {
      this.element.classList.remove('hidden');
      this.container.classList.add('regional-map-active');
      return;
    }

    this.destroyLeafletMap();
    this.render();
    this.element.classList.remove('hidden');
    this.container.classList.add('regional-map-active');
    this.visible = true;
    this.mountLeafletMap();
  }

  hide() {
    if (this.element) {
      this.element.classList.add('hidden');
    }
    document.body.classList.remove('regional-map-search-open');
    this.destroyLeafletMap();
    this.container.classList.remove('regional-map-active');
    this.visible = false;
  }

  ensureElement() {
    if (this.element) return;

    this.element = document.createElement('section');
    this.element.id = 'regional-map-view';
    this.element.className = 'regional-map-view hidden';
    this.element.setAttribute('aria-label', 'Regional 2D map');
    this.element.addEventListener('click', this.handleClick);
    this.element.addEventListener('change', this.handleChange);
    this.element.addEventListener('submit', this.handleSearchSubmit);
    this.container.appendChild(this.element);
  }

  render() {
    this.element.innerHTML = `
      <div class="regional-map-shell">
        <div class="regional-map-canvas" aria-label="${this.escapeHtml(this.t('auto.componentsRegionalmap.openstreetmapEuropeMapWithTopicPins'))}">
          ${this.renderSearchControl()}
          <div id="regional-leaflet-map" class="regional-leaflet-map"></div>
          <div id="regional-map-status" class="regional-map-status" aria-live="polite"></div>
          <div id="regional-map-fallback" class="regional-map-fallback hidden" role="img" aria-label="Fallback schematic Europe map with topic pins">
            ${this.renderEuropeSvg()}
            <div class="regional-map-pins">
              ${this.points.map((point, index) => this.renderPin(point, index)).join('')}
            </div>
          </div>
        </div>
      </div>
    `;
    this.updateToolButtons();
  }

  renderAuthorToolbar() {
    const tool = (mode, labelKey, icon) => `
      <button
        type="button"
        class="regional-map-tool ${this.authorMode === mode ? 'active' : ''}"
        data-regional-tool="${this.escapeHtml(mode)}"
      ><span aria-hidden="true">${this.escapeHtml(icon)}</span><span>${this.escapeHtml(this.t(labelKey))}</span></button>
    `;
    const routeProfile = (profile, labelKey, icon) => `
      <button
        type="button"
        class="regional-map-tool regional-map-tool-small ${this.routeProfile === profile ? 'active' : ''}"
        data-action="set-regional-route-profile"
        data-route-profile="${this.escapeHtml(profile)}"
      ><span aria-hidden="true">${this.escapeHtml(icon)}</span><span>${this.escapeHtml(this.t(labelKey))}</span></button>
    `;
    const routePreference = (preference, labelKey) => `
      <button
        type="button"
        class="regional-map-tool regional-map-tool-small ${this.routePreference === preference ? 'active' : ''}"
        data-action="set-regional-route-preference"
        data-route-preference="${this.escapeHtml(preference)}"
      >${this.escapeHtml(this.t(labelKey))}</button>
    `;

    return `
      <div class="regional-map-toolbar" role="toolbar" aria-label="${this.escapeHtml(this.t('regional.toolsLabel'))}">
        ${tool('drag', 'regional.toolDrag', '✋')}
        ${tool('point', 'regional.toolAddPoint', '📍')}
        ${tool('path', 'regional.toolTracePath', '〰️')}
        ${tool('route', 'regional.toolRoute', '🧭')}
        <button type="button" class="regional-map-tool" data-action="finish-regional-path">${this.escapeHtml(this.t('regional.toolFinishPath'))}</button>
        <button type="button" class="regional-map-tool ghost" data-action="undo-regional-tool"><span aria-hidden="true">↶</span><span>${this.escapeHtml(this.t('regional.toolUndo'))}</span></button>
        <button type="button" class="regional-map-tool ghost" data-action="redo-regional-tool"><span aria-hidden="true">↷</span><span>${this.escapeHtml(this.t('regional.toolRedo'))}</span></button>
        <button type="button" class="regional-map-tool ghost" data-action="clear-regional-path">${this.escapeHtml(this.t('regional.toolClearPath'))}</button>
      </div>
      <div class="regional-route-panel" aria-label="${this.escapeHtml(this.t('regional.routeOptions'))}">
        <div class="regional-route-row">
          <span class="regional-route-label">${this.escapeHtml(this.t('regional.routeProfile'))}</span>
          ${routeProfile('bike', 'regional.routeBike', '🚲')}
          ${routeProfile('foot', 'regional.routeWalk', '🚶')}
          ${routeProfile('driving', 'regional.routeRoad', '🚗')}
        </div>
        <div class="regional-route-row">
          <span class="regional-route-label">${this.escapeHtml(this.t('regional.routePreference'))}</span>
          ${routePreference('shortest', 'regional.routeShortest')}
          ${routePreference('fastest', 'regional.routeFastest')}
          <button type="button" class="regional-map-tool regional-map-tool-small ghost" data-action="clear-regional-route">${this.escapeHtml(this.t('regional.toolClearRoute'))}</button>
        </div>
        <div class="regional-route-hint">${this.escapeHtml(this.t('regional.routeHint'))}</div>
      </div>
    `;
  }

  async mountLeafletMap() {
    const mapElement = this.element?.querySelector('#regional-leaflet-map');
    if (!mapElement) return;

    try {
      this.setStatus('Loading OpenStreetMap tiles...', 'loading');
      const L = await this.ensureLeaflet();
      if (!this.visible || !this.element?.contains(mapElement)) return;

      this.map = L.map(mapElement, {
        zoomControl: true,
        scrollWheelZoom: true,
        attributionControl: true
      }).setView(EUROPE_CENTER, 4);
      this.L = L;
      this.addSearchToggleControl(L);
      this.map.on('click', (event) => this.handleMapAuthorClick(event));

      L.tileLayer(OSM_TILE_URL, {
        maxZoom: 18,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      }).addTo(this.map);

      this.addMeteoOverlay(L);
      this.markerLayer = L.layerGroup().addTo(this.map);
      this.points.forEach((point) => this.addLeafletMarker(L, point));

      setTimeout(() => this.map?.invalidateSize(), 50);
      if (this.pendingView) {
        this.restoreMapView(this.pendingView);
        this.pendingView = null;
      } else if (this.activeTopicId) {
        const activePoint = this.points.find(point => this.getTopicKey(point) === this.activeTopicId);
        if (activePoint) this.focusTopic(activePoint, { announce: false });
      } else {
        this.fitTopicBounds();
      }
      this.setStatus(`OpenStreetMap loaded with ${this.points.length} topic pin${this.points.length === 1 ? '' : 's'} from available coordinates.`, 'ready');
    } catch (error) {
      console.warn('[Regional Map] Leaflet map unavailable, using schematic fallback:', error);
      this.showFallbackMap('Map tiles unavailable. Showing approximate offline fallback.');
    }
  }

  ensureLeaflet() {
    if (window.L?.map) {
      return Promise.resolve(window.L);
    }

    if (window.__ourEarthLeafletPromise) {
      return window.__ourEarthLeafletPromise;
    }

    window.__ourEarthLeafletPromise = new Promise((resolve, reject) => {
      if (!document.getElementById('leaflet-css')) {
        const link = document.createElement('link');
        link.id = 'leaflet-css';
        link.rel = 'stylesheet';
        link.href = LEAFLET_CSS_URL;
        document.head.appendChild(link);
      }

      const script = document.createElement('script');
      script.id = 'leaflet-js';
      script.src = LEAFLET_JS_URL;
      script.async = true;
      script.onload = () => {
        if (window.L?.map) {
          resolve(window.L);
        } else {
          window.__ourEarthLeafletPromise = null;
          reject(new Error('Leaflet loaded, but the map API was not available.'));
        }
      };
      script.onerror = () => {
        window.__ourEarthLeafletPromise = null;
        reject(new Error('Could not load Leaflet from CDN.'));
      };
      document.head.appendChild(script);
    });

    return window.__ourEarthLeafletPromise;
  }

  addSearchToggleControl(L) {
    if (!this.map) return;

    const regionalMap = this;
    const SearchToggleControl = L.Control.extend({
      options: { position: 'topleft' },
      onAdd() {
        const wrapper = L.DomUtil.create('div', 'leaflet-bar regional-map-search-control');
        const button = L.DomUtil.create('button', 'regional-map-search-toggle', wrapper);
        button.type = 'button';
        button.textContent = regionalMap.t('topic.search');
        button.title = regionalMap.t('auto.componentsRegionalmap.openMapSearch');
        button.setAttribute('aria-expanded', 'false');
        button.setAttribute('aria-controls', 'regional-map-search-panel');

        L.DomEvent.disableClickPropagation(wrapper);
        L.DomEvent.disableScrollPropagation(wrapper);
        L.DomEvent.on(button, 'click', (event) => {
          L.DomEvent.stop(event);
          regionalMap.toggleSearchPanel(button);
        });

        regionalMap.searchToggleButton = button;
        return wrapper;
      }
    });

    this.searchControl = new SearchToggleControl();
    this.searchControl.addTo(this.map);
  }

  setAuthorMode(mode = 'drag') {
    this.authorMode = ['drag', 'point', 'path', 'route'].includes(mode) ? mode : 'drag';

    const messages = {
      drag: 'regional.dragStatus',
      point: 'regional.pointStatus',
      path: 'regional.pathStarted',
      route: this.routePoints.length ? 'regional.routePickEnd' : 'regional.routePickStart'
    };
    this.updateToolButtons();
    this.setStatus(this.t(messages[this.authorMode] || 'regional.dragStatus'), 'ready');
  }

  handleMapAuthorClick(event) {
    if (!event?.latlng || this.authorMode === 'drag') return;

    const lat = Number(event.latlng.lat);
    const lon = Number(event.latlng.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;

    if (this.authorMode === 'point') {
      this.placeDraftPoint(lat, lon);
      this.setAuthorMode('drag');
      return;
    }

    if (this.authorMode === 'path') {
      this.addPathPoint(lat, lon);
      return;
    }

    if (this.authorMode === 'route') {
      this.addRoutePoint(lat, lon);
    }
  }

  updateToolButtons() {
    if (!this.element) return;

    this.element.querySelectorAll('[data-regional-tool]').forEach((button) => {
      button.classList.toggle('active', button.dataset.regionalTool === this.authorMode);
    });
    this.element.querySelectorAll('[data-action="set-regional-route-profile"]').forEach((button) => {
      button.classList.toggle('active', button.dataset.routeProfile === this.routeProfile);
    });
    this.element.querySelectorAll('[data-action="set-regional-route-preference"]').forEach((button) => {
      button.classList.toggle('active', button.dataset.routePreference === this.routePreference);
    });

    const undoButton = this.element.querySelector('[data-action="undo-regional-tool"]');
    const redoButton = this.element.querySelector('[data-action="redo-regional-tool"]');
    if (undoButton) undoButton.disabled = this.actionHistory.length === 0;
    if (redoButton) redoButton.disabled = this.redoHistory.length === 0;
  }

  recordAction(action) {
    if (!action?.type) return;
    this.actionHistory.push(action);
    if (this.actionHistory.length > 80) {
      this.actionHistory.shift();
    }
    this.redoHistory = [];
    this.updateToolButtons();
  }

  undoLastAction() {
    const action = this.actionHistory.pop();
    if (!action) {
      this.setStatus(this.t('regional.noUndo'), 'fallback');
      this.updateToolButtons();
      return;
    }

    this.applyUndoAction(action);
    this.redoHistory.push(action);
    this.updateToolButtons();
  }

  redoLastAction() {
    const action = this.redoHistory.pop();
    if (!action) {
      this.setStatus(this.t('regional.noRedo'), 'fallback');
      this.updateToolButtons();
      return;
    }

    this.applyRedoAction(action);
    this.actionHistory.push(action);
    this.updateToolButtons();
  }

  applyUndoAction(action) {
    if (action.type === 'draft-point') {
      if (action.previous) {
        this.placeDraftPoint(action.previous.lat, action.previous.lon, { record: false });
      } else {
        this.clearDraftPoint({ silent: true });
        this.setStatus(this.t('regional.pointCleared'), 'ready');
      }
      return;
    }

    if (action.type === 'path-point') {
      this.removeLastPathPoint({ silent: true });
      this.setStatus(this.t('regional.actionUndone'), 'ready');
      return;
    }

    if (action.type === 'clear-path') {
      this.restorePath(action.points || []);
      this.setStatus(this.t('regional.actionUndone'), 'ready');
      return;
    }

    if (action.type === 'route-point') {
      this.removeLastRoutePoint({ silent: true });
      this.setStatus(this.t('regional.actionUndone'), 'ready');
      return;
    }

    if (action.type === 'clear-route') {
      this.restoreRoute(action.points || []);
      this.setStatus(this.t('regional.actionUndone'), 'ready');
    }
  }

  applyRedoAction(action) {
    if (action.type === 'draft-point') {
      this.placeDraftPoint(action.lat, action.lon, { record: false });
      return;
    }

    if (action.type === 'path-point') {
      this.addPathPoint(action.lat, action.lon, { record: false });
      return;
    }

    if (action.type === 'clear-path') {
      this.clearPath({ record: false });
      return;
    }

    if (action.type === 'route-point') {
      this.addRoutePoint(action.lat, action.lon, { record: false });
      return;
    }

    if (action.type === 'clear-route') {
      this.clearRoute({ record: false });
    }
  }

  placeDraftPoint(lat, lon, options = {}) {
    if (!this.map || !this.L) return false;
    const { record = true } = options;
    const previous = this.draftPointContext
      ? { lat: this.draftPointContext.lat, lon: this.draftPointContext.lon }
      : null;

    if (this.draftPointMarker) {
      this.draftPointMarker.remove();
      this.draftPointMarker = null;
    }

    const label = `Map point ${lat.toFixed(4)}, ${lon.toFixed(4)}`;
    this.draftPointContext = {
      lat,
      lon,
      label,
      source: 'map-point',
      precision: 'address',
      zoom: this.map.getZoom?.() || 13
    };

    this.draftPointMarker = this.L.circleMarker([lat, lon], {
      radius: 10,
      color: '#ffffff',
      weight: 2,
      fillColor: '#ffb74d',
      fillOpacity: 0.95
    }).addTo(this.map);

    this.draftPointMarker.bindPopup(`
      <div class="regional-draft-popup">
        <strong>${this.escapeHtml(this.t('regional.newPoint'))}</strong>
        <span>${lat.toFixed(5)}, ${lon.toFixed(5)}</span>
        <button type="button" data-action="regional-propose-location">${this.escapeHtml(this.t('regional.proposeHere'))}</button>
      </div>
    `).openPopup();

    this.notifyLocationFocus(this.draftPointContext);
    this.setStatus(this.t('regional.pointReady', { lat: lat.toFixed(4), lon: lon.toFixed(4) }), 'ready');
    if (record) {
      this.recordAction({ type: 'draft-point', lat, lon, previous });
    }
    this.updateToolButtons();
    return true;
  }

  clearDraftPoint(options = {}) {
    const { silent = false } = options;
    if (this.draftPointMarker) {
      this.draftPointMarker.remove();
      this.draftPointMarker = null;
    }
    this.draftPointContext = null;
    if (!silent) {
      this.setStatus(this.t('regional.pointCleared'), 'ready');
    }
    this.updateToolButtons();
  }

  addPathPoint(lat, lon, options = {}) {
    if (!this.map || !this.L) return false;
    const { record = true, silent = false } = options;

    this.pathPoints.push([lat, lon]);
    const marker = this.L.circleMarker([lat, lon], {
      radius: 5,
      color: '#0a0e1a',
      weight: 1.5,
      fillColor: '#66bb6a',
      fillOpacity: 1
    }).addTo(this.map);
    this.pathPointMarkers.push(marker);
    this.renderPathLayer();
    if (!silent) {
      this.setStatus(this.t('regional.pathPointAdded', { count: this.pathPoints.length }), 'ready');
    }
    if (record) {
      this.recordAction({ type: 'path-point', lat, lon });
    }
    this.updateToolButtons();
    return true;
  }

  removeLastPathPoint(options = {}) {
    const { silent = false } = options;
    const marker = this.pathPointMarkers.pop();
    marker?.remove?.();
    const point = this.pathPoints.pop();
    this.renderPathLayer();
    if (!silent) {
      const message = point
        ? this.t('regional.pathPointRemoved', { count: this.pathPoints.length })
        : this.t('regional.noUndo');
      this.setStatus(message, point ? 'ready' : 'fallback');
    }
    this.updateToolButtons();
    return point;
  }

  restorePath(points = []) {
    this.clearPath({ record: false, silent: true });
    points.forEach(([lat, lon]) => {
      this.addPathPoint(lat, lon, { record: false, silent: true });
    });
    this.renderPathLayer();
    this.updateToolButtons();
  }

  renderPathLayer() {
    if (!this.map || !this.L) return;

    if (this.pathLayer) {
      this.pathLayer.remove();
      this.pathLayer = null;
    }

    if (this.pathPoints.length < 2) return;

    this.pathLayer = this.L.polyline(this.pathPoints, {
      color: '#66bb6a',
      weight: 6,
      opacity: 0.9,
      lineCap: 'round',
      lineJoin: 'round',
      dashArray: '12 8',
      className: 'regional-highlight-path'
    }).addTo(this.map);
    this.pathLayer.bringToFront?.();
  }

  finishPath() {
    if (this.pathPoints.length < 2) {
      this.setStatus(this.t('regional.pathNeedTwo'), 'fallback');
      return;
    }

    this.renderPathLayer();
    this.setAuthorMode('drag');
    this.setStatus(this.t('regional.pathFinished', { count: this.pathPoints.length }), 'ready');
  }

  clearPath(options = {}) {
    const { record = false, silent = false } = options;
    const previousPoints = this.pathPoints.map(([lat, lon]) => [lat, lon]);
    if (this.pathLayer) {
      this.pathLayer.remove();
      this.pathLayer = null;
    }
    this.pathPointMarkers.forEach(marker => marker.remove?.());
    this.pathPointMarkers = [];
    this.pathPoints = [];
    if (record && previousPoints.length) {
      this.recordAction({ type: 'clear-path', points: previousPoints });
    }
    if (!silent) {
      this.setStatus(this.t('regional.pathCleared'), 'ready');
    }
    this.updateToolButtons();
  }

  addRoutePoint(lat, lon, options = {}) {
    if (!this.map || !this.L) return false;
    const { record = true, silent = false } = options;

    if (this.routePoints.length >= 2) {
      this.clearRoute({ record: false, silent: true });
    }

    const index = this.routePoints.length;
    this.routePoints.push([lat, lon]);
    const isStart = index === 0;
    const marker = this.L.circleMarker([lat, lon], {
      radius: 8,
      color: '#ffffff',
      weight: 2,
      fillColor: isStart ? '#00d4ff' : '#ffeb3b',
      fillOpacity: 0.98
    }).addTo(this.map);

    marker.bindTooltip(
      `<strong>${this.escapeHtml(this.t(isStart ? 'regional.routeStart' : 'regional.routeEnd'))}</strong><br><span>${lat.toFixed(4)}, ${lon.toFixed(4)}</span>`,
      { direction: 'top', opacity: 0.96, sticky: true }
    );
    this.routeMarkers.push(marker);

    if (record) {
      this.recordAction({ type: 'route-point', lat, lon });
    }

    if (this.routePoints.length === 1) {
      if (!silent) {
        this.setStatus(this.t('regional.routePickEnd'), 'ready');
      }
      this.updateToolButtons();
      return true;
    }

    this.buildRoute();
    this.updateToolButtons();
    return true;
  }

  removeLastRoutePoint(options = {}) {
    const { silent = false } = options;
    this.routeRequestId += 1;
    const marker = this.routeMarkers.pop();
    marker?.remove?.();
    const point = this.routePoints.pop();
    this.clearRouteLayer();

    if (!silent) {
      const key = this.routePoints.length ? 'regional.routePickEnd' : 'regional.routePickStart';
      this.setStatus(this.t(point ? key : 'regional.noUndo'), point ? 'ready' : 'fallback');
    }
    this.updateToolButtons();
    return point;
  }

  clearRoute(options = {}) {
    const { record = false, silent = false } = options;
    const previousPoints = this.routePoints.map(([lat, lon]) => [lat, lon]);
    this.routeRequestId += 1;
    this.clearRouteLayer();
    this.routeMarkers.forEach(marker => marker.remove?.());
    this.routeMarkers = [];
    this.routePoints = [];

    if (record && previousPoints.length) {
      this.recordAction({ type: 'clear-route', points: previousPoints });
    }
    if (!silent) {
      this.setStatus(this.t('regional.routeCleared'), 'ready');
    }
    this.updateToolButtons();
  }

  clearRouteLayer() {
    if (this.routeLayer) {
      this.routeLayer.remove();
      this.routeLayer = null;
    }
  }

  restoreRoute(points = []) {
    this.clearRoute({ record: false, silent: true });
    points.slice(0, 2).forEach(([lat, lon]) => {
      this.addRoutePoint(lat, lon, { record: false, silent: true });
    });
    if (this.routePoints.length < 2) {
      this.updateToolButtons();
    }
  }

  async buildRoute() {
    if (!this.map || !this.L || this.routePoints.length < 2) {
      return false;
    }

    const [start, end] = this.routePoints;
    const requestId = this.routeRequestId + 1;
    this.routeRequestId = requestId;
    this.clearRouteLayer();
    this.setStatus(this.t('regional.routeFetching'), 'loading');

    try {
      await this.waitForRouteSlot();
      if (requestId !== this.routeRequestId || this.routePoints.length < 2) {
        return false;
      }
      const route = await this.fetchRoute(start, end);
      if (requestId !== this.routeRequestId || this.routePoints.length < 2) {
        return false;
      }

      this.drawRoute(route.points, { fallback: false });
      const summary = this.formatRouteSummary(route);
      this.setStatus(this.t('regional.routeReady', summary), 'ready');
      return true;
    } catch (error) {
      console.warn('[Regional Map] Route service failed, drawing direct line:', error);
      if (requestId !== this.routeRequestId || this.routePoints.length < 2) {
        return false;
      }

      this.drawRoute([start, end], { fallback: true });
      this.setStatus(this.t('regional.routeFallback'), 'fallback');
      return false;
    }
  }

  async fetchRoute(start, end) {
    const profileConfig = ROUTING_PROFILES[this.routeProfile] || ROUTING_PROFILES.bike;
    const coordinates = `${start[1]},${start[0]};${end[1]},${end[0]}`;
    const url = new URL(`${profileConfig.endpoint}/route/v1/${profileConfig.profile}/${coordinates}`);
    url.searchParams.set('overview', 'full');
    url.searchParams.set('geometries', 'geojson');
    url.searchParams.set('alternatives', 'true');
    url.searchParams.set('steps', 'false');

    const response = await fetch(url.toString(), {
      headers: { Accept: 'application/json' }
    });

    if (!response.ok) {
      throw new Error(`Routing HTTP ${response.status}`);
    }

    const payload = await response.json();
    const routes = Array.isArray(payload?.routes) ? payload.routes : [];
    if (payload?.code !== 'Ok' || routes.length === 0) {
      throw new Error(payload?.code || 'No route returned');
    }

    const sortedRoutes = routes
      .filter(route => route?.geometry?.type === 'LineString' && Array.isArray(route.geometry.coordinates))
      .sort((a, b) => {
        const key = this.routePreference === 'fastest' ? 'duration' : 'distance';
        return (Number(a[key]) || Infinity) - (Number(b[key]) || Infinity);
      });
    const route = sortedRoutes[0];
    if (!route) {
      throw new Error('No drawable route returned');
    }

    return {
      distance: Number(route.distance) || 0,
      duration: Number(route.duration) || 0,
      points: route.geometry.coordinates.map(([lon, lat]) => [lat, lon])
    };
  }

  async waitForRouteSlot() {
    const elapsed = Date.now() - this.lastRouteRequestAt;
    const waitMs = Math.max(0, 1050 - elapsed);
    if (waitMs > 0) {
      await new Promise(resolve => setTimeout(resolve, waitMs));
    }
    this.lastRouteRequestAt = Date.now();
  }

  drawRoute(points = [], options = {}) {
    if (!this.map || !this.L || points.length < 2) return false;
    const { fallback = false } = options;
    this.clearRouteLayer();
    this.routeLayer = this.L.polyline(points, {
      color: fallback ? '#ffb74d' : '#00d4ff',
      weight: fallback ? 4 : 7,
      opacity: fallback ? 0.88 : 0.95,
      lineCap: 'round',
      lineJoin: 'round',
      dashArray: fallback ? '8 8' : null,
      className: fallback ? 'regional-route-direct' : 'regional-route-path'
    }).addTo(this.map);
    this.routeLayer.bringToFront?.();

    const bounds = this.L.latLngBounds(points);
    if (bounds.isValid?.()) {
      this.map.fitBounds(bounds, {
        animate: true,
        padding: [44, 44],
        maxZoom: 15
      });
    }
    return true;
  }

  formatRouteSummary(route = {}) {
    const distanceKm = Math.max(0, Number(route.distance) || 0) / 1000;
    const durationMinutes = Math.max(1, Math.round((Number(route.duration) || 0) / 60));
    return {
      distance: distanceKm >= 10 ? distanceKm.toFixed(0) : distanceKm.toFixed(1),
      duration: String(durationMinutes),
      mode: this.t(`regional.route${this.routeProfile === 'foot' ? 'Walk' : this.routeProfile === 'driving' ? 'Road' : 'Bike'}`)
    };
  }

  addLeafletMarker(L, point) {
    const color = this.getLayerColor(point.category);
    const topicId = this.getTopicKey(point);
    const title = point.title || 'Untitled topic';
    const location = [point.region, point.country].filter(Boolean).join(', ') || 'Approximate Europe';
    const isRealtimeMeteo = !!point.isRealtimeMeteo || point.category === 'meteo-live';
    const marker = L.circleMarker([point.lat, point.lon], {
      radius: isRealtimeMeteo ? 10 : 8,
      color: isRealtimeMeteo ? '#e0f7ff' : '#ffffff',
      weight: isRealtimeMeteo ? 2.25 : 1.5,
      fillColor: color,
      fillOpacity: isRealtimeMeteo ? 0.82 : 0.95
    });

    marker.bindTooltip(`
      <strong>${this.escapeHtml(title)}</strong><br>
      <span>${this.escapeHtml(location)}</span>
    `, {
      direction: 'top',
      opacity: 0.96,
      sticky: true
    });

    marker.on('click', () => {
      if (this.callbacks.onTopicSelect) {
        this.callbacks.onTopicSelect(point);
      }
    });

    marker.addTo(this.markerLayer);
    marker.__isRealtimeMeteo = isRealtimeMeteo;
    marker.__baseFillColor = color;
    marker.__baseFillOpacity = isRealtimeMeteo ? 0.82 : 0.95;
    marker.__baseOutlineColor = isRealtimeMeteo ? '#e0f7ff' : '#ffffff';
    marker.__baseWeight = isRealtimeMeteo ? 2.25 : 1.5;
    this.markerByTopicId.set(topicId, marker);
    this.styleLeafletMarker(marker, topicId === this.activeTopicId);
  }

  addMeteoOverlay(L) {
    const meteoPoints = this.getMeteoOverlayPoints();
    if (!this.map || meteoPoints.length === 0) return;

    if (!this.map.getPane('regionalMeteoPane')) {
      const pane = this.map.createPane('regionalMeteoPane');
      pane.style.zIndex = '380';
      pane.style.pointerEvents = 'none';
    }

    this.meteoOverlayLayer = L.layerGroup().addTo(this.map);

    meteoPoints.forEach((point) => {
      const meteo = point.meteo || {};
      const cloudCover = this.clamp(Number(meteo.cloudCover) || 0, 0, 100);
      const precipitation = Math.max(0, Number(meteo.precipitation) || 0);
      const windSpeed = Math.max(0, Number(meteo.windSpeed) || 0);
      const cloudOpacity = 0.07 + (cloudCover / 100) * 0.16;
      const cloudRadius = 110000 + cloudCover * 3200 + Math.min(windSpeed, 45) * 1400;
      const cloudColor = precipitation > 0.05 ? '#57a9c7' : '#6bb8c2';

      L.circle([point.lat, point.lon], {
        pane: 'regionalMeteoPane',
        radius: cloudRadius,
        color: cloudColor,
        weight: 1,
        opacity: 0.22,
        fillColor: cloudColor,
        fillOpacity: cloudOpacity,
        interactive: false,
        className: 'regional-meteo-cloud-field'
      }).addTo(this.meteoOverlayLayer);

      if (precipitation > 0.03) {
        L.circle([point.lat, point.lon], {
          pane: 'regionalMeteoPane',
          radius: 90000 + Math.min(precipitation, 3) * 85000,
          color: '#167fa7',
          weight: 1.5,
          opacity: 0.34,
          fillColor: '#0f75a4',
          fillOpacity: 0.14 + Math.min(precipitation, 2) * 0.06,
          interactive: false,
          className: 'regional-meteo-rain-field'
        }).addTo(this.meteoOverlayLayer);
      }
    });

    this.addMeteoLegendControl(L, meteoPoints);
  }

  addMeteoLegendControl(L, meteoPoints) {
    if (!this.map || meteoPoints.length === 0) return;

    const avgCloud = meteoPoints.reduce((sum, point) => sum + (Number(point.meteo?.cloudCover) || 0), 0) / meteoPoints.length;
    const wetCount = meteoPoints.filter(point => Number(point.meteo?.precipitation) > 0.03).length;
    const RegionalMeteoLegend = L.Control.extend({
      options: { position: 'bottomright' },
      onAdd() {
        const wrapper = L.DomUtil.create('div', 'regional-meteo-legend');
        wrapper.innerHTML = `
          <strong>Meteo surface</strong>
          <span><i class="cloud"></i>${Math.round(avgCloud)}% clouds avg</span>
          <span><i class="rain"></i>${wetCount} rain sample${wetCount === 1 ? '' : 's'}</span>
        `;
        L.DomEvent.disableClickPropagation(wrapper);
        L.DomEvent.disableScrollPropagation(wrapper);
        return wrapper;
      }
    });

    this.meteoLegendControl = new RegionalMeteoLegend();
    this.meteoLegendControl.addTo(this.map);
  }

  refreshLeafletLayers(previousView = null) {
    if (!this.map || !this.L) return false;

    this.clearDynamicLeafletLayers();
    this.addMeteoOverlay(this.L);
    this.markerLayer = this.L.layerGroup().addTo(this.map);
    this.points.forEach((point) => this.addLeafletMarker(this.L, point));
    this.renderFallbackPins();
    this.refreshSearchSuggestions();

    if (this.activeTopicId) {
      this.setActiveLeafletMarker(this.activeTopicId);
    }

    if (previousView) {
      this.restoreMapView(previousView);
    }

    this.setStatus(`OpenStreetMap updated with ${this.points.length} topic pin${this.points.length === 1 ? '' : 's'} from available coordinates.`, 'ready');
    return true;
  }

  clearDynamicLeafletLayers() {
    if (this.map && this.markerLayer) {
      this.map.removeLayer(this.markerLayer);
    }
    if (this.map && this.meteoOverlayLayer) {
      this.map.removeLayer(this.meteoOverlayLayer);
    }
    if (this.map && this.meteoLegendControl) {
      this.map.removeControl(this.meteoLegendControl);
    }

    this.markerLayer = null;
    this.meteoOverlayLayer = null;
    this.meteoLegendControl = null;
    this.markerByTopicId.clear();
  }

  showFallbackMap(message) {
    const fallback = this.element?.querySelector('#regional-map-fallback');
    const mapElement = this.element?.querySelector('#regional-leaflet-map');
    if (fallback) fallback.classList.remove('hidden');
    if (mapElement) mapElement.classList.add('hidden');
    this.setStatus(message, 'fallback');

    if (this.activeTopicId) {
      const activePoint = this.points.find(point => this.getTopicKey(point) === this.activeTopicId);
      if (activePoint) {
        this.focusFallbackCoordinate(activePoint.lat, activePoint.lon, { scale: 2.1 });
      }
    }
  }

  destroyLeafletMap() {
    document.body.classList.remove('regional-map-search-open');
    this.clearDynamicLeafletLayers();
    this.clearPath({ silent: true });
    this.clearRoute({ silent: true });
    this.clearDraftPoint({ silent: true });
    this.actionHistory = [];
    this.redoHistory = [];
    this.searchMarker = null;
    this.searchControl = null;
    this.searchToggleButton = null;
    if (this.map) {
      this.map.remove();
      this.map = null;
    }
    this.L = null;
  }

  fitTopicBounds() {
    if (!this.map || !this.L || this.points.length === 0) return false;

    const coordinates = this.getFitPoints()
      .filter(point => Number.isFinite(point.lat) && Number.isFinite(point.lon))
      .map(point => [point.lat, point.lon]);

    if (coordinates.length === 0) return false;

    if (coordinates.length === 1) {
      this.map.setView(coordinates[0], 8, { animate: false });
      return true;
    }

    this.map.fitBounds(this.L.latLngBounds(coordinates), {
      animate: false,
      padding: [64, 64],
      maxZoom: 7
    });
    return true;
  }

  getCurrentView() {
    if (!this.map?.getCenter || !this.map?.getZoom) return null;

    const center = this.map.getCenter();
    const zoom = this.map.getZoom();
    if (!center || !Number.isFinite(center.lat) || !Number.isFinite(center.lng) || !Number.isFinite(zoom)) return null;

    return { center: [center.lat, center.lng], zoom };
  }

  restoreMapView(view) {
    if (!this.map || !view?.center || !Number.isFinite(view.zoom)) return false;

    this.map.setView(view.center, view.zoom, { animate: false });
    return true;
  }

  getFitPoints() {
    const nonMeteoPoints = this.points.filter(point => !point.isRealtimeMeteo && point.category !== METEO_REALTIME_LAYER_ID);
    const europeanNonMeteo = nonMeteoPoints.filter(point => this.isInEurope(point));
    if (europeanNonMeteo.length) return europeanNonMeteo;

    const europeanPoints = this.points.filter(point => this.isInEurope(point));
    if (europeanPoints.length) return europeanPoints;

    return nonMeteoPoints.length ? nonMeteoPoints : this.points;
  }

  focusTopic(point, options = {}) {
    const target = this.findRegionalPoint(point) || this.ensureTopic(point);
    if (!target) return false;

    const topicId = this.getTopicKey(target);
    this.activeTopicId = topicId;
    this.updateFallbackPinFocus();
    this.setActiveLeafletMarker(topicId);

    const title = target.title || 'Selected topic';
    this.focusFallbackCoordinate(target.lat, target.lon, { scale: options.fallbackScale || 2.1 });

    if (this.map) {
      const currentZoom = typeof this.map.getZoom === 'function' ? this.map.getZoom() : 4;
      const zoom = Math.max(options.zoom || 8, currentZoom || 4);
      this.map.setView([target.lat, target.lon], zoom, { animate: true });

      const marker = this.markerByTopicId.get(topicId);
      marker?.openTooltip?.();

      if (options.announce !== false) {
        this.setStatus(`Focused regional map on ${title}.`, 'ready');
      }
    } else if (options.announce !== false) {
      this.setStatus(`Selected ${title}. Map will focus when it finishes loading.`, 'loading');
    }

    this.notifyLocationFocus({
      lat: target.lat,
      lon: target.lon,
      label: title,
      source: 'topic',
      precision: target.locationPrecision || 'region'
    });

    return true;
  }

  findRegionalPoint(point = {}) {
    const primaryKeys = [
      point.regionalMapId,
      point.id
    ].filter(value => value !== undefined && value !== null).map(String);
    const fallbackKeys = [
      point.originalTopicId
    ].filter(value => value !== undefined && value !== null).map(String);

    return this.points.find(item => primaryKeys.includes(this.getTopicKey(item)))
      || this.points.find(item => String(item.id) === String(point.id))
      || this.points.find(item => item.title && item.title === point.title)
      || this.points.find(item => fallbackKeys.includes(this.getTopicKey(item)));
  }

  ensureTopic(point = {}) {
    const regionalPoint = this.withFallbackCoordinates(point, this.points.length);
    if (!regionalPoint) return null;

    const topicId = this.getTopicKey(regionalPoint);
    if (!topicId) return null;

    const existingIndex = this.points.findIndex(item => this.getTopicKey(item) === topicId);
    if (existingIndex >= 0) {
      this.points[existingIndex] = {
        ...this.points[existingIndex],
        ...regionalPoint,
        forceRegionalPin: true
      };
    } else {
      this.points.push({
        ...regionalPoint,
        forceRegionalPin: true
      });
    }

    const target = this.points.find(item => this.getTopicKey(item) === topicId);
    this.upsertLeafletMarker(target);
    this.renderFallbackPins();
    this.refreshSearchSuggestions();
    return target;
  }

  getTopicKey(point = {}) {
    return String(point.regionalMapId ?? point.id ?? point.title ?? '');
  }

  upsertLeafletMarker(point) {
    if (!point || !this.map || !this.L || !this.markerLayer) return;

    const topicId = this.getTopicKey(point);
    const marker = this.markerByTopicId.get(topicId);
    if (marker?.setLatLng) {
      marker.setLatLng([point.lat, point.lon]);
      marker.__baseFillColor = this.getLayerColor(point.category);
      return;
    }

    this.addLeafletMarker(this.L, point);
  }

  renderFallbackPins() {
    const pinLayer = this.element?.querySelector('.regional-map-pins');
    if (!pinLayer) return;

    pinLayer.innerHTML = this.points.map((point, index) => this.renderPin(point, index)).join('');
    this.updateFallbackPinFocus();
  }

  refreshSearchSuggestions() {
    const suggestions = this.element?.querySelector('#regional-topic-suggestions');
    if (!suggestions) return;

    suggestions.innerHTML = this.renderTopicSuggestionOptions();
  }

  setActiveLeafletMarker(topicId) {
    this.markerByTopicId.forEach((marker, key) => {
      this.styleLeafletMarker(marker, key === topicId);
    });
  }

  styleLeafletMarker(marker, isActive = false) {
    if (!marker?.setStyle) return;

    const baseRadius = marker.__isRealtimeMeteo ? 10 : 8;
    const baseWeight = marker.__baseWeight || 1.5;
    marker.setStyle({
      radius: isActive ? baseRadius + 4 : baseRadius,
      color: marker.__baseOutlineColor || '#ffffff',
      weight: isActive ? baseWeight + 1.25 : baseWeight,
      fillColor: isActive ? '#ffeb3b' : (marker.__baseFillColor || '#00d4ff'),
      fillOpacity: isActive ? 1 : (marker.__baseFillOpacity || 0.95)
    });

    if (isActive) {
      marker.bringToFront?.();
    }
  }

  updateFallbackPinFocus() {
    if (!this.element) return;

    const fallbackVisible = !this.element.querySelector('#regional-map-fallback')?.classList.contains('hidden');
    this.element.querySelectorAll('.regional-map-pin').forEach((pin) => {
      const isActive = pin.dataset.topicId === this.activeTopicId;
      pin.classList.toggle('active', isActive);
      if (isActive) {
        pin.setAttribute('aria-current', 'true');
        if (fallbackVisible) {
          pin.focus?.({ preventScroll: true });
        }
      } else {
        pin.removeAttribute('aria-current');
      }
    });
  }

  focusFallbackCoordinate(lat, lon, options = {}) {
    const fallback = this.element?.querySelector('#regional-map-fallback');
    if (!fallback) return false;

    const bounds = fallback.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return false;

    const position = this.project(lat, lon);
    const scale = options.scale || 2;
    const targetX = (position.x / 100) * bounds.width;
    const targetY = (position.y / 100) * bounds.height;
    const minX = bounds.width * (1 - scale);
    const minY = bounds.height * (1 - scale);
    const translateX = Math.min(0, Math.max(minX, (bounds.width / 2) - (targetX * scale)));
    const translateY = Math.min(0, Math.max(minY, (bounds.height / 2) - (targetY * scale)));

    fallback.style.transformOrigin = '0 0';
    fallback.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`;
    fallback.dataset.focused = 'true';
    return true;
  }

  setStatus(message, state = 'loading') {
    const status = this.element?.querySelector('#regional-map-status');
    if (!status) return;
    status.textContent = message;
    status.className = `regional-map-status ${state}`;
  }

  renderSearchControl() {
    return `
      <form id="regional-map-search-panel" class="regional-map-search hidden" data-regional-map-search>
        <label for="regional-map-search-input">${this.escapeHtml(this.t('map.search'))}</label>
        <div class="regional-map-search-row">
          <input
            id="regional-map-search-input"
            type="search"
            name="regionalMapSearch"
            list="regional-topic-suggestions"
            autocomplete="off"
            placeholder="${this.escapeHtml(this.t('auto.componentsRegionalmap.topicAddressCityOr50854'))}"
          >
          <button type="submit">${this.escapeHtml(this.t('auto.componentsRegionalmap.find'))}</button>
        </div>
        <datalist id="regional-topic-suggestions">${this.renderTopicSuggestionOptions()}</datalist>
        <div id="regional-map-search-feedback" class="regional-map-search-feedback" aria-live="polite"></div>
        ${this.renderAuthorToolbar()}
      </form>
    `;
  }

  toggleSearchPanel(button) {
    const panel = this.element?.querySelector('#regional-map-search-panel');
    if (!panel) return;

    const willOpen = panel.classList.contains('hidden');
    if (!willOpen) {
      this.closeSearchPanel();
      return;
    }

    panel.classList.remove('hidden');
    document.body.classList.add('regional-map-search-open');
    button?.classList.toggle('active', true);
    button?.setAttribute('aria-expanded', 'true');

    if (willOpen) {
      panel.querySelector('#regional-map-search-input')?.focus();
    }
  }

  closeSearchPanel() {
    const panel = this.element?.querySelector('#regional-map-search-panel');
    if (!panel || panel.classList.contains('hidden')) return;

    panel.classList.add('hidden');
    document.body.classList.remove('regional-map-search-open');
    this.searchToggleButton?.classList.remove('active');
    this.searchToggleButton?.setAttribute('aria-expanded', 'false');
  }

  handleDocumentClick(event) {
    if (!this.visible || !this.element) return;

    const panel = this.element.querySelector('#regional-map-search-panel');
    if (!panel || panel.classList.contains('hidden')) return;

    const target = event.target;
    if (!(target instanceof Element)) return;
    if (panel.contains(target) || target.closest('.regional-map-search-toggle')) return;

    this.closeSearchPanel();
  }

  renderTopicSuggestionOptions() {
    return this.points
      .slice()
      .sort((a, b) => String(a.title || '').localeCompare(String(b.title || '')))
      .slice(0, 80)
      .map((point) => {
        const title = this.escapeHtml(point.title || 'Untitled topic');
        const location = this.escapeHtml([point.region, point.country].filter(Boolean).join(', '));
        return `<option value="${title}">${location}</option>`;
      })
      .join('');
  }

  async handleSearchSubmit(event) {
    const form = event.target.closest('[data-regional-map-search]');
    if (!form) return;

    event.preventDefault();
    const input = form.querySelector('#regional-map-search-input');
    const query = input?.value?.trim();
    if (!query) {
      this.setSearchFeedback('Type a topic, address, city, or coordinates.');
      return;
    }

    const topic = this.findTopicByQuery(query);
    if (topic) {
      this.focusTopic(topic, { zoom: 9 });
      this.setSearchFeedback(`Found topic: ${topic.title || 'Untitled topic'}.`);
      if (this.callbacks.onTopicSelect) {
        this.callbacks.onTopicSelect(topic);
      }
      return;
    }

    const coordinate = this.parseCoordinateQuery(query);
    if (coordinate) {
      this.focusCoordinate(coordinate.lat, coordinate.lon, `Coordinates ${coordinate.lat.toFixed(4)}, ${coordinate.lon.toFixed(4)}`, {
        source: 'manual-coordinates',
        precision: 'address'
      });
      this.setSearchFeedback('Moved map to coordinates.');
      return;
    }

    await this.searchAddress(query);
  }

  findTopicByQuery(query = '') {
    const needle = query.toLowerCase();
    const normalize = (value = '') => String(value).toLowerCase();

    return this.points.find(point => normalize(point.title) === needle)
      || this.points.find(point => normalize(point.title).includes(needle))
      || this.points.find(point => [point.region, point.country].some(value => normalize(value).includes(needle)));
  }

  parseCoordinateQuery(query = '') {
    const match = query.match(/^\s*(-?\d+(?:\.\d+)?)\s*[,;\s]\s*(-?\d+(?:\.\d+)?)\s*$/);
    if (!match) return null;

    const lat = Number(match[1]);
    const lon = Number(match[2]);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
    if (lat < -90 || lat > 90 || lon < -180 || lon > 180) return null;

    return { lat, lon };
  }

  async searchAddress(query) {
    this.setSearchFeedback('Searching OpenStreetMap...');

    try {
      const url = new URL(NOMINATIM_SEARCH_URL);
      url.searchParams.set('format', 'jsonv2');
      url.searchParams.set('limit', '1');
      url.searchParams.set('addressdetails', '1');
      url.searchParams.set('q', query);
      const response = await fetch(url.toString(), {
        headers: { Accept: 'application/json' }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const results = await response.json();
      const result = Array.isArray(results) ? results[0] : null;
      if (!result) {
        this.setSearchFeedback('No address match found. Try a city, country, or coordinates.');
        return;
      }

      const lat = Number(result.lat);
      const lon = Number(result.lon);
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
        this.setSearchFeedback('The address result did not include usable coordinates.');
        return;
      }

      const label = result.display_name || query;
      this.focusCoordinate(lat, lon, label, {
        source: 'search',
        precision: this.resolveSearchPrecision(result)
      });
      this.setSearchFeedback(`Moved map to ${label}.`);
    } catch (error) {
      console.warn('[Regional Map] Address search failed:', error);
      this.setSearchFeedback('Address search is unavailable. Try a topic name or coordinates.');
    }
  }

  focusCoordinate(lat, lon, label = 'Search result', options = {}) {
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      return false;
    }

    if (!this.map || !this.L) {
      return this.focusCoordinateFallback(lat, lon, label, options);
    }

    const zoom = Number.isFinite(options.zoom) ? options.zoom : 11;
    this.map.setView([lat, lon], zoom, { animate: true });

    if (this.searchMarker) {
      this.searchMarker.remove();
      this.searchMarker = null;
    }

    this.searchMarker = this.L.circleMarker([lat, lon], {
      radius: 10,
      color: '#ffffff',
      weight: 2,
      fillColor: '#6fdc8c',
      fillOpacity: 0.95
    }).addTo(this.map);

    this.searchMarker.bindTooltip(`
      <strong>${this.escapeHtml(label)}</strong><br>
      <span>${lat.toFixed(4)}, ${lon.toFixed(4)}</span>
    `, {
      direction: 'top',
      opacity: 0.96,
      sticky: true
    }).openTooltip();

    this.setStatus(`Moved regional map to ${label}.`, 'ready');
    this.notifyLocationFocus({
      ...options,
      lat,
      lon,
      label,
      source: options.source || 'search',
      precision: options.precision || 'region'
    });
    return true;
  }

  focusCoordinateFallback(lat, lon, label = 'Search result', options = {}) {
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return false;

    const moved = this.focusFallbackCoordinate(lat, lon, { scale: 2.1 });
    if (moved) {
      this.setStatus(`Moved fallback regional map to ${label}.`, 'ready');
      this.notifyLocationFocus({
        ...options,
        lat,
        lon,
        label,
        source: options.source || 'search',
        precision: options.precision || 'region'
      });
    }
    return moved;
  }

  resolveSearchPrecision(result = {}) {
    const precisionSource = String(result.addresstype || result.type || '').toLowerCase();
    if (!precisionSource) return 'region';
    if (precisionSource.includes('country') || precisionSource.includes('continent')) return 'country';
    if (precisionSource.includes('state') || precisionSource.includes('province') || precisionSource.includes('region')) return 'region';
    if (precisionSource.includes('city') || precisionSource.includes('town') || precisionSource.includes('village') || precisionSource.includes('municipality')) return 'city';
    if (precisionSource.includes('house') || precisionSource.includes('building') || precisionSource.includes('street') || precisionSource.includes('road')) return 'address';
    return 'region';
  }

  notifyLocationFocus(context = {}) {
    if (!this.callbacks.onLocationFocus) return;
    this.callbacks.onLocationFocus(context);
  }

  setSearchFeedback(message = '') {
    const feedback = this.element?.querySelector('#regional-map-search-feedback');
    if (feedback) {
      feedback.textContent = message;
    }
  }

  renderEuropeSvg() {
    return `
      <svg class="regional-map-svg" viewBox="0 0 1000 640" preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <radialGradient id="regionalSeaGlow" cx="50%" cy="48%" r="70%">
            <stop offset="0%" stop-color="rgba(0, 212, 255, 0.20)" />
            <stop offset="60%" stop-color="rgba(0, 70, 120, 0.10)" />
            <stop offset="100%" stop-color="rgba(2, 8, 20, 0.70)" />
          </radialGradient>
          <linearGradient id="regionalLand" x1="0%" x2="100%" y1="0%" y2="100%">
            <stop offset="0%" stop-color="rgba(111, 220, 140, 0.40)" />
            <stop offset="60%" stop-color="rgba(0, 212, 255, 0.18)" />
            <stop offset="100%" stop-color="rgba(255, 183, 77, 0.22)" />
          </linearGradient>
        </defs>
        <rect width="1000" height="640" fill="url(#regionalSeaGlow)" />
        <g class="regional-map-grid">
          <path d="M0 120H1000M0 240H1000M0 360H1000M0 480H1000" />
          <path d="M140 0V640M300 0V640M460 0V640M620 0V640M780 0V640M940 0V640" />
        </g>
        <path class="regional-landmass" d="M255 154 C310 96 420 82 512 118 C575 142 615 122 688 132 C790 146 876 214 868 292 C861 358 784 382 743 430 C703 477 726 536 662 559 C589 586 534 531 471 523 C403 514 358 576 294 539 C230 501 266 436 229 392 C190 346 124 342 128 276 C132 213 204 210 255 154Z" />
        <path class="regional-landmass island" d="M207 205 C238 177 280 186 294 223 C306 258 276 289 244 286 C204 282 177 233 207 205Z" />
        <path class="regional-landmass island" d="M341 421 C382 383 451 397 469 453 C485 503 439 548 391 533 C343 518 306 455 341 421Z" />
        <path class="regional-landmass island" d="M576 418 C616 392 674 424 669 475 C664 527 591 536 565 491 C550 465 550 435 576 418Z" />
        <path class="regional-landmass island" d="M714 462 C752 438 800 456 808 498 C815 535 769 568 731 548 C697 530 683 482 714 462Z" />
        <text x="190" y="170">UK / Ireland</text>
        <text x="390" y="230">France</text>
        <text x="545" y="210">Germany</text>
        <text x="608" y="330">Italy</text>
        <text x="348" y="462">Spain</text>
        <text x="642" y="110">Nordic</text>
        <text x="720" y="300">East EU</text>
      </svg>
    `;
  }

  renderPin(point, index) {
    const position = this.project(point.lat, point.lon);
    const color = this.getLayerColor(point.category);
    const title = this.escapeHtml(point.title || 'Untitled topic');
    const location = this.escapeHtml([point.region, point.country].filter(Boolean).join(', ') || 'Approximate Europe');
    const rawId = this.getTopicKey(point) || String(index);
    const id = this.escapeHtml(rawId);
    const activeClass = rawId === this.activeTopicId ? ' active' : '';

    return `
      <button
        class="regional-map-pin${activeClass}"
        type="button"
        data-topic-id="${id}"
        ${rawId === this.activeTopicId ? 'aria-current="true"' : ''}
        style="left:${position.x}%; top:${position.y}%; --pin-color:${this.escapeHtml(color)}"
        title="${title}"
      >
        <span class="regional-map-pin-dot"></span>
        <span class="regional-map-pin-label">
          <strong>${title}</strong>
          <small>${location}</small>
        </span>
      </button>
    `;
  }

  handleClick(event) {
    const toolButton = event.target.closest('[data-regional-tool]');
    if (toolButton) {
      this.setAuthorMode(toolButton.dataset.regionalTool);
      return;
    }

    const actionButton = event.target.closest('[data-action]');
    if (actionButton?.dataset.action === 'finish-regional-path') {
      this.finishPath();
      return;
    }
    if (actionButton?.dataset.action === 'clear-regional-path') {
      this.clearPath({ record: true });
      return;
    }
    if (actionButton?.dataset.action === 'undo-regional-tool') {
      this.undoLastAction();
      return;
    }
    if (actionButton?.dataset.action === 'redo-regional-tool') {
      this.redoLastAction();
      return;
    }
    if (actionButton?.dataset.action === 'set-regional-route-profile') {
      this.setRouteProfile(actionButton.dataset.routeProfile);
      return;
    }
    if (actionButton?.dataset.action === 'set-regional-route-preference') {
      this.setRoutePreference(actionButton.dataset.routePreference);
      return;
    }
    if (actionButton?.dataset.action === 'clear-regional-route') {
      this.clearRoute({ record: true });
      return;
    }
    if (actionButton?.dataset.action === 'regional-propose-location') {
      if (this.draftPointContext && this.callbacks.onMapPointDraft) {
        this.callbacks.onMapPointDraft(this.draftPointContext);
      }
      return;
    }

    const searchToggle = event.target.closest('[data-action="toggle-regional-map-search"]');
    if (searchToggle) {
      this.toggleSearchPanel(searchToggle);
      return;
    }

    const pin = event.target.closest('[data-topic-id]');
    if (!pin) return;

    const point = this.points.find(item => this.getTopicKey(item) === String(pin.dataset.topicId));
    if (point && this.callbacks.onTopicSelect) {
      this.callbacks.onTopicSelect(point);
    }
  }

  handleChange(event) {
    const target = event.target;
    if (!(target instanceof HTMLSelectElement)) return;

    if (target.dataset.action === 'set-regional-route-profile') {
      this.setRouteProfile(target.value);
      return;
    }

    if (target.dataset.action === 'set-regional-route-preference') {
      this.setRoutePreference(target.value);
    }
  }

  setRouteProfile(profile = 'bike') {
    if (!ROUTING_PROFILES[profile]) return;
    this.routeProfile = profile;
    this.updateToolButtons();
    if (this.routePoints.length >= 2) {
      this.buildRoute();
    } else if (this.authorMode === 'route') {
      this.setStatus(this.t(this.routePoints.length ? 'regional.routePickEnd' : 'regional.routePickStart'), 'ready');
    }
  }

  setRoutePreference(preference = 'shortest') {
    this.routePreference = preference === 'fastest' ? 'fastest' : 'shortest';
    this.updateToolButtons();
    if (this.routePoints.length >= 2) {
      this.buildRoute();
    } else if (this.authorMode === 'route') {
      this.setStatus(this.t(this.routePoints.length ? 'regional.routePickEnd' : 'regional.routePickStart'), 'ready');
    }
  }

  getRegionalPoints(points) {
    return points
      .map((point, index) => this.withFallbackCoordinates(point, index))
      .filter(point => point && !this.isExcluded(point) && this.isActiveLayer(point));
  }

  getMeteoOverlayPoints() {
    if (!this.shouldShowMeteoOverlay()) return [];

    return this.sourcePoints
      .map((point, index) => this.withFallbackCoordinates(point, index))
      .filter(point => point && !this.isExcluded(point) && (point.isRealtimeMeteo || point.category === METEO_REALTIME_LAYER_ID));
  }

  shouldShowMeteoOverlay() {
    if (!this.activeLayers) return true;
    return this.activeLayers.has(METEO_CLOUD_LAYER_ID) || this.activeLayers.has(METEO_REALTIME_LAYER_ID);
  }

  clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  withFallbackCoordinates(point, index) {
    const lat = Number(point.lat);
    const lon = Number(point.lon);
    const regionalMapId = String(point.id ?? `regional-${index}`);

    if (Number.isFinite(lat) && Number.isFinite(lon)) {
      return { ...point, lat, lon, regionalMapId };
    }

    const fallback = COUNTRY_FALLBACKS[point.country];
    if (!fallback) return null;

    return {
      ...point,
      lat: fallback.lat,
      lon: fallback.lon,
      regionalMapId,
      locationPrecision: point.locationPrecision || 'country'
    };
  }

  isExcluded(point) {
    return EXCLUDED_CATEGORIES.has(point.category)
      || point.isFeverWarning
      || point.isTippingPoint
      || point.isAMOC
      || point.isPlanet;
  }

  isActiveLayer(point) {
    return !this.activeLayers || this.activeLayers.has(point.category);
  }

  isInEurope(point) {
    return point.lat >= EUROPE_BOUNDS.minLat
      && point.lat <= EUROPE_BOUNDS.maxLat
      && point.lon >= EUROPE_BOUNDS.minLon
      && point.lon <= EUROPE_BOUNDS.maxLon;
  }

  project(lat, lon) {
    const x = ((lon - EUROPE_BOUNDS.minLon) / (EUROPE_BOUNDS.maxLon - EUROPE_BOUNDS.minLon)) * 100;
    const y = 100 - (((lat - EUROPE_BOUNDS.minLat) / (EUROPE_BOUNDS.maxLat - EUROPE_BOUNDS.minLat)) * 100);

    return {
      x: Math.min(96, Math.max(4, x)),
      y: Math.min(92, Math.max(8, y))
    };
  }

  getLayerColor(category) {
    return this.layers.find(layer => layer.id === category)?.color || '#00d4ff';
  }

  getCategorySummary() {
    const counts = new Map();

    this.points.forEach(point => {
      const layer = this.layers.find(item => item.id === point.category);
      const label = layer?.name || point.category || 'Topic';
      const color = layer?.color || '#00d4ff';
      const current = counts.get(label) || { label, color, count: 0 };
      current.count += 1;
      counts.set(label, current);
    });

    return Array.from(counts.values()).sort((a, b) => b.count - a.count);
  }

  escapeHtml(value = '') {
    return String(value).replace(/[&<>"']/g, (char) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    }[char]));
  }
}
