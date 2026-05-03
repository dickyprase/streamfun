import { getProvider } from '@/lib/providers';
import { normalizeContentItem } from '@/lib/providers/normalizer';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { type = 'top', id, provider = 'movies' } = req.query;

  try {
    const p = getProvider(provider);
    const data = await p.getRecommendations(type, id);

    const items = (data.items || data.subjects || [])
      .map(item => normalizeContentItem(item.subject || item))
      .filter(Boolean);

    return res.status(200).json({ success: true, items });
  } catch (error) {
    console.error('Proxy recommendations error:', error.message);
    return res.status(500).json({ error: 'Failed to fetch recommendations' });
  }
}
