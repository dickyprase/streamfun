import { getApiClient } from '@/lib/api-client';
import { normalizePlayData } from '@/lib/providers/normalizer';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id, season = 1, episode = 1 } = req.query;

  if (!id) {
    return res.status(400).json({ error: 'Parameter "id" is required' });
  }

  try {
    const client = getApiClient();

    // Use /sources endpoint first (returns more quality info)
    // Then fallback to /play if sources fails
    let data;
    try {
      data = await client.get('/sources', { id, season: parseInt(season), episode: parseInt(episode) });
    } catch {
      // Fallback to /play endpoint
      data = await client.get('/play', { id, season: parseInt(season), episode: parseInt(episode) });
    }

    const playData = normalizePlayData(data);

    return res.status(200).json({ success: true, data: playData });
  } catch (error) {
    console.error('Proxy play error:', error.message);
    return res.status(500).json({ error: 'Failed to fetch play data' });
  }
}
