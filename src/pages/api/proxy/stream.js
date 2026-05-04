import { getApiClient } from '@/lib/api-client';

/**
 * Stream URL resolver.
 *
 * Default: returns DASH proxy URL (processedSources[0].url) for ABR streaming.
 * Fallback: returns direct MP4 download URL.
 *
 * IMPORTANT: Use processedSources[0].url (proxy URL), NOT .streamUrl (needs CloudFront cookies).
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { id, season = '0', episode = '0', resolution } = req.query;
  if (!id) return res.status(400).json({ error: 'Parameter "id" is required' });

  const client = getApiClient();
  const se = parseInt(season);
  const ep = parseInt(episode);
  const targetRes = resolution ? parseInt(resolution) : null;

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
      const result = extractBestSource(data, targetRes);
      if (result) {
        return res.status(200).json({
          success: true,
          url: result.url,
          type: result.type,
          // Also return all available downloads for quality selector
          downloads: (data.downloads || []).filter(d => d.url).map(d => ({
            resolution: d.resolution,
            url: d.url,
          })),
          hasDash: !!(data.processedSources?.length > 0),
          dashResolutions: data.processedSources?.[0]?.resolutions || '',
        });
      }
    } catch {}
  }

  return res.status(404).json({ error: 'No video source found' });
}

function extractBestSource(data, targetResolution) {
  if (!data) return null;
  const downloads = (data.downloads || []).filter(d => d.url);
  const processedSources = data.processedSources || [];

  // If specific resolution requested as MP4
  if (targetResolution) {
    // Try exact MP4 match first
    const mp4Match = downloads.find(d => d.resolution === targetResolution);
    if (mp4Match) return { url: mp4Match.url, type: 'mp4' };
  }

  // Default: prefer DASH (ABR, highest quality)
  // Use .url (proxy URL) NOT .streamUrl (needs CloudFront cookies)
  if (processedSources.length > 0) {
    const ps = processedSources.sort((a, b) => (b.quality || 0) - (a.quality || 0))[0];
    const dashUrl = ps.url; // proxy URL - handles cookies server-side
    if (dashUrl) return { url: dashUrl, type: 'mpd' };
  }

  // Fallback: highest resolution MP4
  if (downloads.length > 0) {
    const sorted = [...downloads].sort((a, b) => (b.resolution || 0) - (a.resolution || 0));
    return { url: sorted[0].url, type: 'mp4' };
  }

  return null;
}
