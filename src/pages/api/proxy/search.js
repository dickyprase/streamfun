import { getProvider } from '@/lib/providers';
import { normalizeSearchResults } from '@/lib/providers/normalizer';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { q, page = 1, provider = 'movies' } = req.query;

  if (!q || !q.trim()) {
    return res.status(400).json({ error: 'Query parameter "q" is required' });
  }

  try {
    const p = getProvider(provider);
    const data = await p.search(q.trim(), parseInt(page));
    const result = normalizeSearchResults(data);

    return res.status(200).json({ success: true, ...result });
  } catch (error) {
    console.error('Proxy search error:', error.message);
    return res.status(500).json({ error: 'Failed to search' });
  }
}
