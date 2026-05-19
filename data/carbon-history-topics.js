const source = (name, url, category = 'official') => ({
  name,
  url,
  category,
  reliability: category === 'scientific' ? 'scholarly' : 'primary',
  verified: true
});

const mediaToken = ({ id, url, sourceName, sourceUrl, watermarkText }) => ({
  id,
  url,
  sourceName,
  sourceUrl,
  watermarkText: watermarkText || `${sourceName} | Carbon History`,
  provider: 'source-url',
  generated: false,
  createdAt: '2026-05-15'
});

const makeCarbonHistoryTopic = ({
  id,
  sequence,
  track,
  title,
  date,
  periodEnd = '',
  country,
  region,
  lat,
  lon,
  summary,
  insight,
  sourceName,
  sourceUrl,
  confidence = 'high',
  sensitivity = 'normal',
  reviewStatus = 'reviewed',
  sources = [],
  mediaTokens = []
}) => ({
  id,
  category: 'carbon-history',
  title,
  country,
  region,
  date,
  lat,
  lon,
  source: sourceName,
  sourceUrl,
  summary,
  insight,
  isCarbonHistory: true,
  isCustom: false,
  carbonHistory: {
    sequence,
    track,
    chronologyType: 'milestone',
    periodStart: date,
    periodEnd,
    confidence,
    sensitivity,
    reviewStatus,
    sourcesRequired: true
  },
  researchSources: sources.length > 0
    ? sources
    : [source(sourceName, sourceUrl)],
  media: mediaTokens.map(token => token.url).filter(Boolean),
  mediaTokens
});

export const CARBON_HISTORY_TOPICS = [
  makeCarbonHistoryTopic({
    id: 'carbon-history-tyndall-1859',
    sequence: 10,
    track: 'science-understanding',
    title: 'Tyndall tests heat absorption by gases',
    date: '1859-01-01',
    country: 'United Kingdom',
    region: 'London',
    lat: 51.509,
    lon: -0.118,
    sourceName: 'NASA Earth Observatory',
    sourceUrl: 'https://earthobservatory.nasa.gov/features/Tyndall/index.php',
    summary: 'John Tyndall studied how gases absorb radiant heat, helping establish the laboratory basis for later greenhouse-gas science.',
    insight: 'This belongs in the science track, not the fossil-fuel industry track. It explains how the physical mechanism became traceable before modern climate policy existed.'
  }),
  makeCarbonHistoryTopic({
    id: 'carbon-history-drake-well-1859',
    sequence: 20,
    track: 'fossil-carbon-system',
    title: 'Drake Well strikes oil at Titusville',
    date: '1859-08-27',
    country: 'United States',
    region: 'Pennsylvania',
    lat: 41.626,
    lon: -79.673,
    sourceName: 'Drake Well Museum',
    sourceUrl: 'https://www.drakewell.org/about-us/site-history',
    summary: 'The Drake Well struck oil at Titusville, Pennsylvania, becoming a common anchor for the modern petroleum industry.',
    insight: 'Use this as the public start marker for the petroleum-age chronology while keeping earlier scientific and coal-era context available separately.',
    mediaTokens: [
      mediaToken({
        id: 'media-drake-well-museum',
        url: 'https://www.drakewell.org/assets/images/_1200x630_crop_center-center_none/8006/Drake-Well-Museum-SEO-Image.jpg',
        sourceName: 'Drake Well Museum',
        sourceUrl: 'https://www.drakewell.org/about-us/site-history',
        watermarkText: 'Drake Well Museum | Carbon History'
      })
    ],
    sources: [
      source('Drake Well Museum site history', 'https://www.drakewell.org/about-us/site-history'),
      source('Pennsylvania Historical and Museum Commission Drake Well page', 'https://www.pa.gov/agencies/phmc/historic-sites-and-museums/pahistory2go/drake-well-museum')
    ]
  }),
  makeCarbonHistoryTopic({
    id: 'carbon-history-arrhenius-1896',
    sequence: 30,
    track: 'science-understanding',
    title: 'Arrhenius calculates CO2 warming risk',
    date: '1896-04-01',
    country: 'Sweden',
    region: 'Stockholm',
    lat: 59.329,
    lon: 18.068,
    sourceName: 'American Institute of Physics',
    sourceUrl: 'https://history.aip.org/climate/co2.htm',
    summary: 'Svante Arrhenius calculated that industrial carbon dioxide emissions could warm the planet.',
    insight: 'This is an early scientific-understanding marker. The layer should present it as historical theory development, not as a modern emissions measurement.',
    sources: [
      source('AIP: The Carbon Dioxide Greenhouse Effect', 'https://history.aip.org/climate/co2.htm', 'scientific')
    ]
  }),
  makeCarbonHistoryTopic({
    id: 'carbon-history-callendar-1938',
    sequence: 40,
    track: 'science-understanding',
    title: 'Callendar argues CO2 is rising with temperature',
    date: '1938-04-01',
    country: 'United Kingdom',
    region: 'London',
    lat: 51.507,
    lon: -0.128,
    sourceName: 'American Institute of Physics',
    sourceUrl: 'https://history.aip.org/climate/co2.htm',
    summary: 'G. S. Callendar argued that atmospheric carbon dioxide was climbing and raising global temperature.',
    insight: 'This marker helps retrace the shift from theoretical greenhouse physics toward observed industrial-era climate change.',
    sources: [
      source('AIP: The Carbon Dioxide Greenhouse Effect', 'https://history.aip.org/climate/co2.htm', 'scientific')
    ]
  }),
  makeCarbonHistoryTopic({
    id: 'carbon-history-keeling-curve-1958',
    sequence: 50,
    track: 'science-understanding',
    title: 'Keeling begins precise CO2 measurements',
    date: '1958-03-01',
    country: 'United States',
    region: 'Mauna Loa, Hawaii',
    lat: 19.536,
    lon: -155.576,
    sourceName: 'NOAA Global Monitoring Laboratory',
    sourceUrl: 'https://gml.noaa.gov/ccgg/trends/data.html',
    summary: 'Charles David Keeling began precise atmospheric carbon dioxide measurements that became the Keeling Curve.',
    insight: 'This is a measurement backbone for the layer: a recurring evidence point that can later connect to the Fever loop without sharing Fever state.',
    mediaTokens: [
      mediaToken({
        id: 'media-keeling-curve-serc',
        url: 'https://serc.carleton.edu/download/images/28709/keeling_curve.webp',
        sourceName: 'SERC Carleton Keeling Curve image',
        sourceUrl: 'https://serc.carleton.edu/details/images/28709.html',
        watermarkText: 'Keeling Curve image | SERC Carleton'
      })
    ],
    sources: [
      source('NOAA GML CO2 trends', 'https://gml.noaa.gov/ccgg/trends/data.html'),
      source('NASA Earth Observatory: The Keeling Curve', 'https://www.earthobservatory.nasa.gov/images/5620/the-keeling-curve', 'scientific')
    ]
  }),
  makeCarbonHistoryTopic({
    id: 'carbon-history-santa-barbara-1969',
    sequence: 60,
    track: 'pollution-and-impacts',
    title: 'Santa Barbara offshore well blowout',
    date: '1969-01-28',
    country: 'United States',
    region: 'Santa Barbara Channel',
    lat: 34.392,
    lon: -119.842,
    sourceName: 'NOAA IncidentNews',
    sourceUrl: 'https://incidentnews.noaa.gov/incident/6206',
    summary: 'A Union Oil well under Platform A experienced a blowout in the Dos Cuadras field near Santa Barbara, California.',
    insight: 'This is a pollution-impact marker. It should be treated as a dated spill-response event, with later policy effects researched as separate topics.',
    sensitivity: 'sensitive'
  }),
  makeCarbonHistoryTopic({
    id: 'carbon-history-ipcc-1988',
    sequence: 70,
    track: 'policy-and-accountability',
    title: 'IPCC is established',
    date: '1988-01-01',
    country: 'Switzerland',
    region: 'Geneva',
    lat: 46.204,
    lon: 6.143,
    sourceName: 'IPCC',
    sourceUrl: 'https://www.ipcc.ch/about/history/',
    summary: 'The Intergovernmental Panel on Climate Change was established to provide regular scientific assessments for policymakers.',
    insight: 'This marker begins the modern assessment era: science is no longer only historical discovery, but a recurring public-policy evidence process.'
  }),
  makeCarbonHistoryTopic({
    id: 'carbon-history-exxon-valdez-1989',
    sequence: 80,
    track: 'pollution-and-impacts',
    title: 'Exxon Valdez runs aground in Prince William Sound',
    date: '1989-03-24',
    country: 'United States',
    region: 'Alaska',
    lat: 60.84,
    lon: -146.86,
    sourceName: 'U.S. EPA archive',
    sourceUrl: 'https://www.epa.gov/archive/epa/aboutepa/exxon-valdez-oil-spill-report-president-executive-summary.html',
    summary: 'The Exxon Valdez tanker struck Bligh Reef in Prince William Sound, triggering a major oil spill and response failure review.',
    insight: 'Keep this topic focused on the incident, response, and remediation record. Broader company accountability belongs in separate sensitive topics.',
    sensitivity: 'sensitive',
    sources: [
      source('EPA: Exxon Valdez report to the President, executive summary', 'https://www.epa.gov/archive/epa/aboutepa/exxon-valdez-oil-spill-report-president-executive-summary.html'),
      source('NOAA response record', 'https://repository.library.noaa.gov/view/noaa/1742')
    ]
  }),
  makeCarbonHistoryTopic({
    id: 'carbon-history-unfccc-1992',
    sequence: 90,
    track: 'policy-and-accountability',
    title: 'UNFCCC is adopted and opened for signature',
    date: '1992-05-09',
    country: 'Brazil',
    region: 'Rio de Janeiro',
    lat: -22.906,
    lon: -43.173,
    sourceName: 'UNFCCC',
    sourceUrl: 'https://unfccc.int/process-and-meetings/united-nations-framework-convention-on-climate-change',
    summary: 'The United Nations Framework Convention on Climate Change was adopted in 1992 and opened for signature at the Rio Earth Summit.',
    insight: 'This is the treaty-framework anchor for policy history. It should connect climate science to international cooperation, not to a single actor.'
  }),
  makeCarbonHistoryTopic({
    id: 'carbon-history-kyoto-1997',
    sequence: 100,
    track: 'policy-and-accountability',
    title: 'Kyoto Protocol is adopted',
    date: '1997-12-11',
    country: 'Japan',
    region: 'Kyoto',
    lat: 35.011,
    lon: 135.768,
    sourceName: 'UNFCCC',
    sourceUrl: 'https://unfccc.int/process-and-meetings/the-kyoto-protocol',
    summary: 'The Kyoto Protocol was adopted at COP 3, creating binding emissions targets for industrialized countries and economies in transition.',
    insight: 'This marker should sit in the policy/accountability track as a legal-policy milestone, with later ratification and implementation details handled separately.'
  }),
  makeCarbonHistoryTopic({
    id: 'carbon-history-deepwater-horizon-2010',
    sequence: 110,
    track: 'pollution-and-impacts',
    title: 'Deepwater Horizon disaster begins',
    date: '2010-04-20',
    country: 'United States',
    region: 'Gulf of Mexico',
    lat: 28.738,
    lon: -88.366,
    sourceName: 'NOAA Fisheries',
    sourceUrl: 'https://www.fisheries.noaa.gov/content/deepwater-horizon-oil-spill-2010',
    summary: 'An explosion and fire damaged the Deepwater Horizon drilling platform, starting the largest marine oil spill in U.S. history.',
    insight: 'This is a high-sensitivity pollution marker. Keep worker deaths, ecological injury, response, legal settlement, and restoration as source-bound subtopics.',
    sensitivity: 'sensitive',
    mediaTokens: [
      mediaToken({
        id: 'media-deepwater-visible-earth',
        url: 'https://eoimages.gsfc.nasa.gov/images/imagerecords/78000/78061/2010_Oil_Spill_946x710.jpg',
        sourceName: 'NASA Visible Earth',
        sourceUrl: 'https://visibleearth.nasa.gov/images/78061/deepwater-horizon-oil-spill/78062w',
        watermarkText: 'NASA Visible Earth | Deepwater Horizon'
      }),
      mediaToken({
        id: 'media-deepwater-usgs',
        url: 'https://d9-wret.s3.us-west-2.amazonaws.com/assets/palladium/production/s3fs-public/thumbnails/image/oil%20large.jpg',
        sourceName: 'USGS',
        sourceUrl: 'https://www.usgs.gov/media/images/deepwater-horizon-oil-spill',
        watermarkText: 'USGS photo | Deepwater Horizon'
      })
    ]
  }),
  makeCarbonHistoryTopic({
    id: 'carbon-history-carbon-majors-2013',
    sequence: 120,
    track: 'policy-and-accountability',
    title: 'Carbon Majors traces producer-linked emissions',
    date: '2013-11-21',
    country: 'Global',
    region: 'Global dataset',
    lat: 0,
    lon: 0,
    sourceName: 'Climate Accountability Institute',
    sourceUrl: 'https://climateaccountability.org/carbon-majors/',
    summary: 'Richard Heede and the Carbon Majors work traced historic fossil fuel and cement emissions to major producing entities.',
    insight: 'This is sensitive because producer attribution is not the same thing as simple social responsibility. The UI should show method, scope, and caveats.',
    sensitivity: 'sensitive',
    mediaTokens: [
      mediaToken({
        id: 'media-carbon-majors-plastic',
        url: 'https://climateaccountability.org/wp-content/uploads/2020/12/plastic.jpg',
        sourceName: 'Climate Accountability Institute',
        sourceUrl: 'https://climateaccountability.org/carbon-majors/',
        watermarkText: 'Climate Accountability Institute | Carbon Majors'
      })
    ],
    sources: [
      source('Climate Accountability Institute: Carbon Majors', 'https://climateaccountability.org/carbon-majors/'),
      source('Carbon Majors FAQ', 'https://carbonmajors.org/EN/FAQ?lang=EN')
    ]
  }),
  makeCarbonHistoryTopic({
    id: 'carbon-history-paris-agreement-2015',
    sequence: 130,
    track: 'policy-and-accountability',
    title: 'Paris Agreement is adopted',
    date: '2015-12-12',
    country: 'France',
    region: 'Paris',
    lat: 48.857,
    lon: 2.352,
    sourceName: 'UNFCCC',
    sourceUrl: 'https://unfccc.int/process-and-meetings/the-paris-agreement',
    summary: 'The Paris Agreement was adopted as a global climate treaty to strengthen the response to climate change.',
    insight: 'This is a policy anchor that can later connect national pledges, finance, adaptation, and observed warming to the broader chronology.'
  }),
  makeCarbonHistoryTopic({
    id: 'carbon-history-exxonmobil-projections-2023',
    sequence: 140,
    track: 'policy-and-accountability',
    title: 'Study assesses ExxonMobil climate projections',
    date: '2023-01-12',
    country: 'United States',
    region: 'Cambridge, Massachusetts',
    lat: 42.373,
    lon: -71.109,
    sourceName: 'Supran, Rahmstorf and Oreskes',
    sourceUrl: 'https://zenodo.org/records/7537045',
    summary: 'A 2023 peer-reviewed study assessed ExxonMobil global warming projections documented in company records from 1977 to 2003.',
    insight: 'This should remain a sensitive accountability topic. The app should preserve source wording and distinguish internal scientific projections from later public communications and legal claims.',
    sensitivity: 'disputed',
    sources: [
      source('Zenodo record: Assessing ExxonMobil global warming projections', 'https://zenodo.org/records/7537045', 'scientific'),
      source('AP report on the study and company response', 'https://apnews.com/article/e9594dc9adb504a81ec82f4ac2b72ef9', 'media')
    ]
  }),
  makeCarbonHistoryTopic({
    id: 'carbon-history-carbon-majors-2024',
    sequence: 150,
    track: 'policy-and-accountability',
    title: 'Carbon Majors database is relaunched online',
    date: '2024-04-04',
    country: 'United Kingdom',
    region: 'London',
    lat: 51.507,
    lon: -0.128,
    sourceName: 'Carbon Majors',
    sourceUrl: 'https://carbonmajors.org/EN/FAQ?lang=EN',
    summary: 'InfluenceMap and the Climate Accountability Institute relaunched Carbon Majors as an online platform with updates planned annually.',
    insight: 'This is a live-dataset marker. It lets topic.earth separate fixed historical events from source databases that may be updated over time.',
    sensitivity: 'sensitive',
    mediaTokens: [
      mediaToken({
        id: 'media-carbon-majors-hurricane',
        url: 'https://climateaccountability.org/wp-content/uploads/2020/12/hurricane.jpg',
        sourceName: 'Climate Accountability Institute',
        sourceUrl: 'https://climateaccountability.org/carbon-majors/',
        watermarkText: 'Climate Accountability Institute | Carbon Majors'
      })
    ],
    sources: [
      source('Climate Accountability Institute announcement', 'https://climateaccountability.org/carbon-majors/'),
      source('Carbon Majors FAQ', 'https://carbonmajors.org/EN/FAQ?lang=EN')
    ]
  })
];
