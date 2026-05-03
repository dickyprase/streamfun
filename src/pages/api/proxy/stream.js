import { getApiClient } from '@/lib/api-client';

/**
 * Stream URL resolver endpoint.
 * Returns a fresh, playable video URL (not redirect, just the URL string).
 * Client fetches this, gets the URL, then sets it directly on <video> element.
 * 
 * Usage: GET /api/proxy/stream?id=SUBJECT_ID&season=0&episode=0&resolution=1080
 * Returns: { success: true, url: "https://...fresh-token-url..." }
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id, season = 0, episode = 0, resolution, type = 'video', lang } = req.query;

  if (!id) {
    return res.status(400).json({ error: 'Parameter "id" is required' });
  }

  try {
    const client = getApiClient();

    console.log('[DEBUG stream] Request params:', { id, season, episode, resolution, type, lang });

    // Fetch fresh sources
    let data;
    try {
      data = await client.get('/sources', {
        id,
        season: parseInt(season),
        episode: parseInt(episode),
      });
      console.log('[DEBUG stream] /sources response keys:', Object.keys(data || {}));
    } catch (sourceErr) {
      console.log('[DEBUG stream] /sources gagal, coba /play. Error:', sourceErr.message);
      data = await client.get('/play', {
        id,
        season: parseInt(season),
        episode: parseInt(episode),
      });
      console.log('[DEBUG stream] /play response keys:', Object.keys(data || {}));
    }

    console.log('[DEBUG stream] downloads count:', (data.downloads || []).length);
    console.log('[DEBUG stream] processedSources count:', (data.processedSources || []).length);
    console.log('[DEBUG stream] downloads:', JSON.stringify((data.downloads || []).map(d => ({ resolution: d.resolution, hasUrl: !!d.url, urlPrefix: d.url?.substring(0, 50) }))));

    // Handle subtitle request
    if (type === 'subtitle' && lang) {
      const caption = (data.captions || []).find(
        c => c.lan === lang || c.languageCode === lang
      );
      if (caption?.url) {
        return res.status(200).json({ success: true, url: caption.url });
      }
      return res.status(404).json({ error: 'Subtitle not found' });
    }

    // Find video URL
    const downloads = data.downloads || [];
    let targetUrl = '';

    if (resolution) {
      const targetRes = parseInt(resolution);
      const match = downloads.find(d => d.resolution === targetRes && d.url);
      if (match) targetUrl = match.url;
      console.log('[DEBUG stream] Match by resolution', targetRes, ':', !!match);
    }

    // Try processedSources for higher quality (series)
    if (!targetUrl && data.processedSources?.length > 0) {
      const ps = data.processedSources[0];
      targetUrl = ps.streamUrl || ps.url || '';
      console.log('[DEBUG stream] Pakai processedSources:', { streamUrl: !!ps.streamUrl, url: !!ps.url });
    }

    // Fallback: best available download
    if (!targetUrl && downloads.length > 0) {
      const sorted = [...downloads].filter(d => d.url).sort((a, b) => (b.resolution || 0) - (a.resolution || 0));
      targetUrl = sorted[0]?.url || '';
      console.log('[DEBUG stream] Fallback ke download terbaik, resolution:', sorted[0]?.resolution);
    }

    if (!targetUrl) {
      console.error('[DEBUG stream] GAGAL: Tidak ada video source ditemukan!');
      console.error('[DEBUG stream] Full data keys:', Object.keys(data || {}));
      console.error('[DEBUG stream] Full data (truncated):', JSON.stringify(data).substring(0, 500));
      return res.status(404).json({ error: 'No video source found' });
    }

    console.log('[DEBUG stream] SUCCESS - URL ditemukan:', targetUrl.substring(0, 80) + '...');
    // Return the fresh URL (client will set it directly on video element)
    return res.status(200).json({ success: true, url: targetUrl });
  } catch (error) {
    console.error('[DEBUG stream] EXCEPTION:', error.message);
    console.error('[DEBUG stream] Stack:', error.stack);
    return res.status(500).json({ error: 'Failed to get stream URL' });
  }
}
