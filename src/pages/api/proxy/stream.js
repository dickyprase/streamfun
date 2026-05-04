import { getApiClient } from '@/lib/api-client';

/**
 * Stream URL resolver.
 * Returns:
 * - MP4 direct download URL (always, as primary/fallback)
 * - DASH manifest URL (if available, for HEVC transcode)
 * - Codec info (hevc/h264)
 * - Available qualities
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
      const downloads = (data.downloads || []).filter(d => d.url);
      if (downloads.length === 0 && !(data.processedSources?.length > 0)) continue;

      // Find MP4 URL (primary playback)
      let mp4Url = '';
      let mp4Resolution = 0;
      if (targetRes) {
        const match = downloads.find(d => d.resolution === targetRes);
        if (match) { mp4Url = match.url; mp4Resolution = match.resolution; }
      }
      if (!mp4Url && downloads.length > 0) {
        const best = [...downloads].sort((a, b) => (b.resolution || 0) - (a.resolution || 0))[0];
        mp4Url = best.url;
        mp4Resolution = best.resolution;
      }

      // Get DASH manifest URL (for HEVC transcode)
      let dashUrl = '';
      let dashCodec = '';
      let dashResolutions = '';
      if (data.processedSources?.length > 0) {
        const ps = data.processedSources.sort((a, b) => (b.quality || 0) - (a.quality || 0))[0];
        dashUrl = ps.url || ''; // proxy URL (handles CloudFront cookies)
        dashCodec = ps.codecName || '';
        dashResolutions = ps.resolutions || '';
      }

      // Determine codec of MP4 downloads
      const mp4Codec = downloads[0]?.codecName || '';

      if (mp4Url || dashUrl) {
        console.log(`[STREAM] ✅ id=${id} season=${se} episode=${ep} → MP4: ${mp4Resolution}p (${mp4Codec}) | DASH: ${dashResolutions || 'none'} (${dashCodec || 'none'})`);
        return res.status(200).json({
          success: true,
          url: mp4Url,
          type: 'mp4',
          resolution: mp4Resolution,
          codec: mp4Codec,
          dashUrl,
          dashCodec,
          dashResolutions,
          availableQualities: downloads.map(d => ({
            resolution: d.resolution,
            codec: d.codecName || '',
          })),
        });
      }
    } catch {}
  }

  return res.status(404).json({ error: 'No video source found' });
}
