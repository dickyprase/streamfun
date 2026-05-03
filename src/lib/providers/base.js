import { getApiClient } from '../api-client';

/**
 * Base content provider class.
 * All providers (Movies, Drama, ShortTV) extend this.
 * Override methods to customize behavior per provider.
 */
export class BaseProvider {
  constructor() {
    this.client = getApiClient();
  }

  /** Provider identifier */
  getName() {
    return 'base';
  }

  /** Default tab ID for home endpoint */
  getDefaultTabId() {
    return 0;
  }

  /** Default subject type filter */
  getSubjectType() {
    return null; // null = all types
  }

  // ─── CORE ENDPOINTS ────────────────────────────────────────

  async getHome(tabId = null, page = 1) {
    const id = tabId ?? this.getDefaultTabId();
    return this.client.get('/home', { tabId: id });
  }

  async getTrending(page = 1) {
    return this.client.get('/trending', { page });
  }

  async search(query, page = 1) {
    return this.client.get('/search', { q: query, page });
  }

  async getInfo(id) {
    return this.client.get('/info', { id });
  }

  async getPlay(id, season = 1, episode = 1) {
    return this.client.get('/play', { id, season, episode });
  }

  async getSources(id, season = 1, episode = 1) {
    return this.client.get('/sources', { id, season, episode });
  }

  // ─── BROWSE & DISCOVERY ────────────────────────────────────

  async getFilters() {
    return this.client.get('/filters');
  }

  async browse(params = {}) {
    return this.client.get('/browse', params);
  }

  async getRecommendations(type = 'top', id = null) {
    const params = { type };
    if (id) params.id = id;
    return this.client.get('/recommendations', params);
  }

  async getTabs() {
    return this.client.get('/tabs');
  }

  // ─── DETAIL & METADATA ─────────────────────────────────────

  async getSeasonInfo(id) {
    return this.client.get('/season-info', { id });
  }

  async getDubInfo(id) {
    return this.client.get('/dub-info', { id });
  }

  // ─── SHORTS ────────────────────────────────────────────────

  async getShorts(feed = 'trending', page = 1) {
    return this.client.get('/shorts', { feed, page });
  }

  async getShortsPlay(id) {
    return this.client.get('/shorts/play', { id });
  }
}

export default BaseProvider;
