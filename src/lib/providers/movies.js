import { BaseProvider } from './base';
import { TAB_ID, SUBJECT_TYPE } from '../constants';

/**
 * Movies Provider - handles all movie/series content from the main API.
 * This is the primary provider for the streaming platform.
 */
export class MoviesProvider extends BaseProvider {
  getName() {
    return 'movies';
  }

  getDefaultTabId() {
    return TAB_ID.HOME;
  }

  getSubjectType() {
    return null; // Movies provider handles all types
  }

  // Override browse to add default sorting
  async browse(params = {}) {
    const defaults = {
      sort: 'Hottest',
      page: 1,
    };
    return super.browse({ ...defaults, ...params });
  }

  // Convenience methods for specific content types
  async getMovies(page = 1, sort = 'Hottest') {
    return this.getHome(TAB_ID.MOVIE);
  }

  async getTVSeries(page = 1, sort = 'Hottest') {
    return this.getHome(TAB_ID.TV);
  }

  async getAnime(page = 1, sort = 'Hottest') {
    return this.getHome(TAB_ID.ANIME);
  }

  async getAsian(page = 1) {
    return this.getHome(TAB_ID.ASIAN);
  }

  async getWestern(page = 1) {
    return this.getHome(TAB_ID.WESTERN);
  }
}

export default MoviesProvider;
