export const SOURCE_CATEGORIES = [
  {
    id: 'official',
    name: 'Official Sources',
    icon: '🏛️',
    color: '#64b5f6',
    sources: [
      { name: 'European Commission', domain: 'ec.europa.eu' },
      { name: 'European Parliament', domain: 'europarl.europa.eu' },
      { name: 'National Agencies', domain: 'gov.*' }
    ]
  },
  {
    id: 'scientific',
    name: 'Scientific',
    icon: '🔬',
    color: '#81c784',
    sources: [
      { name: 'Nature', domain: 'nature.com' },
      { name: 'Science', domain: 'science.org' },
      { name: 'Research Journals', domain: 'academic' }
    ]
  },
  {
    id: 'media',
    name: 'Major Media',
    icon: '📰',
    color: '#ffb74d',
    sources: [
      { name: 'Reuters', domain: 'reuters.com' },
      { name: 'AP News', domain: 'apnews.com' },
      { name: 'BBC', domain: 'bbc.com' }
    ]
  },
  {
    id: 'favorites',
    name: 'Favorites',
    icon: '⭐',
    color: '#ba68c8',
    sources: []
  }
];

export const AI_ACTIONS = [
  {
    id: 'post-draft',
    label: 'Create Post Draft',
    icon: '✍️',
    description: 'Generate a social media post based on research'
  },
  {
    id: 'research-brief',
    label: 'Build Research Brief',
    icon: '📋',
    description: 'Create a comprehensive research summary'
  },
  {
    id: 'compare-sources',
    label: 'Compare Sources',
    icon: '⚖️',
    description: 'Analyze different perspectives on the topic'
  },
  {
    id: 'suggest-angles',
    label: 'Suggest Angles',
    icon: '🔍',
    description: 'Find related research directions'
  }
];

export const LAYER_SOURCE_MAPPING = {
  'meteo': ['scientific', 'official'],
  'climate': ['scientific', 'official'],
  'eu': ['official', 'media'],
  'country-news': ['media', 'official'],
  'regional-news': ['media', 'official'],
  'world': ['media', 'official'],
  'extreme': ['scientific', 'media', 'official']
};