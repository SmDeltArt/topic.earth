/**
 * Layer control panel component
 * Manages data layer toggles and news items
 */
import { Settings } from '../lib/settings.js';
import { AppAccess } from '../lib/capabilities.js?v=topic-earth-access-shortcuts-20260517';
import { LanguageManager } from '../lib/language.js?v=topic-earth-tab-layers-20260507';

const REGIONAL_GROUP_ID = 'regional-live';

export class LayerPanel {
  constructor(container, layers, points, callbacks = {}) {
    this.container = container;
    this.layers = layers;
    this.points = points;
    this.callbacks = callbacks;
    this.activeLayers = new Set(layers.filter(layer => layer.enabled && !layer.isGroup).map(layer => layer.id));
    this.knownLayerIds = new Set(layers.map(layer => layer.id));
    this.isCollapsed = false;
    this.isClosed = false;
    this.expandedLayers = new Set(layers.filter(layer => layer.defaultExpanded).map(layer => layer.id));
    this.layerFilter = 'main';
    this.regionalContext = null;

    this.handleClick = this.handleClick.bind(this);
    this.handleSettingsChanged = this.handleSettingsChanged.bind(this);
    this.handleRegionalContextChanged = this.handleRegionalContextChanged.bind(this);

    this.render();
    this.attachEventListeners();

    window.addEventListener('layerFilterChanged', (e) => {
      const previousFilter = this.layerFilter;
      this.layerFilter = this.normalizeLayerFilter(e.detail.filter);
      this.preparePanelForFilter(this.layerFilter, previousFilter);
      this.updateData(this.layers, this.points);
    });

    window.addEventListener('settingsChanged', this.handleSettingsChanged);
    window.addEventListener('regionalContextChanged', this.handleRegionalContextChanged);
  }

  handleSettingsChanged() {
    this.updateData(this.layers, this.points);
  }

  handleRegionalContextChanged(event) {
    this.regionalContext = event?.detail?.context || null;
    this.updateData(this.layers, this.points);
  }

  preparePanelForFilter(filter = 'main', previousFilter = this.layerFilter) {
    if (previousFilter !== filter && this.isCollapsed) {
      this.setCollapsed(false);
    }

    if (filter === 'regional') {
      [
        'regional-news',
        'community-projects',
        'bike-ways',
        'ev-charging',
        'hydrogen-charging'
      ].forEach(layerId => {
        if (this.getLayerById(layerId)) this.expandedLayers.add(layerId);
      });
    } else if (filter === 'space') {
      this.expandedLayers.add('space');
    } else if (filter === 'fever') {
      ['earths-fever', 'fever-scenarios', 'tipping-points', 'amoc-watch'].forEach(layerId => {
        if (this.getLayerById(layerId)) this.expandedLayers.add(layerId);
      });
    }
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

  render() {
    this.container.innerHTML = '';
    const collapseBtn = this.createCollapseButton();
    const header = this.createHeader();
    const feverMessageDiv = this.createFeverMessageDiv();
    const controls = this.createLayerControls();

    this.container.appendChild(collapseBtn);
    this.container.appendChild(this.createCloseButton());
    this.container.appendChild(this.createReopenButton());
    this.container.appendChild(header);
    this.container.appendChild(feverMessageDiv);
    this.container.appendChild(controls);
  }

  createFeverMessageDiv() {
    const div = document.createElement('div');
    div.id = 'fever-message-panel';
    div.className = 'fever-message-panel hidden';
    return div;
  }

  createCollapseButton() {
    const btn = document.createElement('button');
    btn.className = 'panel-collapse-btn';
    btn.innerHTML = '&#9664;';
    btn.dataset.action = 'collapse';
    btn.title = 'Collapse layer panel';
    btn.setAttribute('aria-label', 'Collapse layer panel');
    return btn;
  }

  createCloseButton() {
    const btn = document.createElement('button');
    btn.className = 'panel-close-btn';
    btn.innerHTML = '&times;';
    btn.dataset.action = 'close-panel';
    btn.title = 'Close layer panel';
    btn.setAttribute('aria-label', 'Close layer panel');
    return btn;
  }

  createReopenButton() {
    const btn = document.createElement('button');
    btn.className = 'panel-reopen-btn';
    btn.innerHTML = '&#9776;';
    btn.dataset.action = 'reopen-panel';
    btn.title = 'Show data layers';
    btn.setAttribute('aria-label', 'Show data layers');
    return btn;
  }

  createHeader() {
    const header = document.createElement('div');
    header.className = 'panel-header';
    header.textContent = this.t('topic.dataLayers');
    return header;
  }

  createLayerControls() {
    const wrapper = document.createElement('div');
    wrapper.id = 'layer-controls-wrapper';

    const container = document.createElement('div');
    container.id = 'layer-controls';

    const inFeverMode = window.currentGlobe && window.currentGlobe.inFeverMode;
    const filteredLayers = this.getFilteredLayers();

    filteredLayers.forEach(layer => {
      if (layer.feverOnly && !inFeverMode) {
        return;
      }

      const item = this.createLayerItem(layer);
      container.appendChild(item);
    });

    const actionButtons = this.createActionButtons();
    container.appendChild(actionButtons);

    wrapper.appendChild(container);
    return wrapper;
  }

  getFilteredLayers() {
    const topLevelLayers = this.layers.filter(layer => !layer.parentLayerId);
    return topLevelLayers.filter(layer => this.layerBelongsToFilter(layer, this.layerFilter));
  }

  getLayerModeTabs(layer) {
    if (!layer) return ['main'];
    if (Array.isArray(layer.modeTabs) && layer.modeTabs.length > 0) {
      return layer.modeTabs;
    }
    if (layer.feverOnly) return ['fever'];
    if (layer.id === 'space') return ['space'];
    if (layer.id === REGIONAL_GROUP_ID || layer.parentLayerId === REGIONAL_GROUP_ID) return ['regional'];
    return ['main'];
  }

  normalizeLayerFilter(filter = 'main') {
    return filter === 'world' ? 'main' : (filter || 'main');
  }

  layerBelongsToFilter(layer, filter = 'main') {
    if (!layer) return false;
    const normalizedFilter = this.normalizeLayerFilter(filter);
    if (this.isLayerGroup(layer)) {
      return this.getDescendantLeafLayers(layer)
        .some(child => this.layerBelongsToFilter(child, normalizedFilter));
    }
    return this.getLayerModeTabs(layer).includes(normalizedFilter);
  }

  createLayerItem(layer, options = {}) {
    const depth = options.depth || 0;
    const item = document.createElement('div');
    item.className = 'layer-item';
    item.dataset.layerId = layer.id;

    if (depth > 0) {
      item.classList.add('layer-child');
      item.style.setProperty('--layer-depth', String(depth));
    }

    if (this.isLayerGroup(layer)) {
      item.classList.add('layer-group');
    }

    if (this.expandedLayers.has(layer.id)) {
      item.classList.add('expanded');
    }

    const header = document.createElement('div');
    header.className = 'layer-header';

    const info = document.createElement('div');
    info.className = 'layer-info';

    const icon = this.createLayerIcon(layer);
    const name = this.createLayerName(layer);
    const deleteBtn = this.createDeleteLayerButton(layer);
    const canExpand = this.layerHasExpandableContent(layer);
    const expandBtn = this.createExpandButton(layer, canExpand);

    info.appendChild(icon);
    info.appendChild(name);
    header.appendChild(info);
    if (deleteBtn) {
      header.appendChild(deleteBtn);
    }
    header.appendChild(expandBtn);
    item.appendChild(header);

    const content = this.isLayerGroup(layer)
      ? this.createGroupContent(layer, depth + 1)
      : this.createNewsList(layer);
    if (content) {
      item.appendChild(content);
    }

    return item;
  }

  createLayerIcon(layer) {
    const icon = document.createElement('div');
    const activeState = this.getLayerActiveState(layer);
    icon.className = 'layer-icon';
    if (activeState.active) {
      icon.classList.add('active');
    }
    if (activeState.mixed) {
      icon.classList.add('mixed');
    }
    icon.style.background = `${layer.color}33`;
    icon.style.color = layer.color;
    icon.textContent = layer.icon;
    icon.dataset.action = 'toggle-layer';
    icon.dataset.layerId = layer.id;
    icon.title = layer.name;
    return icon;
  }

  createLayerName(layer) {
    const wrapper = document.createElement('div');
    wrapper.className = 'layer-name-wrap';

    const name = document.createElement('div');
    name.className = 'layer-name';
    name.textContent = layer.name;
    wrapper.appendChild(name);

    if (this.layerFilter === 'regional' && this.regionalContext && this.isRegionalContextLayer(layer)) {
      const context = document.createElement('div');
      context.className = 'layer-context';
      context.textContent = this.regionalContext.label || this.regionalContext.source || 'Regional focus';
      wrapper.appendChild(context);
    }

    return wrapper;
  }

  createExpandButton(layer, canExpand) {
    const btn = document.createElement('button');
    btn.className = 'layer-expand';
    btn.innerHTML = this.expandedLayers.has(layer.id) ? '&#9650;' : '&#9660;';
    btn.dataset.action = 'expand';
    btn.dataset.layerId = layer.id;
    if (!canExpand) {
      btn.disabled = true;
      btn.classList.add('disabled');
    }
    return btn;
  }

  createDeleteLayerButton(layer) {
    if (!AppAccess.can('layer:delete') || !layer.isCustom || layer.isGroup) return null;

    const btn = document.createElement('button');
    btn.className = 'layer-delete-btn';
    btn.innerHTML = '&times;';
    btn.title = this.t('layer.removeNamed', { name: layer.name });
    btn.dataset.action = 'delete-layer';
    btn.dataset.layerId = layer.id;
    btn.dataset.adminOnly = 'true';
    return btn;
  }

  createGroupContent(layer, depth) {
    const list = document.createElement('div');
    list.className = 'layer-news layer-group-news';

    const childLayers = this.getChildLayers(layer);
    childLayers.forEach(childLayer => {
      const childItem = this.createLayerItem(childLayer, { depth });
      list.appendChild(childItem);
    });

    return list;
  }

  createNewsList(layer) {
    const list = document.createElement('div');
    list.className = 'layer-news';

    const layerNews = this.getLayerNews(layer);
    layerNews.forEach(point => {
      const newsItem = this.createNewsItem(point);
      list.appendChild(newsItem);
    });

    return list;
  }

  getLayerNews(layer) {
    let layerNews = [];

    if (layer.id === 'earths-fever') {
      layerNews = (this.feverWarnings || [])
        .slice()
        .sort((a, b) => b.year - a.year);
    } else {
      layerNews = this.points.filter(point => point.category === layer.id);

      if (layer.id === 'space') {
        layerNews = layerNews.sort((a, b) => {
          const orderDelta = (a.spaceOrder ?? Number.POSITIVE_INFINITY) - (b.spaceOrder ?? Number.POSITIVE_INFINITY);
          if (orderDelta !== 0) return orderDelta;
          return new Date(b.date) - new Date(a.date);
        });
      } else if (layer.id === 'meteo-live') {
        const severityRank = { severe: 4, warning: 3, notable: 2, watch: 1 };
        if (this.layerFilter === 'main') {
          layerNews = layerNews.filter(point => point.visibleInWorldMeteo !== false);
        }
        layerNews = layerNews.sort((a, b) => {
          const eventDelta = Number(Boolean(b.isAutoMeteoEvent)) - Number(Boolean(a.isAutoMeteoEvent));
          if (eventDelta !== 0) return eventDelta;
          const focusDelta = Number(Boolean(b.isRegionalFocus)) - Number(Boolean(a.isRegionalFocus));
          if (focusDelta !== 0) return focusDelta;
          const severityDelta = (severityRank[String(b.severity || '').toLowerCase()] || 0) - (severityRank[String(a.severity || '').toLowerCase()] || 0);
          if (severityDelta !== 0) return severityDelta;
          return new Date(b.date) - new Date(a.date);
        });
      } else if (layerNews.some(point => point.onlineLayerSignal)) {
        layerNews = layerNews.sort((a, b) => {
          const priorityDelta = (Number(b.markerPriority) || 0) - (Number(a.markerPriority) || 0);
          if (priorityDelta !== 0) return priorityDelta;
          return new Date(b.updatedAt || b.date || 0) - new Date(a.updatedAt || a.date || 0);
        });
      } else if (this.shouldSortLayerByRegionalContext(layer)) {
        const context = this.regionalContext;
        layerNews = layerNews
          .map(point => ({
            ...point,
            _regionalDistance: this.getDistanceKm(point, context)
          }))
          .sort((a, b) => {
            const distanceDelta = (a._regionalDistance ?? Number.POSITIVE_INFINITY) - (b._regionalDistance ?? Number.POSITIVE_INFINITY);
            if (distanceDelta !== 0) return distanceDelta;
            return new Date(b.date) - new Date(a.date);
          });
      } else {
        const dateSortDirection = layer.chronologySort === 'asc' ? 1 : -1;
        layerNews = layerNews.sort((a, b) => dateSortDirection * (new Date(a.date) - new Date(b.date)));
      }

      if (layer.id !== 'space') {
        const previewLimit = Number(layer.previewLimit);
        layerNews = layerNews.slice(0, Number.isFinite(previewLimit) && previewLimit > 0 ? previewLimit : 5);
      }
    }

    return layerNews;
  }

  shouldSortLayerByRegionalContext(layer) {
    if (this.layerFilter !== 'regional' || !this.regionalContext) return false;
    if (this.layerBelongsToFilter(layer, 'regional') && layer.sortByRegionalContext) return true;

    return this.hasAncestorLayer(layer, (ancestor) => (
      this.layerBelongsToFilter(ancestor, 'regional') && (ancestor.sortByRegionalContext || ancestor.id === REGIONAL_GROUP_ID)
    ));
  }

  isRegionalContextLayer(layer) {
    if (!layer) return false;
    if (this.layerBelongsToFilter(layer, 'regional')) return true;
    return this.hasAncestorLayer(layer, (ancestor) => this.layerBelongsToFilter(ancestor, 'regional'));
  }

  hasAncestorLayer(layer, matcher) {
    let current = this.getParentLayer(layer);
    while (current) {
      if (matcher(current)) return true;
      current = this.getParentLayer(current);
    }
    return false;
  }

  getDistanceKm(point, context) {
    const pointLat = Number(point?.lat);
    const pointLon = Number(point?.lon);
    const contextLat = Number(context?.lat);
    const contextLon = Number(context?.lon);

    if (!Number.isFinite(pointLat) || !Number.isFinite(pointLon) || !Number.isFinite(contextLat) || !Number.isFinite(contextLon)) {
      return Number.POSITIVE_INFINITY;
    }

    const toRadians = (value) => (value * Math.PI) / 180;
    const earthRadiusKm = 6371;
    const deltaLat = toRadians(contextLat - pointLat);
    const deltaLon = toRadians(contextLon - pointLon);
    const a = Math.sin(deltaLat / 2) ** 2
      + Math.cos(toRadians(pointLat)) * Math.cos(toRadians(contextLat)) * Math.sin(deltaLon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return earthRadiusKm * c;
  }

  formatDistanceKm(distanceKm) {
    if (!Number.isFinite(distanceKm)) return '';
    if (distanceKm < 1) return '<1 km away';
    if (distanceKm < 10) return `${distanceKm.toFixed(1)} km away`;
    return `${Math.round(distanceKm)} km away`;
  }

  getNewsMetaLine(point) {
    const parts = [point.region, point.country].filter(Boolean);
    if (point.worldMeteoRuntime) {
      const updatedSource = point.updatedAt || point.meteo?.time || point.date;
      if (updatedSource) {
        const date = new Date(updatedSource);
        if (!Number.isNaN(date.getTime())) {
          parts.push(`updated ${date.toLocaleString(this.getCurrentLanguage(), { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' })}`);
        }
      }
      if (point.confidence) {
        parts.push(String(point.confidence).replace(/-/g, ' '));
      }
    } else if (point.onlineLayerSignal) {
      const updatedSource = point.updatedAt || point.date;
      if (updatedSource) {
        const date = new Date(updatedSource);
        if (!Number.isNaN(date.getTime())) {
          parts.push(`checked ${date.toLocaleString(this.getCurrentLanguage(), { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' })}`);
        }
      }
      if (point.confidence) {
        parts.push(String(point.confidence).replace(/-/g, ' '));
      }
      if (point.reviewState) {
        parts.push(String(point.reviewState).replace(/-/g, ' '));
      }
    }
    const distanceLabel = this.formatDistanceKm(point._regionalDistance);
    if (distanceLabel) {
      parts.push(distanceLabel);
    }
    return parts.join(' | ');
  }

  getNewsTags(point) {
    const meteoTags = point.isAutoMeteoEvent || point.isRealtimeMeteo || point.category === 'meteo-live'
      ? [
          point.severity ? `meteo ${point.severity}` : 'meteo live',
          point.eventType
        ]
      : [];
    const carbonHistoryTags = point.isCarbonHistory || point.carbonHistory
      ? [
          point.carbonHistory?.track,
          point.carbonHistory?.sensitivity,
          point.carbonHistory?.confidence
        ]
      : [];
    const onlineTags = point.onlineLayerSignal
      ? [
          point.sourceType,
          point.severity,
          point.reviewState
        ]
      : [];

    return [point.initiativeType, point.communityStatus, ...meteoTags, ...carbonHistoryTags, ...onlineTags, ...((point.engagementTypes || []).slice(0, 2))]
      .filter(Boolean)
      .map(value => this.formatNewsTagLabel(value))
      .slice(0, 4);
  }

  formatNewsTagLabel(value = '') {
    return String(value).replace(/(^|[\s-])\S/g, match => match.toUpperCase());
  }

  getNewsTitle(point = {}) {
    const title = String(point.title || '');
    if (!point.isCarbonHistory && !point.carbonHistory) return title;

    const yearSource = point.carbonHistory?.periodStart || point.date || '';
    const match = String(yearSource).match(/^(\d{4})/);
    const year = match?.[1] || '';
    if (!year || title.startsWith(`${year}:`) || title.startsWith(`${year} -`)) return title;
    return `${year}: ${title}`;
  }

  escapeHtml(value = '') {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  updateFeverWarnings(warnings) {
    this.feverWarnings = warnings;
    if (window.currentGlobe && window.currentGlobe.inFeverMode) {
      this.updateData(this.layers, this.points);
    }
  }

  createNewsItem(point) {
    const item = document.createElement('div');
    const severityClass = point.worldMeteoRuntime && point.severity
      ? ` news-item-meteo-${String(point.severity).toLowerCase().replace(/[^a-z0-9-]/g, '')}`
      : '';
    const onlineClass = point.onlineLayerSignal ? ' news-item-online-signal' : '';
    item.className = `news-item${point.worldMeteoRuntime ? ' news-item-meteo-runtime' : ''}${onlineClass}${severityClass}`;
    if ((point.worldMeteoRuntime || point.onlineLayerSignal) && point.markerColor) {
      item.style.setProperty('--news-meteo-color', point.markerColor);
    }
    const canDeletePoint = AppAccess.canDeleteTopic(point);
    const deleteButton = canDeletePoint ? `
      <button class="news-delete-btn" data-action="delete-topic" data-point-id="${point.id}" ${AppAccess.can('topic:delete') ? 'data-admin-only="true"' : ''} title="${this.t('layer.removeBrowserTopic')}">
        &times;
      </button>
    ` : '';

    const date = new Date(point.date);
    const shortDate = `${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`;
    const fullDate = date.toLocaleDateString(this.getCurrentLanguage(), { year: 'numeric', month: 'long', day: 'numeric' });
    const metaLine = this.getNewsMetaLine(point);
    const tags = this.getNewsTags(point);
    const tagsHtml = tags.map(tag => `<span class="news-tag">${this.escapeHtml(tag)}</span>`).join('');

    item.innerHTML = `
      <div class="news-date" title="${this.escapeHtml(fullDate)}" data-action="show-detail-collapsed" data-point-id="${point.id}">${shortDate}</div>
      <div class="news-content" data-action="show-detail" data-point-id="${point.id}">
        <div class="news-title">${this.escapeHtml(this.getNewsTitle(point))}</div>
        ${metaLine ? `<div class="news-meta-line">${this.escapeHtml(metaLine)}</div>` : ''}
        <div class="news-desc">${this.escapeHtml(point.summary || '')}</div>
        ${tagsHtml ? `<div class="news-tags">${tagsHtml}</div>` : ''}
      </div>
      <button class="news-research-btn" data-action="open-research" data-point-id="${point.id}" title="${this.escapeHtml(this.getCurrentLanguage().startsWith('fr') ? 'Mettre ce sujet a jour' : 'Update this topic')}">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M6 1V11M1 6H11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
      </button>
      ${deleteButton}
    `;

    return item;
  }

  getRegionalProposalLabel() {
    return this.getCurrentLanguage().startsWith('fr') ? 'Proposer une action' : 'Propose Action';
  }

  getPreferredRegionalProposalLayerId() {
    const preferredOrder = ['community-projects', 'regional-news', 'bike-ways', 'ev-charging', 'hydrogen-charging'];
    const activeRegionalLayer = preferredOrder.find((layerId) => this.activeLayers.has(layerId) && this.getLayerById(layerId));
    return activeRegionalLayer || 'community-projects';
  }

  createActionButtons() {
    const canCreateLayer = AppAccess.can('layer:create');
    const canOpenTopicBuilder = AppAccess.canOpenTopicBuilder(this.layerFilter);
    const regionalProposalMode = this.layerFilter === 'regional';
    const topicLabel = regionalProposalMode ? this.getRegionalProposalLabel() : this.t('layer.newTopic');
    const container = document.createElement('div');
    container.className = 'layer-action-buttons';

    if (!canCreateLayer && !canOpenTopicBuilder) {
      container.style.display = 'none';
      return container;
    }

    container.innerHTML = `
      ${canCreateLayer ? `
      <button class="action-btn-layer" data-action="new-layer" data-admin-only="true">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M7 1V13M1 7H13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
        <span class="action-btn-text">${this.t('layer.newLayer')}</span>
      </button>
      ` : ''}
      ${canOpenTopicBuilder ? `
      <button class="action-btn-topic ${regionalProposalMode ? 'proposal-btn' : ''}" data-action="new-topic" ${AppAccess.can('topic:create') && !regionalProposalMode ? 'data-admin-only="true"' : ''}>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M7 1V13M1 7H13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
        <span class="action-btn-text">${topicLabel}</span>
      </button>
      ` : ''}
    `;
    return container;
  }

  attachEventListeners() {
    this.container.removeEventListener('click', this.handleClick);
    this.container.addEventListener('click', this.handleClick);
  }

  handleClick(e) {
    const target = e.target.closest('[data-action]');
    if (!target) return;

    const action = target.dataset.action;

    switch (action) {
      case 'collapse':
        this.handleCollapse(target);
        break;
      case 'close-panel':
        this.setClosed(true);
        break;
      case 'reopen-panel':
        this.setClosed(false);
        break;
      case 'toggle-layer':
        this.handleLayerToggle(target);
        break;
      case 'expand':
        this.handleExpand(target);
        break;
      case 'show-detail':
        this.handleShowDetail(target);
        break;
      case 'show-detail-collapsed':
        if (this.container.classList.contains('collapsed')) {
          this.handleShowDetail(target);
        }
        break;
      case 'open-research':
        this.handleOpenResearch(target);
        break;
      case 'new-layer':
        this.handleNewLayer();
        break;
      case 'new-topic':
        this.handleNewTopic();
        break;
      case 'delete-topic':
        this.handleDeleteTopic(target);
        break;
      case 'delete-layer':
        this.handleDeleteLayer(target);
        break;
    }
  }

  handleCollapse(btn) {
    this.setCollapsed(!this.isCollapsed);
  }

  setCollapsed(isCollapsed) {
    this.isCollapsed = Boolean(isCollapsed);
    if (this.isCollapsed) this.isClosed = false;
    this.container.classList.remove('closed');
    this.container.classList.toggle('collapsed', this.isCollapsed);
    const btn = this.container.querySelector('.panel-collapse-btn');
    if (!btn) return;
    btn.innerHTML = this.isCollapsed ? '&#9654;' : '&#9664;';
    btn.title = this.isCollapsed ? 'Expand layer panel' : 'Collapse layer panel';
    btn.setAttribute('aria-label', btn.title);

    if (this.isCollapsed) {
      this.container.style.zIndex = '70';
    } else {
      this.container.style.zIndex = '60';
    }
  }

  setClosed(isClosed) {
    this.isClosed = Boolean(isClosed);
    if (this.isClosed) {
      this.isCollapsed = false;
      this.container.classList.remove('collapsed');
    }
    this.container.classList.toggle('closed', this.isClosed);
    const collapseBtn = this.container.querySelector('.panel-collapse-btn');
    if (collapseBtn) {
      collapseBtn.innerHTML = '&#9664;';
      collapseBtn.title = 'Collapse layer panel';
      collapseBtn.setAttribute('aria-label', 'Collapse layer panel');
    }
    this.container.style.zIndex = this.isClosed ? '72' : '60';
  }

  reopen() {
    this.setClosed(false);
  }

  handleLayerToggle(icon) {
    const layerId = icon.dataset.layerId;
    const layer = this.getLayerById(layerId);
    if (!layer) return;

    if (this.isLayerGroup(layer)) {
      const targetLayers = this.getDescendantLeafLayers(layer);
      const shouldActivate = !targetLayers.every(child => this.activeLayers.has(child.id));
      targetLayers.forEach(childLayer => {
        this.setLayerActive(childLayer.id, shouldActivate);
      });
      this.updateData(this.layers, this.points);
      return;
    }

    const nextActive = !this.activeLayers.has(layerId);
    this.setLayerActive(layerId, nextActive);
    this.updateData(this.layers, this.points);
  }

  setLayerActive(layerId, isActive) {
    if (isActive) {
      this.activeLayers.add(layerId);
    } else {
      this.activeLayers.delete(layerId);
    }

    if (this.callbacks.onLayerToggle) {
      this.callbacks.onLayerToggle(layerId, isActive);
    }
  }

  handleExpand(btn) {
    if (btn.disabled) return;

    const item = btn.closest('.layer-item');
    if (!item) return;

    const layerId = item.dataset.layerId;
    const isExpanding = !item.classList.contains('expanded');

    item.classList.toggle('expanded');
    btn.innerHTML = item.classList.contains('expanded') ? '&#9650;' : '&#9660;';

    if (isExpanding) {
      this.expandedLayers.add(layerId);
    } else {
      this.expandedLayers.delete(layerId);
    }
  }

  handleShowDetail(newsItem) {
    const pointId = newsItem.dataset.pointId;

    let point = this.points.find(p => p.id === pointId);

    if (!point && pointId.startsWith('fever_') && this.feverWarnings) {
      point = this.feverWarnings.find(w => w.id === pointId);
    }

    if (!point && !isNaN(parseInt(pointId, 10))) {
      point = this.points.find(p => p.id === parseInt(pointId, 10));
    }

    if (point && this.callbacks.onPointSelect) {
      this.callbacks.onPointSelect(point);
    }
  }

  handleOpenResearch(btn) {
    const pointId = btn.dataset.pointId;

    let point = this.points.find(p => p.id === pointId);

    if (!point && !isNaN(parseInt(pointId, 10))) {
      point = this.points.find(p => p.id === parseInt(pointId, 10));
    }

    if (point && this.callbacks.onResearchOpen) {
      this.callbacks.onResearchOpen(point);
    }
  }

  handleNewLayer() {
    if (!AppAccess.can('layer:create')) {
      this.updateData(this.layers, this.points);
      return;
    }

    if (this.callbacks.onNewLayer) {
      this.callbacks.onNewLayer();
    }
  }

  handleNewTopic() {
    if (!AppAccess.canOpenTopicBuilder(this.layerFilter)) {
      this.updateData(this.layers, this.points);
      return;
    }

    if (this.callbacks.onNewTopic) {
      if (this.layerFilter === 'regional') {
        this.callbacks.onNewTopic({
          mode: 'regional-proposal',
          regionalContext: this.regionalContext,
          defaultLayerId: this.getPreferredRegionalProposalLayerId()
        });
        return;
      }

      this.callbacks.onNewTopic();
    }
  }

  handleDeleteTopic(btn) {
    const point = this.findPointById(btn.dataset.pointId);
    if (!AppAccess.canDeleteTopic(point)) {
      this.updateData(this.layers, this.points);
      return;
    }

    if (point && this.callbacks.onDeleteTopic) {
      this.callbacks.onDeleteTopic(point);
    }
  }

  handleDeleteLayer(btn) {
    if (!AppAccess.can('layer:delete')) {
      this.updateData(this.layers, this.points);
      return;
    }

    const layer = this.layers.find(item => item.id === btn.dataset.layerId);
    if (layer && this.callbacks.onDeleteLayer) {
      this.callbacks.onDeleteLayer(layer);
    }
  }

  findPointById(pointId) {
    let point = this.points.find(p => String(p.id) === String(pointId));
    if (!point && pointId?.startsWith('fever_') && this.feverWarnings) {
      point = this.feverWarnings.find(w => String(w.id) === String(pointId));
    }
    return point;
  }

  updateData(layers, points) {
    layers.forEach(layer => {
      if (!this.knownLayerIds.has(layer.id) && layer.enabled && !layer.isGroup) {
        this.activeLayers.add(layer.id);
      }
      if (layer.defaultExpanded) {
        this.expandedLayers.add(layer.id);
      }
      this.knownLayerIds.add(layer.id);
    });
    this.layers = layers;
    this.points = points;
    this.render();

    if (this.isCollapsed) {
      this.container.classList.add('collapsed');
      const collapseBtn = this.container.querySelector('.panel-collapse-btn');
      if (collapseBtn) {
        collapseBtn.innerHTML = '&#9654;';
      }
      this.container.style.zIndex = '70';
    }

    this.expandedLayers.forEach(layerId => {
      const item = this.container.querySelector(`.layer-item[data-layer-id="${layerId}"]`);
      if (item) {
        item.classList.add('expanded');
        const expandBtn = item.querySelector('.layer-expand');
        if (expandBtn) {
          expandBtn.innerHTML = '&#9650;';
        }
      }
    });

    this.attachEventListeners();
  }

  getActiveLayers() {
    return this.activeLayers;
  }

  getActiveLayersForFilter(filter = this.layerFilter) {
    return new Set(
      Array.from(this.activeLayers)
        .filter(layerId => this.layerBelongsToFilter(this.getLayerById(layerId), filter))
    );
  }

  updateFeverYearOverlay(visible) {
    const overlay = document.getElementById('fever-year-hud');
    if (visible) {
      if (!overlay) {
        this.createFeverYearHUD();
      } else {
        overlay.classList.remove('hidden');
      }
    } else if (overlay) {
      overlay.classList.add('hidden');
    }
  }

  createFeverYearHUD() {
    const hud = document.createElement('div');
    hud.id = 'fever-year-hud';
    hud.className = 'fever-year-hud';
    hud.innerHTML = `
      <div class="fever-year-display">
        <div class="fever-year-number" id="fever-hud-year">2025</div>
        <div class="fever-year-subtitle" id="fever-hud-subtitle">${this.t('fever.currentEraBaseline')}</div>
      </div>
    `;
    document.body.appendChild(hud);

    window.addEventListener('feverYearChanged', (e) => {
      const yearEl = document.getElementById('fever-hud-year');
      const subtitleEl = document.getElementById('fever-hud-subtitle');
      if (yearEl) yearEl.textContent = e.detail.year;
      if (subtitleEl) {
        if (e.detail.year === 2025) {
          subtitleEl.textContent = this.t('fever.currentEraBaseline');
        } else {
          subtitleEl.textContent = this.t('fever.betweenMilestoneAndNext', { year: e.detail.milestoneYear });
        }
      }
    });
  }

  activatLayer(layerId) {
    this.activeLayers.add(layerId);
    const icon = this.container.querySelector(`.layer-icon[data-layer-id="${layerId}"]`);
    if (icon) {
      icon.classList.add('active');
    }
  }

  disableNonFilteredLayers(filter) {
    let allowedLayers = [];
    if (filter === 'fever') {
      allowedLayers = this.layers.filter(layer => layer.feverOnly && !layer.isGroup).map(layer => layer.id);
    } else if (filter === 'space') {
      allowedLayers = ['space'];
    }

    this.layers.forEach(layer => {
      if (layer.isGroup) return;

      const shouldDisable = filter === 'main'
        ? layer.feverOnly
        : (allowedLayers.length > 0 && !allowedLayers.includes(layer.id));

      if (shouldDisable) {
        this.activeLayers.delete(layer.id);
        if (this.callbacks.onLayerToggle) {
          this.callbacks.onLayerToggle(layer.id, false);
        }
      }
    });

    this.updateData(this.layers, this.points);
  }

  restoreLayerStates(savedStates) {
    this.activeLayers = new Set(Array.from(savedStates).filter(layerId => !this.getLayerById(layerId)?.isGroup));

    this.activeLayers.forEach(layerId => {
      if (this.callbacks.onLayerToggle) {
        this.callbacks.onLayerToggle(layerId, true);
      }
    });

    this.updateData(this.layers, this.points);
  }

  getLayerById(layerId) {
    return this.layers.find(layer => layer.id === layerId) || null;
  }

  getParentLayer(layer) {
    if (!layer?.parentLayerId) return null;
    return this.getLayerById(layer.parentLayerId);
  }

  getChildLayers(layer) {
    return this.layers.filter(candidate => candidate.parentLayerId === layer.id);
  }

  getDescendantLeafLayers(layer) {
    const descendants = [];
    this.getChildLayers(layer).forEach((child) => {
      if (this.isLayerGroup(child)) {
        descendants.push(...this.getDescendantLeafLayers(child));
      } else {
        descendants.push(child);
      }
    });
    return descendants;
  }

  isLayerGroup(layer) {
    return Boolean(layer?.isGroup) || this.getChildLayers(layer).length > 0;
  }

  getLayerActiveState(layer) {
    if (!this.isLayerGroup(layer)) {
      return {
        active: this.activeLayers.has(layer.id),
        mixed: false
      };
    }

    const childLayers = this.getDescendantLeafLayers(layer);
    const activeChildren = childLayers.filter(child => this.activeLayers.has(child.id)).length;
    return {
      active: activeChildren > 0,
      mixed: activeChildren > 0 && activeChildren < childLayers.length
    };
  }

  layerHasExpandableContent(layer) {
    if (this.isLayerGroup(layer)) {
      return this.getChildLayers(layer).length > 0;
    }
    return this.getLayerNews(layer).length > 0;
  }
}
