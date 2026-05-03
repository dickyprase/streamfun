import { API_BASE_URL, API_KEY } from './constants';

/**
 * Server-side API client for Streamkeun REST API.
 * Only use this in API routes (server-side), never in client components.
 */
class ApiClient {
  constructor(baseUrl = API_BASE_URL, apiKey = API_KEY) {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
  }

  /**
   * Make a GET request to the API
   * @param {string} endpoint - e.g. '/home', '/trending'
   * @param {object} params - Query parameters (excluding key)
   * @returns {Promise<object>} Parsed JSON response
   */
  async get(endpoint, params = {}) {
    const url = new URL(`${this.baseUrl}${endpoint}`);
    url.searchParams.set('key', this.apiKey);

    // Add additional params
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.set(key, String(value));
      }
    });

    try {
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'X-API-Key': this.apiKey,
        },
        // Cache for 5 minutes on server
        next: { revalidate: 300 },
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || 'API returned unsuccessful response');
      }

      return data.data;
    } catch (error) {
      console.error(`[ApiClient] Error fetching ${endpoint}:`, error.message);
      throw error;
    }
  }
}

// Singleton instance
let clientInstance = null;

export function getApiClient() {
  if (!clientInstance) {
    clientInstance = new ApiClient();
  }
  return clientInstance;
}

export default ApiClient;
