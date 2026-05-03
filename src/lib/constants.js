// API Configuration - loaded from environment variables on server-side
export const API_BASE_URL = process.env.STREAMKEUN_API_BASE || 'https://rest-api.streamkeun.web.id/v1/movies';
export const API_KEY = process.env.STREAMKEUN_API_KEY || '';

// Subject types
export const SUBJECT_TYPE = {
  MOVIE: 1,
  SERIES: 2,
  ANIME: 4,
  SHORT_TV: 7,
};

// Tab IDs for /home endpoint
export const TAB_ID = {
  HOME: 0,
  TRENDING: 1,
  MOVIE: 2,
  TV: 5,
  ANIME: 8,
  SHORT_TV: 13,
  ASIAN: 18,
  WESTERN: 19,
  KIDS: 23,
  INDONESIA: 29,
};

// Section types from home API
export const SECTION_TYPE = {
  BANNER: 'BANNER',
  SUBJECTS_MOVIE: 'SUBJECTS_MOVIE',
  FILTER: 'FILTER',
  CUSTOM: 'CUSTOM',
  APPOINTMENT_LIST: 'APPOINTMENT_LIST',
};

// Sort options for browse
export const SORT_OPTIONS = {
  HOTTEST: 'Hottest',
  RATING: 'Rating',
  NEWEST: 'Newest',
};
