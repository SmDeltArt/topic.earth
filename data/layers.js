export const LAYERS = [
  {
    id: 'earths-fever',
    name: 'Earth\'s Fever',
    icon: '\uD83C\uDF21\uFE0F',
    color: '#ef5350',
    enabled: false,
    feverOnly: true
  },
  {
    id: 'fever-scenarios',
    name: 'Scenario Logic',
    icon: '\uD83D\uDCCA',
    color: '#ffb020',
    enabled: false,
    feverOnly: true
  },
  {
    id: 'tipping-points',
    name: 'Tipping Points',
    icon: '\u26A0\uFE0F',
    color: '#ff3300',
    enabled: false,
    feverOnly: true
  },
  {
    id: 'amoc-watch',
    name: 'AMOC Watch',
    icon: '\uD83C\uDF0A',
    color: '#0099cc',
    enabled: false,
    feverOnly: true
  },
  {
    id: 'meteo-clouds',
    name: 'Clouds',
    modeTabs: ['main', 'regional'],
    sortByRegionalContext: true,
    icon: '\u2601\uFE0F',
    color: '#b6d8ff',
    enabled: true,
    layerKind: 'shell-texture',
    renderer: {
      radius: 1.032,
      opacity: 0.78,
      rotationSpeed: 0.00012
    }
  },
  {
    id: 'meteo-live',
    name: 'Live Meteo',
    modeTabs: ['main', 'regional'],
    sortByRegionalContext: true,
    icon: '\u26C5',
    color: '#7dd3fc',
    enabled: true,
    layerKind: 'markers',
    realtimeSource: 'open-meteo'
  },
  {
    id: 'regional-news',
    name: 'Regional News',
    modeTabs: ['regional'],
    sortByRegionalContext: true,
    icon: '\uD83D\uDCF0',
    color: '#81c784',
    enabled: true
  },
  {
    id: 'community-projects',
    name: 'Community Projects',
    modeTabs: ['regional'],
    sortByRegionalContext: true,
    icon: '\uD83E\uDD1D',
    color: '#74c69d',
    enabled: true
  },
  {
    id: 'country-news',
    name: 'Country News',
    modeTabs: ['main', 'regional'],
    icon: '\uD83D\uDDDE\uFE0F',
    color: '#ffb74d',
    enabled: true
  },
  {
    id: 'eu',
    name: 'EU',
    modeTabs: ['main', 'regional'],
    icon: '\uD83C\uDDEA\uD83C\uDDFA',
    color: '#64b5f6',
    enabled: true
  },
  {
    id: 'world',
    name: 'World',
    icon: '\uD83C\uDF0D',
    color: '#ba68c8',
    enabled: true
  },
  {
    id: 'good-initiatives-world',
    name: 'World Good Initiatives',
    modeTabs: ['main'],
    icon: '\uD83C\uDF31',
    color: '#74c69d',
    enabled: true
  },
  {
    id: 'good-initiatives-eu',
    name: 'EU Good Initiatives',
    modeTabs: ['main', 'regional'],
    icon: '\uD83C\uDDEA\uD83C\uDDFA',
    color: '#8bdc7f',
    enabled: true
  },
  {
    id: 'bike-ways',
    name: 'Bike Ways',
    modeTabs: ['regional'],
    sortByRegionalContext: true,
    icon: '\uD83D\uDEB2',
    color: '#66bb6a',
    enabled: true
  },
  {
    id: 'ev-charging',
    name: 'EV Charging',
    modeTabs: ['regional'],
    sortByRegionalContext: true,
    icon: '\u26A1',
    color: '#26c6da',
    enabled: true
  },
  {
    id: 'hydrogen-charging',
    name: 'Hydrogen H2',
    modeTabs: ['regional'],
    sortByRegionalContext: true,
    icon: 'H2',
    color: '#ffd54f',
    enabled: true
  },
  {
    id: 'space',
    name: 'Space',
    icon: '\uD83D\uDEF0\uFE0F',
    color: '#9575cd',
    enabled: false
  },
  {
    id: 'climate',
    name: 'Climate Change',
    icon: '\uD83C\uDF21\uFE0F',
    color: '#ff8a65',
    enabled: true
  },
  {
    id: 'carbon-history',
    name: 'Carbon History',
    modeTabs: ['main'],
    icon: '\uD83D\uDD70\uFE0F',
    color: '#f6c85f',
    enabled: false,
    chronologySort: 'asc'
  },
  {
    id: 'extreme',
    name: 'Extreme Events',
    icon: '\u26A0\uFE0F',
    color: '#ef5350',
    enabled: true
  }
];
