/**
 * Fever monitoring panel content
 * Simplified, educational explanations for the 4-tab monitoring system
 */
export const FEVER_MONITORING_CONTENT = {
  warningTitles: {
    best: {
      1950: { title: 'Climate Baseline', severity: 'info', message: 'Pre-industrial climate baseline established' },
      1975: { title: 'Early Warming Signal', severity: 'info', message: 'First measurable warming detected globally' },
      2000: { title: 'Climate Shift Confirmed', severity: 'warning', message: 'Warming trend exceeds natural variation' },
      2025: { title: 'Climate Action Phase', severity: 'warning', message: 'Stabilization efforts showing impact' },
      2050: { title: 'Climate Recovery', severity: 'warning', message: 'Systems stabilizing under best scenario' },
      2075: { title: 'Climate Plateau', severity: 'caution', message: 'Temperature plateau holding steady' },
      2100: { title: 'Climate Threshold', severity: 'elevated', message: 'Approaching critical threshold zone' },
      2125: { title: 'Climate Boundary', severity: 'elevated', message: 'Near planetary boundary limits' }
    },
    objective: {
      1950: { title: 'Climate Baseline', severity: 'info', message: 'Industrial era climate baseline' },
      1975: { title: 'Warming Signal Emerging', severity: 'info', message: 'Scientific community detecting early signals' },
      2000: { title: 'Climate Change Confirmed', severity: 'warning', message: 'Warming acceleration beyond natural cycles' },
      2025: { title: 'Climate Disruption', severity: 'caution', message: 'Ice sheet instability and ecosystem shifts' },
      2050: { title: 'Major Climate Disruption', severity: 'elevated', message: 'Coastal flooding and drought cycles intensifying' },
      2075: { title: 'Cascading Risk Phase', severity: 'critical', message: 'Ecosystem collapse spreading globally' },
      2100: { title: 'Planetary Crisis', severity: 'critical', message: 'Multiple tipping points crossed' },
      2125: { title: 'Civilization-Scale Disruption', severity: 'critical', message: 'Habitable zones shrinking rapidly' }
    },
    high: {
      1950: { title: 'Climate Baseline', severity: 'info', message: 'Pre-acceleration baseline period' },
      1975: { title: 'Rapid Warming', severity: 'warning', message: 'Warming signal intensifying quickly' },
      2000: { title: 'Climate Acceleration', severity: 'caution', message: 'Extreme weather becoming normal' },
      2025: { title: 'Climate Emergency', severity: 'elevated', message: 'Ice sheet collapse imminent' },
      2050: { title: 'Catastrophic Warming', severity: 'critical', message: 'Agriculture failing, mass displacement' },
      2075: { title: 'Planetary Crisis Deepens', severity: 'critical', message: 'Breadbasket regions becoming desert' },
      2100: { title: 'Severe Habitability Loss', severity: 'critical', message: 'Tropical zones abandoned' },
      2125: { title: 'Existential Threat Level', severity: 'critical', message: 'Earth system approaching incompatibility' }
    }
  },
  
  feverExplanations: {
    simplified: `Earth's Fever shows how our planet is warming over time. Think of it like checking Earth's temperature with a thermometer. The colors on the globe show different climate states - cooler blues in the past, warmer oranges and reds as we move forward.`,
    chartMeaning: `The chart shows three key things changing together: Temperature (red line) going up, Ice Sheets (blue line) shrinking, and Sea Level (cyan line) rising. When you see these lines moving, that's climate change happening in real-time.`,
    scenarios: {
      best: `The "Best" scenario shows what happens if we act fast and work together globally to reduce emissions and protect nature.`,
      objective: `The "Objective" scenario shows the most likely path based on current actions and policies worldwide.`,
      high: `The "High" scenario shows what could happen if we don't change our current trajectory soon enough.`
    }
  },
  
  amocExplanations: {
    simplified: `AMOC (Atlantic Meridional Overturning Circulation) is like Earth's ocean conveyor belt. Warm water flows north at the surface, cools near the Arctic, sinks, and flows back south deep underwater. This circulation helps regulate climate in Europe and North America.`,
    whatItMeans: {
      strong: `When AMOC is strong (above 80%), the ocean conveyor belt works normally, keeping climates stable.`,
      weakening: `When AMOC weakens (50-80%), Europe may get colder winters while the tropics get hotter. Weather patterns shift.`,
      weak: `When AMOC is very weak (below 50%), major climate disruption is likely - Europe could face severe cooling while sea levels rise faster along the US East Coast.`
    },
    components: {
      flowStrength: `Overall strength of the circulation system`,
      warmBranch: `Warm water flowing north at the surface`,
      coldBranch: `Cold water returning south at depth`,
      northSink: `Where warm water cools and sinks in the North Atlantic`,
      southReturn: `Deep cold current flowing back toward the tropics`
    }
  },
  
  tippingExplanations: {
    simplified: `Tipping points are like thresholds where Earth's systems can suddenly shift to a new state. Once crossed, these changes can be very hard or impossible to reverse. Think of it like a ball balanced on a hill - a small push can send it rolling down.`,
    whyItMatters: `Each tipping point represents a natural system that can flip from one stable state to another. When we cross too many, they can trigger each other in a cascade - like dominoes falling.`,
    currentState: `The colored ring shows how close we are to each tipping point. Green/cyan means safe, yellow means caution, orange means danger, red means we've crossed the threshold.`
  },
  
  interactionsExplanations: {
    simplified: `Everything is connected. When Earth warms, ice sheets melt. Melting ice weakens AMOC. Weak AMOC changes rainfall patterns. Changed rainfall stresses forests. Stressed forests release carbon. Released carbon warms Earth more. This is a feedback loop.`,
    keyConnections: [
      `Warming → Ice melt → AMOC weakening → Regional climate shifts`,
      `AMOC weakening → Changed ocean heat transport → Tipping point stress`,
      `Tipping points crossed → New climate state → More warming`,
      `Forest loss → Less carbon storage → Faster warming → More forest stress`
    ],
    bottomLine: `This is why we watch all these systems together. A change in one affects all the others. The faster things change, the harder it is for nature and society to adapt.`
  }
};

/**
 * Earth's Fever pre-configured topics
 * These are loaded at app startup and integrated into the main topic system
 */
export const FEVER_TOPICS = [
  {
    id: 'fever_1950',
    year: 1950,
    title: 'Climate Year 1950',
    category: 'earths-fever',
    date: '1950-01-01',
    country: 'Global',
    region: 'Worldwide',
    lat: 0,
    lon: 0,
    summary: 'Industrial baseline established. Global cooperation begins shaping a sustainable future path.',
    source: 'Earth\'s Fever Simulation',
    insight: 'Industrial era baseline. The climate system remains relatively stable before acceleration.',
    level: 'info',
    scenario: 'objective',
    isFeverWarning: true,
    ttsText: 'Industrial era baseline. The climate system remains relatively stable before acceleration.'
  },
  {
    id: 'fever_1975',
    year: 1975,
    title: 'Climate Year 1975',
    category: 'earths-fever',
    date: '1975-01-01',
    country: 'Global',
    region: 'Worldwide',
    lat: 0,
    lon: 0,
    summary: 'First measurable warming detected. Scientific community begins raising early concerns.',
    source: 'Earth\'s Fever Simulation',
    insight: 'Early environmental awareness emerges. Initial progress in emission controls shows promise.',
    level: 'warning',
    scenario: 'objective',
    isFeverWarning: true,
    ttsText: 'First measurable warming detected. Scientific community begins raising early concerns.'
  },
  {
    id: 'fever_2000',
    year: 2000,
    title: 'Climate Year 2000',
    category: 'earths-fever',
    date: '2000-01-01',
    country: 'Global',
    region: 'Worldwide',
    lat: 0,
    lon: 0,
    summary: 'Warming trend accelerating beyond natural variation. Extreme weather events increasing.',
    source: 'Earth\'s Fever Simulation',
    insight: 'International climate frameworks taking shape. Temperature rise remains within manageable limits.',
    level: 'warning',
    scenario: 'objective',
    isFeverWarning: true,
    ttsText: 'Warming trend accelerating beyond natural variation. Extreme weather events increasing.'
  },
  {
    id: 'fever_2025',
    year: 2025,
    title: 'Climate Year 2025',
    category: 'earths-fever',
    date: '2025-01-01',
    country: 'Global',
    region: 'Worldwide',
    lat: 0,
    lon: 0,
    summary: 'Critical warming threshold approaching. Ice sheet instability and ecosystem shifts observable.',
    source: 'Earth\'s Fever Simulation',
    insight: 'Renewable transition accelerates worldwide. Stabilization efforts show measurable impact.',
    level: 'danger',
    scenario: 'objective',
    isFeverWarning: true,
    ttsText: 'Critical warming threshold approaching. Ice sheet instability and ecosystem shifts observable.'
  },
  {
    id: 'fever_2050',
    year: 2050,
    title: 'Climate Year 2050',
    category: 'earths-fever',
    date: '2050-01-01',
    country: 'Global',
    region: 'Worldwide',
    lat: 0,
    lon: 0,
    summary: 'Severe climate disruption underway. Coastal flooding, drought cycles intensifying globally.',
    source: 'Earth\'s Fever Simulation',
    insight: 'Net-zero targets achieved in major economies. Climate systems begin stabilizing.',
    level: 'danger',
    scenario: 'objective',
    isFeverWarning: true,
    ttsText: 'Severe climate disruption underway. Coastal flooding, drought cycles intensifying globally.'
  },
  {
    id: 'fever_2075',
    year: 2075,
    title: 'Climate Year 2075',
    category: 'earths-fever',
    date: '2075-01-01',
    country: 'Global',
    region: 'Worldwide',
    lat: 0,
    lon: 0,
    summary: 'Cascading ecosystem collapse spreading. Mass migration and resource conflicts emerging.',
    source: 'Earth\'s Fever Simulation',
    insight: 'Temperature plateau holding below critical thresholds. Ecosystem recovery programs expand.',
    level: 'critical',
    scenario: 'objective',
    isFeverWarning: true,
    ttsText: 'Cascading ecosystem collapse spreading. Mass migration and resource conflicts emerging.'
  },
  {
    id: 'fever_2100',
    year: 2100,
    title: 'Climate Year 2100',
    category: 'earths-fever',
    date: '2100-01-01',
    country: 'Global',
    region: 'Worldwide',
    lat: 0,
    lon: 0,
    summary: 'Planetary systems in crisis. Multiple tipping points crossed, feedback loops accelerating.',
    source: 'Earth\'s Fever Simulation',
    insight: 'Climate stabilization confirmed. Legacy emissions gradually declining across systems.',
    level: 'critical',
    scenario: 'objective',
    isFeverWarning: true,
    ttsText: 'Planetary systems in crisis. Multiple tipping points crossed, feedback loops accelerating.'
  },
  {
    id: 'fever_2125',
    year: 2125,
    title: 'Climate Year 2125',
    category: 'earths-fever',
    date: '2125-01-01',
    country: 'Global',
    region: 'Worldwide',
    lat: 0,
    lon: 0,
    summary: 'Civilization-scale disruption. Habitable zones shrinking, survival challenges mounting.',
    source: 'Earth\'s Fever Simulation',
    insight: 'Sustainable equilibrium achieved. Careful monitoring ensures long-term stability.',
    level: 'critical',
    scenario: 'objective',
    isFeverWarning: true,
    ttsText: 'Civilization-scale disruption. Habitable zones shrinking, survival challenges mounting.'
  }
];