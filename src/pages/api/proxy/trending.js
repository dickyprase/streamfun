import { getProvider } from '@/lib/providers';
import { normalizeTrendingResults } from '@/lib/providers/normalizer';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { page = 1, provider = 'movies' } = req.query;

  try {
    const p = getProvider(provider);
    const data = await p.getTrending(parseInt(page));
    const result = normalizeTrendingResults(data);

    return res.status(200).json({ success: true, ...result });
  } catch (error) {
    console.error('Proxy trending error:', error.message);
    return res.status(500).json({ error: 'Failed to fetch trending data' });
  }
}
