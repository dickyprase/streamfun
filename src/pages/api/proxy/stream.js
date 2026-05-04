import { getApiClient } from '@/lib/api-client';

/**
 * Stream URL resolver.
 * Returns fresh playable video URL with type indicator (mp4 or mpd).
 * 
 * For high resolutions on series, returns DASH streamUrl (mpd).
 * For low resolutions or movies, returns direct MP4 download URL.
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { id, season = '0', episode = '0', resolution } = req.query;
  if (!id) return res.status(400).json({ error: 'Parameter "id" is required' });

  const client = getApiClient();
  const se = parseInt(season);
  const ep = parseInt(episode);
  const targetRes = resolution ? parseInt(resolution) : null;

  // Try multiple strategies
  const strategies = [
    { endpoint: '/sources', params: { id, season: se, episode: ep } },
    { endpoint: '/play', params: { id, season: se, episode: ep } },
    ...(se !== 0 || ep !== 0 ? [
      { endpoint: '/sources', params: { id, season: 0, episode: 0 } },
      { endpoint: '/play', params: { id, season: 0, episode: 0 } },
    ] : []),
    ...(se === 0 ? [
      { endpoint: '/sources', params: { id, season: 1, episode: 1 } },
    ] : []),
  ];

  for (const strategy of strategies) {
    try {
      const data = await client.get(strategy.endpoint, strategy.params);
      const result = extractVideoUrl(data, targetRes);
      if (result) {
        return res.status(200).json({ success: true, url: result.url, type: result.type });
      }
    } catch {}
  }

  return res.status(404).json({ error: 'No video source found' });
}

/**
 * Extract video URL with type detection.
 * Priority:
 * 1. If targetResolution matches a direct MP4 download → return MP4
 * 2. If targetResolution > lowest available download → try processedSources (DASH)
 * 3. Fallback: highest resolution direct MP4 download
 */
function extractVideoUrl(data, targetResolution) {
  if (!data) return null;
  const downloads = (data.downloads || []).filter(d => d.url);
  const processedSources = data.processedSources || [];

  // 1. Try exact resolution match from direct downloads (MP4)
  if (targetResolution && downloads.length > 0) {
    const match = downloads.find(d => d.resolution === targetResolution);
    if (match) return { url: match.url, type: 'mp4' };
  }

  // 2. For higher resolutions, use processedSources (DASH) if available
  if (targetResolution && processedSources.length > 0) {
    const ps = processedSources[0];
    const resStr = ps.resolutions || '';
    const availableRes = resStr.split(',').map(r => parseInt(r)).filter(r => r > 0);
    
    // Check if requested resolution is available in DASH stream
    if (availableRes.includes(targetResolution) || (ps.quality && ps.quality >= targetResolution)) {
      const url = ps.streamUrl || ps.url;
      if (url) return { url, type: 'mpd' };
    }
  }

  // 3. If no specific resolution requested, prefer highest quality
  // Try DASH first (usually has higher quality)
  if (!targetResolution && processedSources.length > 0) {
    const ps = processedSources[0];
    const url = ps.streamUrl || ps.url;
    if (url) return { url, type: 'mpd' };
  }

  // 4. Fallback: highest resolution direct MP4 download
  if (downloads.length > 0) {
    const sorted = [...downloads].sort((a, b) => (b.resolution || 0) - (a.resolution || 0));
    return { url: sorted[0].url, type: 'mp4' };
  }

  return null;
}
