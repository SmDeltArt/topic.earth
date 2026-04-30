const DEFAULT_PROFILE = 'demo';
const ADMIN_MODE_STORAGE_KEY = 'euroearth_admin_mode';
const VALID_PROFILES = new Set(['demo', 'admin', 'dev']);
const ADMIN_CAPABLE_PROFILES = new Set(['admin', 'dev']);

const USER_SAFE_CAPABILITIES = new Set([
  'settings:user',
  'ai:research'
]);

const ADMIN_MODE_CAPABILITIES = new Set([
  'settings:api',
  'topic:create',
  'topic:update',
  'topic:delete',
  'topic:submit-package',
  'topic:export-admin-zip',
  'topic:check-update',
  'layer:create',
  'layer:delete',
  'source:manage',
  'media:manage',
  'ai:apply-to-topic',
  'project:data-write'
]);

function normalizeProfile(profile) {
  const normalized = String(profile || DEFAULT_PROFILE).toLowerCase();
  return VALID_PROFILES.has(normalized) ? normalized : DEFAULT_PROFILE;
}

function getConfiguredProfile() {
  if (typeof window === 'undefined') return DEFAULT_PROFILE;
  return normalizeProfile(window.TOPIC_EARTH_PROFILE || document.documentElement?.dataset.topicEarthProfile);
}

function getStoredAdminMode() {
  try {
    return localStorage.getItem(ADMIN_MODE_STORAGE_KEY) === 'true';
  } catch (error) {
    return false;
  }
}

function setStoredAdminMode(enabled) {
  try {
    localStorage.setItem(ADMIN_MODE_STORAGE_KEY, enabled ? 'true' : 'false');
  } catch (error) {
    console.warn('[Access] Could not persist admin mode:', error);
  }
}

export const AppAccess = {
  isRegionalProposalTopic(topic) {
    if (!topic || topic.isCustom === false) return false;

    const origin = String(topic.storage?.origin || topic.storageMeta?.origin || 'browser-localStorage');
    const publishedAt = topic.storage?.publishedAt || '';
    const workflow = String(topic.storageMeta?.workflow || '');
    const reviewStage = String(topic.review?.stage || '');
    const requestedBy = String(topic.review?.requestedBy || '');
    const topicStatus = String(topic.topicStatus || '');

    return !publishedAt
      && origin.startsWith('browser-')
      && (
        workflow === 'regional-proposal'
        || reviewStage === 'regional-proposal'
        || reviewStage === 'local-proposal'
        || requestedBy === 'regional-user'
        || topicStatus === 'proposal-local'
      );
  },

  canOpenRegionalProposal(filter = 'main') {
    return filter === 'regional';
  },

  canOpenTopicBuilder(filter = 'main') {
    return this.can('topic:create') || this.canOpenRegionalProposal(filter);
  },

  canModifyTopic(topic) {
    return this.can('topic:update') || this.isRegionalProposalTopic(topic);
  },

  canDeleteTopic(topic) {
    return this.can('topic:delete') || this.isRegionalProposalTopic(topic);
  },

  canManageTopicSources(topic) {
    return this.can('source:manage') || this.isRegionalProposalTopic(topic);
  },

  canSaveTopic(topic) {
    return this.can('topic:create') || this.isRegionalProposalTopic(topic);
  },
  getProfile() {
    return getConfiguredProfile();
  },

  isAdminProfile() {
    return ADMIN_CAPABLE_PROFILES.has(this.getProfile());
  },

  getMode() {
    return this.isAdminProfile() && getStoredAdminMode() ? 'admin' : 'user';
  },

  isAdminMode() {
    return this.getMode() === 'admin';
  },

  setMode(mode) {
    const wantsAdmin = mode === 'admin';
    const enabled = wantsAdmin && this.can('admin:toggle');
    setStoredAdminMode(enabled);
    return this.getState();
  },

  setAdminMode(enabled) {
    return this.setMode(enabled ? 'admin' : 'user');
  },

  can(capability) {
    if (USER_SAFE_CAPABILITIES.has(capability)) return true;

    const profile = this.getProfile();
    const adminProfile = ADMIN_CAPABLE_PROFILES.has(profile);
    const adminMode = adminProfile && getStoredAdminMode();

    if (capability === 'admin:toggle') return adminProfile;
    if (capability === 'debug:view') return profile === 'dev' || adminMode;
    if (ADMIN_MODE_CAPABILITIES.has(capability)) return adminMode;

    return false;
  },

  require(capability, message = '') {
    if (this.can(capability)) return true;
    if (message) console.warn(message);
    return false;
  },

  enforceProfile() {
    if (!this.isAdminProfile() && getStoredAdminMode()) {
      setStoredAdminMode(false);
    }
    return this.getState();
  },

  getState() {
    const profile = this.getProfile();
    const isAdminProfile = ADMIN_CAPABLE_PROFILES.has(profile);
    const isAdminMode = isAdminProfile && getStoredAdminMode();

    return {
      profile,
      mode: isAdminMode ? 'admin' : 'user',
      isAdminProfile,
      isAdminMode,
      canToggleAdmin: isAdminProfile
    };
  }
};