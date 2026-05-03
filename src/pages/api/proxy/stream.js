import { getApiClient } from '@/lib/api-client';

/**
 * Stream URL resolver endpoint.
 * Fetches fresh playable video URL with retry + fallback logic.
 *
 * Usage: GET /api/proxy/stream?id=ID&season=0&episode=0&resolution=1080
 * Returns: { success: true, url: "https://..." }
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { id, season = '0', episode = '0', resolution } = req.query;
  if (!id) return res.status(400).json({ error: 'Parameter "id" is required' });

  const client = getApiClient();
  const se = parseInt(season);
  const ep = parseInt(episode);

  // Try multiple strategies to get a playable URL
  const strategies = [
    { endpoint: '/sources', params: { id, season: se, episode: ep } },
    { endpoint: '/play',    params: { id, season: se, episode: ep } },
    // Fallback: movie-style (season=0, episode=0)
    ...(se !== 0 || ep !== 0 ? [
      { endpoint: '/sources', params: { id, season: 0, episode: 0 } },
      { endpoint: '/play',    params: { id, season: 0, episode: 0 } },
    ] : []),
    // Fallback: season=1, episode=1 (some series need this)
    ...(se === 0 ? [
      { endpoint: '/sources', params: { id, season: 1, episode: 1 } },
    ] : []),
  ];

  for (const strategy of strategies) {
    try {
      const data = await client.get(strategy.endpoint, strategy.params);
      const url = extractVideoUrl(data, resolution ? parseInt(resolution) : null);
      if (url) {
        return res.status(200).json({ success: true, url });
      }
    } catch {}
  }

  return res.status(404).json({ error: 'No video source found' });
}

/**
 * Extract the best video URL from API response data.
 */
function extractVideoUrl(data, targetResolution) {
  if (!data) return null;
  const downloads = (data.downloads || []).filter(d => d.url);

  // 1. Try exact resolution match
  if (targetResolution && downloads.length > 0) {
    const match = downloads.find(d => d.resolution === targetResolution);
    if (match) return match.url;
  }

  // 2. Try processedSources (adaptive stream, usually highest quality)
  if (data.processedSources?.length > 0) {
    const ps = data.processedSources[0];
    const url = ps.streamUrl || ps.url;
    if (url) return url;
  }

  // 3. Fallback: highest resolution download
  if (downloads.length > 0) {
    const sorted = [...downloads].sort((a, b) => (b.resolution || 0) - (a.resolution || 0));
    return sorted[0].url;
  }

  return null;
}
