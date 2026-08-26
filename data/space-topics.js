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
  object,
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
  researchSources = [],
  mediaTokens = []
}) => ({
  id,
  spaceOrder: order,
  solarSystemObject: object,
  category: 'space',
  date: '2026-05-05',
  country: 'Solar System',
  region: type,
  title,
  source: 'topic.earth solar-system model',
  summary,
  insight,
  isPlanet: true,
  isSpaceTopic: true,
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
    insight: 'The Moon is a bridge topic between Earth systems and human exploration.'
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
    title: 'Planet 9',
    type: 'Hypothetical Planet',
    summary: 'A hypothetical outer solar-system planet used here as a special-orbit topic. Its existence is not confirmed, so the scene should label it as a model and not a detected planet.',
    diameter: 'Unknown; often discussed as super-Earth/sub-Neptune scale',
    temperature: 'Unknown',
    composition: 'Unknown',
    atmosphere: 'Unknown',
    insight: 'Planet 9 is a good place to teach uncertainty: orbital clues can suggest a possible object before direct observation confirms it.'
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
  })
];
