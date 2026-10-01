const degreeC = '\u00B0C';
const carbonDioxide = 'CO\u2082';

export const SOLAR_SYSTEM_SCALE_REFERENCE = {
  unit: 'Earth',
  earthDiameterKm: 12742,
  astronomicalUnitKm: 149600000,
  note: 'Scene sizes and distances are compressed for navigation. Earth diameter is the diameter ratio unit; Earth orbit is the distance ratio unit.',
  bodies: {
    Sun: { diameterEarth: 109.2, averageDistanceAu: 0 },
    Mercury: { diameterEarth: 0.383, averageDistanceAu: 0.387 },
    Venus: { diameterEarth: 0.949, averageDistanceAu: 0.723 },
    Earth: { diameterEarth: 1.0, averageDistanceAu: 1.0 },
    Moon: { diameterEarth: 0.273, averageDistanceAu: 0.00257, orbits: 'Earth' },
    Mars: { diameterEarth: 0.532, averageDistanceAu: 1.524 },
    Jupiter: { diameterEarth: 11.209, averageDistanceAu: 5.203 },
    Saturn: { diameterEarth: 9.449, averageDistanceAu: 9.537 },
    Titan: { diameterEarth: 0.404, parent: 'Saturn', orbitalDistanceKm: 1221870 },
    Enceladus: { diameterEarth: 0.0395, parent: 'Saturn', orbitalDistanceKm: 238020 },
    Uranus: { diameterEarth: 4.007, averageDistanceAu: 19.191 },
    Neptune: { diameterEarth: 3.883, averageDistanceAu: 30.069 },
    Pluto: { diameterEarth: 0.186, averageDistanceAu: 39.482 },
    Planet9: { diameterEarth: null, averageDistanceAu: 'hypothetical, often modeled hundreds of AU from the Sun', status: 'unconfirmed' }
  }
};

const makeSpaceTopic = ({
  id,
  order,
  date = '2026-05-05',
  object,
  category = 'space',
  title,
  type,
  summary,
  diameter,
  temperature,
  composition,
  atmosphere,
  insight,
  latestNews = '',
  scaleReference = null,
  isPlanet = true,
  isJanus = false,
  researchSources = [],
  mediaTokens = []
}) => ({
  id,
  spaceOrder: order,
  solarSystemObject: object,
  category,
  date,
  country: 'Solar System',
  region: type,
  title,
  source: 'topic.earth solar-system model',
  summary,
  insight,
  isPlanet,
  isSpaceTopic: true,
  isJanus,
  isCustom: false,
  researchSources,
  mediaTokens,
  media: mediaTokens.map(token => token.url || token.thumbnailUrl || '').filter(Boolean),
  planetData: {
    name: object,
    type,
    diameter,
    temperature,
    composition,
    atmosphere,
    latestNews,
    scaleReference
  }
});

export const SPACE_TOPICS = [
  makeSpaceTopic({
    id: 'space_sun',
    order: 1,
    object: 'Sun',
    title: 'Sun',
    type: 'Star',
    summary: 'The star at the center of the solar system, providing the energy that drives planetary climate and orbital context.',
    diameter: '1,391,000 km',
    temperature: `5,500${degreeC} surface, about 15,000,000${degreeC} core`,
    composition: 'Hydrogen, helium, and trace heavier elements',
    atmosphere: 'Photosphere, chromosphere, and corona',
    insight: 'Use the Sun as the anchor for scale, energy, and orbital relationships in Space mode.'
  }),
  makeSpaceTopic({
    id: 'space_mercury',
    order: 2,
    object: 'Mercury',
    title: 'Mercury',
    type: 'Rocky Planet',
    summary: 'The smallest planet and the closest world to the Sun, with extreme day-night temperature contrast.',
    diameter: '4,879 km',
    temperature: `-173${degreeC} to 427${degreeC}`,
    composition: 'Large iron core with rocky mantle and crust',
    atmosphere: 'Extremely thin exosphere',
    insight: 'Mercury is useful for comparing rocky worlds without a substantial atmosphere.'
  }),
  makeSpaceTopic({
    id: 'space_venus',
    order: 3,
    object: 'Venus',
    title: 'Venus',
    type: 'Rocky Planet',
    summary: 'A near-Earth-size planet with a dense greenhouse atmosphere and sulfuric-acid cloud deck.',
    diameter: '12,104 km',
    temperature: `About 462${degreeC} average`,
    composition: 'Rocky body with iron core, mantle, and crust',
    atmosphere: `Dense ${carbonDioxide} with nitrogen and sulfuric-acid clouds`,
    insight: 'Venus is the strongest nearby example of runaway greenhouse conditions.'
  }),
  makeSpaceTopic({
    id: 'space_earth',
    order: 4,
    object: 'Earth',
    title: 'Earth',
    type: 'Rocky Planet',
    summary: 'The only known living planet, with liquid water, active climate systems, and a nitrogen-oxygen atmosphere.',
    diameter: '12,742 km',
    temperature: `About 15${degreeC} average`,
    composition: 'Iron core, silicate mantle, oceanic and continental crust',
    atmosphere: `Nitrogen, oxygen, argon, water vapor, and ${carbonDioxide}`,
    insight: 'Earth links Space mode back to the climate, regional, and topic layers.'
  }),
  makeSpaceTopic({
    id: 'space_moon',
    order: 5,
    object: 'Moon',
    title: 'Moon',
    type: 'Natural Satellite',
    summary: 'Earth\'s natural satellite, central to tides, eclipses, and near-Earth exploration planning.',
    diameter: '3,474 km',
    temperature: `-173${degreeC} to 127${degreeC}`,
    composition: 'Rocky body with a small iron-rich core',
    atmosphere: 'Very thin exosphere',
    insight: 'The visible Moon path is an enlarged mean-element ellipse around the moving Earth: eccentricity 0.0549, inclination 5.145 degrees to the ecliptic, and sidereal period 27.32166 days. Its orbital period uses the same simulation clock as Earth; its rotation is synchronous. Distance is enlarged for readability. Orbital orientation and starting phase are illustrative, not a live ephemeris; solar perturbations and precession are omitted. <a href="https://eclipse.gsfc.nasa.gov/SEhelp/moonorbit.html" target="_blank" rel="noopener noreferrer">NASA: lunar orbit</a>. <a href="https://ssd.jpl.nasa.gov/horizons/" target="_blank" rel="noopener noreferrer">JPL Horizons: date-specific positions</a>.'
  }),
  makeSpaceTopic({
    id: 'space_mars',
    order: 6,
    object: 'Mars',
    title: 'Mars',
    type: 'Rocky Planet',
    summary: 'The red planet, with a thin atmosphere, polar ice, ancient water evidence, and strong mission relevance.',
    diameter: '6,779 km',
    temperature: `About -63${degreeC} average`,
    composition: 'Iron-rich rocky body with oxidized surface minerals',
    atmosphere: `Thin ${carbonDioxide} with nitrogen and argon`,
    insight: 'Mars is the key comparison world for habitability, planetary change, and future crewed missions.'
  }),
  makeSpaceTopic({
    id: 'space_jupiter',
    order: 7,
    object: 'Jupiter',
    title: 'Jupiter',
    type: 'Gas Giant',
    summary: 'The largest planet, with powerful storms, strong radiation belts, and many moons.',
    diameter: '139,820 km',
    temperature: `About -108${degreeC} at cloud tops`,
    composition: 'Mostly hydrogen and helium',
    atmosphere: 'Hydrogen and helium with ammonia, methane, and cloud bands',
    insight: 'Jupiter sets the scale for giant planets and helps explain orbital protection and outer-system structure.'
  }),
  makeSpaceTopic({
    id: 'space_saturn',
    order: 8,
    object: 'Saturn',
    title: 'Saturn',
    type: 'Gas Giant',
    summary: 'The ringed giant, known for its bright ice rings and complex moon system.',
    diameter: '116,460 km',
    temperature: `About -178${degreeC} at cloud tops`,
    composition: 'Mostly hydrogen and helium',
    atmosphere: 'Hydrogen and helium with ammonia ice clouds',
    insight: 'Saturn makes ring systems and icy satellite environments easy to inspect in Space mode.'
  }),
  makeSpaceTopic({
    id: 'space_uranus',
    order: 9,
    object: 'Uranus',
    title: 'Uranus',
    type: 'Ice Giant',
    summary: 'An ice giant tilted almost sideways, with methane-rich blue-green atmosphere.',
    diameter: '50,724 km',
    temperature: `About -224${degreeC} in the upper atmosphere`,
    composition: 'Water, methane, and ammonia ices over a rocky core',
    atmosphere: 'Hydrogen, helium, and methane',
    insight: 'Uranus is useful for exploring seasonal extremes and ice-giant composition.'
  }),
  makeSpaceTopic({
    id: 'space_neptune',
    order: 10,
    object: 'Neptune',
    title: 'Neptune',
    type: 'Ice Giant',
    summary: 'The outer ice giant, with fast winds and a methane-tinted atmosphere.',
    diameter: '49,244 km',
    temperature: `About -214${degreeC} at cloud tops`,
    composition: 'Water, methane, and ammonia ices over a rocky core',
    atmosphere: 'Hydrogen, helium, and methane',
    insight: 'Neptune closes the major-planet sequence and highlights outer-system weather.'
  }),
  makeSpaceTopic({
    id: 'space_pluto',
    order: 11,
    object: 'Pluto',
    title: 'Pluto',
    type: 'Dwarf Planet',
    summary: 'A dwarf planet in the Kuiper belt with icy terrain and a thin seasonal atmosphere.',
    diameter: '2,377 km',
    temperature: `About -229${degreeC}`,
    composition: 'Rock and ice, including nitrogen, methane, and carbon monoxide ice',
    atmosphere: 'Thin nitrogen-rich atmosphere when near the Sun',
    insight: 'Pluto keeps small icy worlds visible in the Space topic set.'
  }),
  makeSpaceTopic({
    id: 'space_titan',
    order: 12,
    object: 'Titan',
    title: 'Titan',
    type: 'Saturn Moon',
    summary: 'Saturn\'s largest moon, with a dense nitrogen atmosphere, methane weather, hydrocarbon lakes, and strong astrobiology interest.',
    diameter: '5,149 km',
    temperature: `About -179${degreeC}`,
    composition: 'Water ice, rock, organic compounds, methane and ethane surface liquids',
    atmosphere: 'Dense nitrogen atmosphere with methane',
    insight: 'Titan is useful for comparing climate-like cycles beyond Earth: clouds, rain, lakes, and seasonal atmospheric chemistry.'
  }),
  makeSpaceTopic({
    id: 'space_enceladus',
    order: 13,
    object: 'Enceladus',
    title: 'Enceladus',
    type: 'Saturn Moon',
    summary: 'A small icy moon of Saturn with active geysers, a subsurface ocean, and chemistry that makes it one of the strongest ocean-world science targets.',
    diameter: '504 km',
    temperature: `About -201${degreeC}`,
    composition: 'Water ice shell, salty ocean, rocky core, plume material',
    atmosphere: 'Very thin plume-fed water vapor environment',
    insight: 'Enceladus connects the solar-system scene to ocean worlds and life-detection science.'
  }),
  makeSpaceTopic({
    id: 'space_planet9',
    order: 14,
    object: 'Planet9',
    title: 'Planet 9 (hypothetical)',
    type: 'Hypothetical Planet',
    summary: 'A hypothetical outer solar-system planet used here as a special-orbit topic. Its existence is not confirmed, so the scene should label it as a model and not a detected planet.',
    diameter: 'Unknown; often discussed as super-Earth/sub-Neptune scale',
    temperature: 'Unknown',
    composition: 'Unknown',
    atmosphere: 'Unknown',
    insight: 'The dashed path illustrates one published Planet Nine hypothesis: semimajor axis 380 AU, perihelion 300 AU, eccentricity about 0.211, and inclination 16 degrees (Brown and Batygin, 2021). Kepler\'s third law gives an orbital period of about 7,408 years. Display distances are compressed; the Sun is at a focus. Orientation and starting phase are arbitrary and are not a sky-position prediction. At the shared simulation speed it barely moves during a human visit. This is a two-body teaching model, not a demonstration of long-term dynamical stability. Planet Nine remains unconfirmed. <a href="https://arxiv.org/abs/2108.09868" target="_blank" rel="noopener noreferrer">Primary study and uncertainties</a>. <a href="https://science.nasa.gov/solar-system/planet-x/" target="_blank" rel="noopener noreferrer">NASA: hypothetical Planet X</a>.'
  }),
  makeSpaceTopic({
    id: 'space_starship',
    order: 15,
    object: 'Spaceship',
    title: 'Starship',
    type: 'Spacecraft',
    summary: 'A reusable heavy-lift spacecraft concept for missions to orbit, the Moon, Mars, and beyond.',
    diameter: '9 m diameter, 50+ m height with Super Heavy',
    temperature: 'Cryogenic propellant conditions through high re-entry heating',
    composition: 'Stainless steel structure with methane and oxygen propulsion',
    atmosphere: 'Pressurized crew volume when configured for crewed missions',
    insight: 'Starship is a technology topic: useful for connecting exploration, launch cadence, and Mars mission planning.',
    latestNews: 'Starship program and test-flight updates'
  }),
  makeSpaceTopic({
    id: 'space_asteroid_atlas31',
    order: 16,
    object: 'Atlas31',
    title: 'Atlas31 Asteroid',
    type: 'Near-Earth Asteroid',
    summary: 'A model asteroid topic for planetary-defense tracking and orbital-risk storytelling.',
    diameter: 'Estimated 150-300 m',
    temperature: `Varies with solar distance`,
    composition: 'Rocky and metallic material',
    atmosphere: 'None',
    insight: 'Asteroid topics can later connect to live tracking, warning systems, and planetary-defense research.'
  }),
  makeSpaceTopic({
    id: 'space_asteroid_atlas32',
    order: 17,
    object: 'Asteroid2',
    title: 'Atlas32 Asteroid',
    type: 'Near-Earth Asteroid',
    summary: 'A companion asteroid topic for comparing small-body paths, size, and observation uncertainty.',
    diameter: 'Estimated 120-250 m',
    temperature: `Varies with solar distance`,
    composition: 'Silicate material with possible metallic inclusions',
    atmosphere: 'None',
    insight: 'Keeping multiple asteroid topics makes Space mode ready for a future near-Earth object feed.'
  }),
  makeSpaceTopic({
    id: 'space_esa_earth_observation',
    order: 18,
    object: 'Earth',
    title: 'ESA Earth Observation',
    type: 'Civil Space Agency',
    summary: 'European Space Agency Earth-observation missions monitor climate, oceans, ice, land, atmosphere, and disaster signals for public-interest science and sustainability.',
    diameter: 'Agency / satellite network topic',
    temperature: 'Focuses on Earth climate and environmental indicators',
    composition: 'Civil satellite missions, science data services, open observation programs',
    atmosphere: 'Atmospheric monitoring through missions such as Copernicus Sentinel and ESA climate programs',
    insight: 'This topic keeps Space mode connected to Earth care: satellites are useful here when they help observe climate risk, protect ecosystems, and support transparent public knowledge.',
    latestNews: 'ESA Earth observation, climate, and sustainability updates',
    researchSources: [
      {
        name: 'ESA Earth Observation',
        url: 'https://www.esa.int/Applications/Observing_the_Earth',
        category: 'official',
        reliability: 'high',
        verified: true
      },
      {
        name: 'ESA Vimeo evidence',
        url: 'https://player.vimeo.com/video/1197557002?h=220b6f5a22',
        category: 'media',
        reliability: 'needs-review',
        verified: true,
        provider: 'vimeo'
      },
      {
        name: 'Copernicus programme',
        url: 'https://www.copernicus.eu/',
        category: 'official',
        reliability: 'high',
        verified: true
      }
    ],
    mediaTokens: [
      {
        id: 'media_esa_vimeo_1197557002',
        url: '',
        thumbnailUrl: '',
        sourceUrl: 'https://player.vimeo.com/video/1197557002?h=220b6f5a22',
        sourceName: 'ESA Vimeo evidence',
        provider: 'vimeo',
        mediaType: 'vimeo',
        embedUrl: 'https://player.vimeo.com/video/1197557002?h=220b6f5a22',
        videoId: '1197557002',
        watermarkText: 'ESA Vimeo | topic.earth research'
      }
    ]
  }),
  makeSpaceTopic({
    id: 'space_ozone_hole_watch',
    order: 18.1,
    object: 'Earth',
    title: 'Antarctic Ozone Hole Watch',
    type: 'Atmosphere Watch',
    summary: 'A Space-mode atmosphere topic for the Antarctic ozone hole, linked to NASA Ozone Watch and ready for live imagery overlays from NASA Worldview/GIBS.',
    diameter: 'Atmospheric column topic',
    temperature: 'Controlled by polar stratospheric temperature and sunlight timing',
    composition: 'Total column ozone measured in Dobson Units; ozone-hole area is where total ozone is below 220 DU',
    atmosphere: 'Stratospheric ozone over Antarctica',
    insight: 'This belongs in Space mode because the reality signal is measured from orbit. Keep the topic synced to NASA Ozone Watch for the latest seasonal status and use GIBS/Worldview layers for imagery where available.',
    latestNews: 'NASA Ozone Watch latest Antarctic ozone status',
    researchSources: [
      {
        name: 'NASA Ozone Watch',
        url: 'https://ozonewatch.gsfc.nasa.gov/',
        category: 'official',
        reliability: 'high',
        verified: true
      },
      {
        name: 'NASA Knows: The Ozone Hole',
        url: 'https://science.nasa.gov/earth/explore/nasa-knows-the-ozone-hole/',
        category: 'official',
        reliability: 'high',
        verified: true
      },
      {
        name: 'NASA GIBS available visualizations',
        url: 'https://nasa-gibs.github.io/gibs-api-docs/available-visualizations/',
        category: 'imagery',
        reliability: 'high',
        verified: true
      }
    ],
    mediaTokens: [
      {
        id: 'media_nasa_ozone_watch',
        url: '',
        thumbnailUrl: '',
        sourceUrl: 'https://ozonewatch.gsfc.nasa.gov/',
        sourceName: 'NASA Ozone Watch',
        provider: 'iframe',
        mediaType: 'iframe',
        embedUrl: 'https://ozonewatch.gsfc.nasa.gov/',
        watermarkText: 'NASA Ozone Watch | official atmospheric data'
      }
    ]
  }),
  makeSpaceTopic({
    id: 'space_satellite_aura_omi',
    order: 18.2,
    object: 'Aura',
    title: 'Aura / OMI Atmosphere Watch',
    type: 'Earth Observation Satellite',
    summary: 'Aura monitors atmospheric chemistry. Its Ozone Monitoring Instrument continues the long ozone record and supports ozone, aerosol, air-quality, and climate context.',
    diameter: 'Satellite topic',
    temperature: 'Low Earth orbit thermal environment',
    composition: 'Aura spacecraft with atmospheric chemistry instruments including OMI',
    atmosphere: 'Ozone, aerosols, and key atmospheric trace gases',
    insight: 'Aura is the right Space-mode anchor for ozone-hole and atmospheric composition topics.',
    latestNews: 'Aura and OMI atmosphere monitoring updates',
    mediaTokens: [
      {
        id: 'media_nasa_eyes_aura',
        url: '',
        thumbnailUrl: '',
        sourceUrl: 'https://eyes.nasa.gov/apps/solar-system/#/sc_aura',
        sourceName: 'NASA Eyes on the Solar System',
        provider: 'iframe',
        mediaType: 'iframe',
        embedUrl: 'https://eyes.nasa.gov/apps/solar-system/#/sc_aura',
        watermarkText: 'NASA Eyes | Aura spacecraft visualization'
      }
    ],
    researchSources: [
      {
        name: 'NASA Aura mission',
        url: 'https://science.nasa.gov/mission/aura/',
        category: 'official',
        reliability: 'high',
        verified: true
      },
      {
        name: 'Aura Ozone Monitoring Instrument',
        url: 'https://aura.gsfc.nasa.gov/omi.html',
        category: 'official',
        reliability: 'high',
        verified: true
      }
    ]
  }),
  makeSpaceTopic({
    id: 'space_satellite_oco2',
    order: 18.3,
    object: 'OCO2',
    title: 'OCO-2 Carbon Observatory',
    type: 'Earth Observation Satellite',
    summary: 'OCO-2 provides daily global measurements used to track carbon movement through Earth systems and monitor vegetation health.',
    diameter: 'Satellite topic',
    temperature: 'Low Earth orbit thermal environment',
    composition: 'Orbiting Carbon Observatory-2 spacecraft and spectrometers',
    atmosphere: 'Atmospheric carbon dioxide columns and plant fluorescence',
    insight: 'OCO-2 connects Space mode directly to carbon-cycle and climate intelligence topics.',
    latestNews: 'OCO-2 carbon monitoring updates',
    researchSources: [
      {
        name: 'NASA OCO-2 mission',
        url: 'https://science.nasa.gov/mission/oco-2/',
        category: 'official',
        reliability: 'high',
        verified: true
      }
    ]
  }),
  makeSpaceTopic({
    id: 'space_satellite_pace',
    order: 18.4,
    object: 'PACE',
    title: 'PACE Ocean-Atmosphere Watch',
    type: 'Earth Observation Satellite',
    summary: 'PACE observes ocean color, aerosols, clouds, and particles in the air to reveal ocean-atmosphere climate connections.',
    diameter: 'Satellite topic',
    temperature: 'Low Earth orbit thermal environment',
    composition: 'PACE spacecraft with OCI, SPEXone, and HARP2 instruments',
    atmosphere: 'Aerosols, clouds, airborne particles, and ocean color',
    insight: 'PACE is the best Space-mode topic for live ocean-atmosphere imagery and climate-sensitive biological signals.',
    latestNews: 'PACE ocean, aerosol, and cloud monitoring updates',
    researchSources: [
      {
        name: 'NASA PACE mission',
        url: 'https://science.nasa.gov/mission/pace/',
        category: 'official',
        reliability: 'high',
        verified: true
      }
    ]
  }),
  makeSpaceTopic({
    id: 'space_solar_system_scale_guide',
    order: 19,
    object: 'Earth',
    title: 'Solar System Scale Guide',
    type: 'Educational Scale Reference',
    summary: 'A guide topic for reading the solar-system scene: planet diameters and orbital distances are compressed so the model remains navigable, while Earth diameter and Earth orbit provide the real comparison units.',
    diameter: 'Earth = 1 diameter unit; current Sun = about 109.2 Earth diameters',
    temperature: 'Not a temperature topic',
    composition: 'Scale cotation guide, Earth-ratio comparison, astronomical-unit distance comparison',
    atmosphere: 'The // break marks on guide lines mean distance is visually compressed.',
    insight: 'Use this topic to explain that the solar-system scene is a readable model, not a literal scale model. Earth is the reference: 1 Earth diameter for size and 1 AU for average Sun-Earth orbital distance.',
    latestNews: 'Scale values can later be refreshed from official planetary fact sheets or ephemeris services.',
    scaleReference: SOLAR_SYSTEM_SCALE_REFERENCE,
    researchSources: [
      {
        name: 'NASA Solar System Facts',
        url: 'https://science.nasa.gov/solar-system/solar-system-facts/',
        category: 'official',
        reliability: 'high',
        verified: true
      },
      {
        name: 'NASA Sun Facts',
        url: 'https://science.nasa.gov/sun/facts/',
        category: 'official',
        reliability: 'high',
        verified: true
      },
      {
        name: 'NASA Planet Sizes and Locations',
        url: 'https://science.nasa.gov/solar-system/planet-sizes-and-locations-in-our-solar-system/',
        category: 'official',
        reliability: 'high',
        verified: true
      }
    ]
  }),
  makeSpaceTopic({
    id: 'space_nasa_eyes_solar_system',
    order: 20,
    object: 'Earth',
    title: 'NASA Eyes on the Solar System',
    type: 'Interactive Reference',
    summary: 'NASA Eyes is an official interactive 3D reference for exploring planets, moons, spacecraft, asteroids, and Earth-observation missions. topic.earth can use it as an embedded evidence/reference panel while keeping its own educational scene lightweight.',
    diameter: 'External interactive reference',
    temperature: 'Not a temperature topic',
    composition: 'NASA interactive 3D scene, spacecraft trajectories, small bodies, Earth science missions',
    atmosphere: 'Can be embedded as iframe evidence where NASA permits it',
    insight: 'Use NASA Eyes as the source/reference layer for verified paths and mission context; keep topic.earth as the curated teaching and climate-navigation layer.',
    researchSources: [
      {
        name: 'NASA Eyes',
        url: 'https://science.nasa.gov/eyes/',
        category: 'official',
        reliability: 'high',
        verified: true
      },
      {
        name: 'NASA Eyes on the Solar System',
        url: 'https://eyes.nasa.gov/apps/solar-system/#/home',
        category: 'interactive',
        reliability: 'high',
        verified: true
      }
    ],
    mediaTokens: [
      {
        id: 'media_nasa_eyes_solar_system',
        url: '',
        thumbnailUrl: '',
        sourceUrl: 'https://eyes.nasa.gov/apps/solar-system/#/home?embed=true',
        sourceName: 'NASA Eyes on the Solar System',
        provider: 'iframe',
        mediaType: 'iframe',
        embedUrl: 'https://eyes.nasa.gov/apps/solar-system/#/home?embed=true',
        watermarkText: 'NASA Eyes | official interactive reference'
      }
    ]
  }),
  makeSpaceTopic({
    id: 'space_chronos_habitable_world',
    order: 20.5,
    date: '2026-10-01',
    object: 'Earth',
    title: 'Chronos: A Habitable World, a Brief Humanity',
    type: 'Deep Time, SETI and Planetary Responsibility',
    isPlanet: false,
    summary: 'Billions of years built the conditions we inhabit. Connect the Drake equation, the Moon-forming impact, planetary habitability and climate feedbacks to a more humble view of humanity: powerful enough to disturb our home, responsible for caring for it.',
    insight: '<p><strong>The Drake equation:</strong> N = R* × fp × ne × fl × fi × fc × L. R* is the rate of suitable star formation; fp is the fraction with planets; ne is the number of suitable worlds per system; fl, fi and fc describe life, intelligence and detectable technology; L is the duration of detectable technological activity. This framework organizes uncertainty; several terms remain poorly constrained.</p><p><strong>Chance and planetary history:</strong> a giant impact around 4.5 billion years ago likely formed the Moon. Research suggests impactor material may survive deep in Earth\'s mantle. A connection to the emergence of plate tectonics is a hypothesis, not an established explanation. Explore collision histories within habitability (ne), without inventing a probability or multiplying in a separate Moon factor that double-counts habitability. A large moon is not a proven universal requirement for life.</p><p><strong>Chronos / deep time:</strong> the Solar System began forming about 4.6 billion years ago; formation was a process, not a single instant. On a one-year calendar representing that span, 200 years occupy about 1.4 seconds. Human urgency unfolds inside planetary timescales.</p><p><strong>The climate snowball:</strong> here “snowball” means accumulating consequences and amplifying feedbacks. Human emissions drive warming. A literal Snowball Earth is an ancient glaciation concept, not the expected outcome of current climate inaction. Natural geological climate regulation does not promise a timely rescue from rapid emissions.</p><p><strong>Responsibility and L:</strong> civilization\'s ability to sustain itself is an ethical question prompted by Drake\'s longevity term, not a prediction from the equation. We inherited conditions built over billions of years. A brief presence can carry a lasting responsibility.</p><p><strong>Read the evidence:</strong> <a href="https://www.seti.org/research/seti-101/drake-equation/" target="_blank" rel="noopener noreferrer">SETI: Drake equation</a> · <a href="https://science.nasa.gov/moon/formation/" target="_blank" rel="noopener noreferrer">NASA: Moon formation</a> · <a href="https://www.nature.com/articles/s41586-023-06589-1" target="_blank" rel="noopener noreferrer">Theia and mantle structures (modelling study)</a> · <a href="https://science.nasa.gov/astrobiology/learning-resources/alp/how-did-our-solar-system-form/" target="_blank" rel="noopener noreferrer">NASA: Solar System formation</a> · <a href="https://www.ipcc.ch/report/ar6/wg1/resources/spm-headline-statements/" target="_blank" rel="noopener noreferrer">IPCC: human-caused warming</a>.</p>',
    researchSources: [
      { name: 'SETI Institute: Drake equation', url: 'https://www.seti.org/research/seti-101/drake-equation/', category: 'official', reliability: 'high', verified: true },
      { name: 'NASA: Moon formation', url: 'https://science.nasa.gov/moon/formation/', category: 'official', reliability: 'high', verified: true },
      { name: 'IPCC AR6: physical science headline statements', url: 'https://www.ipcc.ch/report/ar6/wg1/resources/spm-headline-statements/', category: 'scientific-assessment', reliability: 'high', verified: true }
    ]
  }),
  makeSpaceTopic({
    id: 'space_janus_system',
    order: 21,
    object: 'Universe',
    category: 'janus-system',
    title: 'Janus System: Two Interacting Sectors',
    type: 'Speculative Bimetric Cosmology',
    summary: 'The Janus cosmological model proposes that the universe can be described with two coupled space-time metrics. In simplified terms, ordinary matter belongs to one sector while a second sector has opposite mass and energy signs; the two sectors interact mainly through gravity.',
    diameter: 'No measured size or scale ratio; the displayed ratios are illustrative controls',
    temperature: 'Not a temperature model',
    composition: 'A positive-energy sector and a hypothetical negative-energy sector described by two coupled metrics',
    atmosphere: 'Cosmological theory, not a planetary atmosphere',
    insight: 'The model attempts to explain observations such as cosmic acceleration and large-scale structure without conventional dark matter or dark energy. The mirrored hemispheres and opposite arrows are teaching aids only: they do not prove that a second sector exists, do not show literal twin planets, and do not solve the model\'s field equations. Janus remains a speculative, non-consensus proposal that must be compared with established cosmology and observational tests.',
    isPlanet: false,
    isJanus: true,
    researchSources: [
      {
        name: 'Petit, Margnat and Zejli: bimetric twin-universe model (2024)',
        url: 'https://arxiv.org/abs/2412.04644',
        category: 'primary-theoretical-source',
        reliability: 'theoretical-preprint',
        verified: true
      },
      {
        name: 'Planck 2018 cosmological parameters',
        url: 'https://arxiv.org/abs/1807.06209',
        category: 'comparison-reference',
        reliability: 'high',
        verified: true
      }
    ]
  })
];
