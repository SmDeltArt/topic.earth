/**
 * Earth's Fever Debug Adapter
 * Read-only snapshot of current Fever runtime state
 */
export class FeverDebugAdapter {
  constructor(globe) {
    this.globe = globe;
    this.listeners = [];
    this.latestSnapshot = null;
  }

  getSnapshot() {
    if (!this.globe.inFeverMode) {
      return null;
    }

    const currentYear = this.globe.getFeverCurrentYear();
    const scenario = this.globe.getFeverScenario();
    const progress = this.globe.getFeverProgress();
    const isPaused = this.globe.isFeverPaused();
    const isReversed = this.globe.isFeverReversed();
    
    // Find milestone pair
    const milestones = this.globe.feverYears;
    const currentIndex = this.globe.feverCurrentIndex;
    const lowerMilestone = milestones[currentIndex];
    const upperMilestone = milestones[Math.min(currentIndex + 1, milestones.length - 1)];
    
    // Calculate interpolation factor within current milestone pair
    const milestone1 = milestones[currentIndex];
    const milestone2 = milestones[currentIndex + 1] || milestones[currentIndex];
    const interpolationFactor = milestone2 > milestone1 ? 
      (currentYear - milestone1) / (milestone2 - milestone1) : 0;

    const snapshot = {
      currentYear,
      scenario,
      progress,
      isPaused,
      isReversed,
      lowerMilestone,
      upperMilestone,
      interpolationFactor,
      activeFeverTextureYear: lowerMilestone,
      tippingOverlayVisible: this.globe.getTippingOverlayVisible(),
      activeWarnings: this.getActiveWarnings(currentYear, scenario),
      tippingDiagnostics: this.getTippingDiagnostics(currentYear, scenario, progress),
      milestones,
      currentIndex
    };

    this.latestSnapshot = snapshot;
    return snapshot;
  }

  getActiveWarnings(currentYear, scenario) {
    // Compute real active warnings from current tipping state
    const warnings = [];
    const boundaries = [
      'climate_change', 'novel_entities', 'stratospheric_ozone_depletion',
      'atmospheric_aerosol_loading', 'ocean_acidification', 'biogeochemical_flows',
      'freshwater_change', 'land_system_change', 'biosphere_integrity'
    ];

    boundaries.forEach(boundary => {
      if (this.globe.tippingTriggered && this.globe.tippingTriggered[boundary]) {
        const triggered = this.globe.tippingTriggered[boundary];
        if (triggered.forward || triggered.reverse) {
          warnings.push({
            boundary,
            year: currentYear,
            scenario,
            summary: `${boundary.replace(/_/g, ' ')} threshold crossed`
          });
        }
      }
    });

    return warnings;
  }

  getTippingDiagnostics(currentYear, scenario, progress) {
    if (!this.globe.tippingSegments || !this.globe.tippingLabels) {
      return { selectedTopic: null, thresholds: {} };
    }

    const diagnostics = {
      selectedTopic: null,
      thresholds: {}
    };

    const boundaries = [
      'climate_change', 'novel_entities', 'stratospheric_ozone_depletion',
      'atmospheric_aerosol_loading', 'ocean_acidification', 'biogeochemical_flows',
      'freshwater_change', 'land_system_change', 'biosphere_integrity'
    ];

    boundaries.forEach(boundary => {
      const segments = this.globe.tippingSegments[boundary] || [];
      const label = this.globe.tippingLabels[boundary];
      
      const activeCount = segments.filter(s => s.material && s.material.opacity > 0.5).length;
      const totalCount = segments.length;
      const currentProgress = totalCount > 0 ? activeCount / totalCount : 0;

      diagnostics.thresholds[boundary] = {
        progress: currentProgress,
        atThreshold: currentProgress >= 1.0,
        segmentsActive: activeCount,
        segmentsTotal: totalCount,
        labelColor: label && label.material ? 
          `#${label.material.color.getHexString()}` : null,
        triggered: this.globe.tippingTriggered?.[boundary]?.forward || false
      };
    });

    return diagnostics;
  }

  getLatestSnapshot() {
    return this.latestSnapshot;
  }

  subscribe(callback) {
    this.listeners.push(callback);
  }

  notify() {
    const snapshot = this.getSnapshot();
    this.listeners.forEach(cb => cb(snapshot));
  }
}

/**
 * Tipping Topic Draft State Manager
 */
export class TippingTopicDraftState {
  constructor() {
    this.selectedTopicId = null;
    this.draftData = {};
    this.isDirty = false;
  }

  selectTopic(topicId, topicData) {
    this.selectedTopicId = topicId;
    this.draftData = JSON.parse(JSON.stringify(topicData)); // Deep clone
    
    // Ensure scenarios are structured properly
    if (!this.draftData.scenarios) {
      this.draftData.scenarios = {};
    }
    
    const milestones = [1950, 1975, 2000, 2025, 2050, 2075, 2100, 2125];
    const scenarios = ['best', 'objective', 'high'];
    
    scenarios.forEach(scenario => {
      if (!this.draftData.scenarios[scenario]) {
        this.draftData.scenarios[scenario] = {};
      }
      milestones.forEach(year => {
        if (!this.draftData.scenarios[scenario][year]) {
          this.draftData.scenarios[scenario][year] = {
            progress: 0,
            threshold: false,
            warning: false
          };
        }
      });
    });
    
    this.isDirty = false;
  }

  updateMilestone(year, scenario, milestoneData) {
    if (!this.draftData.scenarios) {
      this.draftData.scenarios = {};
    }
    if (!this.draftData.scenarios[scenario]) {
      this.draftData.scenarios[scenario] = {};
    }
    this.draftData.scenarios[scenario][year] = {
      progress: milestoneData.progress ?? 0,
      threshold: milestoneData.threshold ?? false,
      warning: milestoneData.warning ?? false
    };
    this.isDirty = true;
  }

  updateThreshold(thresholdKey, value) {
    if (!this.draftData.thresholds) {
      this.draftData.thresholds = {};
    }
    this.draftData.thresholds[thresholdKey] = value;
    this.isDirty = true;
  }

  saveDraft() {
    // Save to storage
    const customPoints = JSON.parse(localStorage.getItem('euroearth_custom_points') || '[]');
    const index = customPoints.findIndex(p => p.id === this.selectedTopicId);
    if (index !== -1) {
      customPoints[index] = this.draftData;
      localStorage.setItem('euroearth_custom_points', JSON.stringify(customPoints));
      this.isDirty = false;
      return true;
    }
    return false;
  }

  resetDraft() {
    if (this.selectedTopicId) {
      // Reload from storage
      const customPoints = JSON.parse(localStorage.getItem('euroearth_custom_points') || '[]');
      const original = customPoints.find(p => p.id === this.selectedTopicId);
      if (original) {
        this.selectTopic(this.selectedTopicId, original);
        return true;
      }
    }
    this.isDirty = false;
    return false;
  }

  validate() {
    const errors = [];
    const milestones = [1950, 1975, 2000, 2025, 2050, 2075, 2100, 2125];
    const scenarios = ['best', 'objective', 'high'];

    scenarios.forEach(scenario => {
      milestones.forEach(year => {
        const milestone = this.draftData.scenarios?.[scenario]?.[year];
        if (!milestone) {
          errors.push(`Missing milestone ${year} for scenario ${scenario}`);
        } else {
          // Validate 0 is acceptable
          if (milestone.progress === undefined || milestone.progress === null) {
            errors.push(`Invalid progress for ${year}/${scenario}`);
          }
          if (milestone.progress < 0 || milestone.progress > 1) {
            errors.push(`Progress out of range for ${year}/${scenario}`);
          }
        }
      });
    });

    return errors;
  }
}