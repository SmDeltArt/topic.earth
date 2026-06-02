const degreeC = '\u00B0C';
const carbonDioxide = 'CO\u2082';

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
    latestNews
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
    id: 'space_starship',
    order: 12,
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
    order: 13,
    object: 'Asteroid',
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
    order: 14,
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
    order: 15,
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
  })
];
