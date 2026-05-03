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
  const targetRes = resolution ? parseInt(resolution) : null;

  console.log(`\n[STREAM] ========================================`);
  console.log(`[STREAM] Request: id=${id} season=${se} episode=${ep} resolution=${targetRes}`);

  // Try multiple strategies to get a playable URL
  const strategies = [
    { endpoint: '/sources', params: { id, season: se, episode: ep } },
    { endpoint: '/play',    params: { id, season: se, episode: ep } },
    ...(se !== 0 || ep !== 0 ? [
      { endpoint: '/sources', params: { id, season: 0, episode: 0 } },
      { endpoint: '/play',    params: { id, season: 0, episode: 0 } },
    ] : []),
    ...(se === 0 ? [
      { endpoint: '/sources', params: { id, season: 1, episode: 1 } },
    ] : []),
  ];

  for (let i = 0; i < strategies.length; i++) {
    const strategy = strategies[i];
    try {
      console.log(`[STREAM] Strategy ${i+1}/${strategies.length}: ${strategy.endpoint} params=${JSON.stringify(strategy.params)}`);
      const data = await client.get(strategy.endpoint, strategy.params);
      
      const dlCount = (data.downloads || []).length;
      const psCount = (data.processedSources || []).length;
      console.log(`[STREAM]   -> downloads: ${dlCount}, processedSources: ${psCount}`);
      
      if (dlCount > 0) {
        console.log(`[STREAM]   -> downloads[0]: res=${data.downloads[0].resolution}, hasUrl=${!!data.downloads[0].url}, urlLen=${(data.downloads[0].url||'').length}`);
      }
      if (psCount > 0) {
        const ps = data.processedSources[0];
        console.log(`[STREAM]   -> processedSources[0]: format=${ps.format}, hasStreamUrl=${!!ps.streamUrl}, hasUrl=${!!ps.url}`);
      }

      const url = extractVideoUrl(data, targetRes);
      if (url) {
        console.log(`[STREAM] SUCCESS: Found URL (${url.length} chars): ${url.substring(0, 80)}...`);
        return res.status(200).json({ success: true, url });
      } else {
        console.log(`[STREAM]   -> extractVideoUrl returned null`);
      }
    } catch (err) {
      console.log(`[STREAM]   -> FAILED: ${err.message}`);
    }
  }

  console.log(`[STREAM] FAILED: No video source found after ${strategies.length} strategies`);
  return res.status(404).json({ error: 'No video source found' });
}

/**
 * Extract the best video URL from API response data.
 * IMPORTANT: Prefer direct MP4 downloads over processedSources (DASH).
 * ArtPlayer can play MP4 natively but needs dash.js for DASH streams.
 */
function extractVideoUrl(data, targetResolution) {
  if (!data) return null;
  const downloads = (data.downloads || []).filter(d => d.url);

  // 1. Try exact resolution match from downloads (direct MP4)
  if (targetResolution && downloads.length > 0) {
    const match = downloads.find(d => d.resolution === targetResolution);
    if (match) return match.url;
  }

  // 2. Highest resolution download (direct MP4 - always preferred)
  if (downloads.length > 0) {
    const sorted = [...downloads].sort((a, b) => (b.resolution || 0) - (a.resolution || 0));
    return sorted[0].url;
  }

  // 3. Last resort: processedSources (DASH/adaptive - may not work with all players)
  if (data.processedSources?.length > 0) {
    const ps = data.processedSources[0];
    // Prefer the direct URL over streamUrl (streamUrl is often DASH manifest)
    const url = ps.url || ps.streamUrl;
    if (url) return url;
  }

  return null;
}
